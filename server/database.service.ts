import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { parseStoredResourceNotes, serializeResourceNotes } from "../src/shared/resource-notes.utils.js";
import {
  normalizeActiveBattleSpellResources,
  normalizeSpellSlotCapacities,
} from "../src/shared/spells.utils.js";
import type {
  Campaign,
  ActiveBattle,
  CompendiumCategory,
  CompendiumEntry,
  CurrentBattle,
  GearEntry,
  LocationNode,
  Monster,
  Note,
  Npc,
  Player,
  PreparedBattle,
  WorkspaceData,
} from "../src/workspace.types.js";
import { isGearEntry, isRecord } from "../src/workspace.schema.js";

const databasePath = resolve(
  process.env.DND_DM_DATA_DIR ?? "data",
  "hearthside.sqlite",
);
mkdirSync(dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    notes_json TEXT NOT NULL DEFAULT '{"text":"","links":[]}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    profile_image_id TEXT,
    notes_json TEXT NOT NULL DEFAULT '{"text":"","links":[]}',
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS players_by_campaign
    ON players(campaign_id, sort_order, name);

  CREATE TABLE IF NOT EXISTS monsters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    creature_type TEXT NOT NULL,
    challenge_rating TEXT NOT NULL,
    dexterity_score INTEGER NOT NULL,
    data_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS compendium_entries (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('items', 'effects')),
    name TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS compendium_entries_by_category_name
    ON compendium_entries(category, name COLLATE NOCASE);

  CREATE TABLE IF NOT EXISTS gear_entries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    data_json TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS gear_entries_by_name
    ON gear_entries(name COLLATE NOCASE);

  CREATE TABLE IF NOT EXISTS prepared_battles (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    player_ids_json TEXT NOT NULL,
    enemies_json TEXT NOT NULL,
    notes_json TEXT NOT NULL DEFAULT '{"text":"","links":[]}'
  );
  CREATE INDEX IF NOT EXISTS battles_by_campaign
    ON prepared_battles(campaign_id, name);

  CREATE TABLE IF NOT EXISTS active_battles (
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    battle_id TEXT NOT NULL,
    battle_json TEXT NOT NULL,
    PRIMARY KEY (campaign_id, battle_id)
  );

  CREATE TABLE IF NOT EXISTS workspace_state (
    id TEXT PRIMARY KEY CHECK (id = 'main'),
    current_battle_json TEXT
  );
  INSERT OR IGNORE INTO workspace_state (id, current_battle_json)
    VALUES ('main', NULL);

  CREATE TABLE IF NOT EXISTS campaign_npcs (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    profile_image_id TEXT,
    notes TEXT NOT NULL DEFAULT '',
    stats_json TEXT
  );
  CREATE INDEX IF NOT EXISTS npcs_by_campaign_name
    ON campaign_npcs(campaign_id, name COLLATE NOCASE);

  CREATE TABLE IF NOT EXISTS campaign_locations (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES campaign_locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('folder', 'location')),
    notes TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS locations_by_campaign_parent
    ON campaign_locations(campaign_id, parent_id, name COLLATE NOCASE);

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS notes_by_campaign_updated
    ON notes(campaign_id, updated_at);

  CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    mime_type TEXT NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

`);

function ensureColumn(table: string, column: string, definition: string): void {
  const columns = database.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((entry) => entry.name === column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn("campaigns", "notes_json", `TEXT NOT NULL DEFAULT '{"text":"","links":[]}'`);
ensureColumn("players", "notes_json", `TEXT NOT NULL DEFAULT '{"text":"","links":[]}'`);
ensureColumn("players", "profile_image_id", "TEXT");
ensureColumn("prepared_battles", "notes_json", `TEXT NOT NULL DEFAULT '{"text":"","links":[]}'`);
ensureColumn("campaign_npcs", "profile_image_id", "TEXT");
if (!database.prepare("PRAGMA table_info(active_battles)").all().some((column) => column.name === "battle_id")) {
  database.exec(`
    ALTER TABLE active_battles RENAME TO active_battles_legacy;
    CREATE TABLE active_battles (
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      battle_id TEXT NOT NULL,
      battle_json TEXT NOT NULL,
      PRIMARY KEY (campaign_id, battle_id)
    );
    INSERT INTO active_battles (battle_id, campaign_id, battle_json)
      SELECT json_extract(battle_json, '$.id'), campaign_id, battle_json
      FROM active_battles_legacy;
    DROP TABLE active_battles_legacy;
  `);
}
database.exec("PRAGMA user_version = 10");

function parseJson<T>(value: unknown, description: string): T {
  if (typeof value !== "string") {
    throw new Error(`The database contains invalid ${description} data.`);
  }
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    throw new Error(`Could not read ${description} from the database.`, {
      cause: error,
    });
  }
}

function parseLegacyWeaponRange(value: string): { normal: number; long: number } {
  const match = /^(\d+)(?:\s*\/\s*(\d+))?\s*(?:ft\.?)?$/i.exec(value.trim());
  if (!match) {
    throw new Error("A saved weapon range cannot be converted to normal and long range values.");
  }
  const normal = Number(match[1]);
  const long = Number(match[2] ?? match[1]);
  if (!Number.isSafeInteger(normal) || !Number.isSafeInteger(long)) {
    throw new Error("A saved weapon range contains an invalid distance.");
  }
  return { normal, long };
}

function parseStoredGearEntry(value: unknown): GearEntry {
  if (!isRecord(value)) {
    throw new Error("The database contains invalid gear data.");
  }
  const normalized = value.kind === "weapon" && typeof value.range === "string"
    ? { ...value, range: parseLegacyWeaponRange(value.range) }
    : value;
  if (!isGearEntry(normalized)) {
    throw new Error("The database contains invalid gear data.");
  }
  return normalized;
}

export function readWorkspace(): WorkspaceData {
  const workspaceState = database
    .prepare("SELECT current_battle_json FROM workspace_state WHERE id = 'main'")
    .get();
  if (!workspaceState) {
    throw new Error("The database is missing workspace state.");
  }
  const currentBattle = workspaceState.current_battle_json === null
    ? null
    : parseJson<CurrentBattle>(workspaceState.current_battle_json, "current battle");

  const campaignRows = database
    .prepare("SELECT id, name, notes_json FROM campaigns ORDER BY name COLLATE NOCASE")
    .all();
  const playersByCampaign = new Map<string, Player[]>();
  for (const row of database
    .prepare("SELECT id, campaign_id, name, profile_image_id, notes_json FROM players ORDER BY sort_order, name COLLATE NOCASE")
    .all()) {
    const campaignId = String(row.campaign_id);
    const players = playersByCampaign.get(campaignId) ?? [];
    players.push({
      id: String(row.id),
      name: String(row.name),
      profileImageId: row.profile_image_id === null ? null : String(row.profile_image_id),
      notes: parseStoredResourceNotes(row.notes_json, "player notes"),
    });
    playersByCampaign.set(campaignId, players);
  }

  const battlesByCampaign = new Map<string, PreparedBattle[]>();
  for (const row of database
    .prepare("SELECT id, campaign_id, name, player_ids_json, enemies_json, notes_json FROM prepared_battles ORDER BY name COLLATE NOCASE")
    .all()) {
    const campaignId = String(row.campaign_id);
    const battles = battlesByCampaign.get(campaignId) ?? [];
    battles.push({
      id: String(row.id),
      name: String(row.name),
      playerIds: parseJson<string[]>(row.player_ids_json, "battle players"),
      enemies: parseJson<PreparedBattle["enemies"]>(row.enemies_json, "battle enemies"),
      notes: parseStoredResourceNotes(row.notes_json, "battle notes"),
    });
    battlesByCampaign.set(campaignId, battles);
  }

  const activeBattlesByCampaign = new Map<string, ActiveBattle[]>();
  for (const row of database
    .prepare("SELECT campaign_id, battle_json FROM active_battles ORDER BY rowid")
    .all()) {
    const campaignId = String(row.campaign_id);
    const battles = activeBattlesByCampaign.get(campaignId) ?? [];
    battles.push(normalizeActiveBattleSpellResources(
      parseJson<ActiveBattle>(row.battle_json, "active battle"),
    ));
    activeBattlesByCampaign.set(campaignId, battles);
  }

  const npcsByCampaign = new Map<string, Npc[]>();
  for (const row of database
    .prepare("SELECT id, campaign_id, name, profile_image_id, notes, stats_json FROM campaign_npcs ORDER BY name COLLATE NOCASE")
    .all()) {
    const campaignId = String(row.campaign_id);
    const npcs = npcsByCampaign.get(campaignId) ?? [];
    npcs.push({
      id: String(row.id),
      name: String(row.name),
      profileImageId: row.profile_image_id === null ? null : String(row.profile_image_id),
      notes: parseStoredResourceNotes(row.notes, "NPC notes"),
      stats: row.stats_json === null
        ? null
        : parseJson<Npc["stats"]>(row.stats_json, "NPC statistics"),
    });
    npcsByCampaign.set(campaignId, npcs);
  }

  const locationsByCampaign = new Map<string, LocationNode[]>();
  for (const row of database
    .prepare("SELECT id, campaign_id, name, parent_id, kind, notes FROM campaign_locations ORDER BY name COLLATE NOCASE")
    .all()) {
    const campaignId = String(row.campaign_id);
    const locations = locationsByCampaign.get(campaignId) ?? [];
    if (row.kind !== "folder" && row.kind !== "location") {
      throw new Error("The database contains an unknown campaign location type.");
    }
    locations.push({
      id: String(row.id),
      name: String(row.name),
      parentId: row.parent_id === null ? null : String(row.parent_id),
      kind: row.kind,
      notes: parseStoredResourceNotes(row.notes, "location notes"),
    });
    locationsByCampaign.set(campaignId, locations);
  }

  const campaigns: Campaign[] = campaignRows.map((row) => {
    const id = String(row.id);
    return {
      id,
      name: String(row.name),
      notes: parseStoredResourceNotes(row.notes_json, "campaign notes"),
      players: playersByCampaign.get(id) ?? [],
      preparedBattles: battlesByCampaign.get(id) ?? [],
      activeBattles: activeBattlesByCampaign.get(id) ?? [],
      npcs: npcsByCampaign.get(id) ?? [],
      locations: locationsByCampaign.get(id) ?? [],
    };
  });
  const monsters: Monster[] = database
    .prepare("SELECT data_json FROM monsters ORDER BY name COLLATE NOCASE")
    .all()
    .map((row) => {
      const monster = parseJson<Monster>(row.data_json, "monster");
      return {
        ...monster,
        profileImageId: monster.profileImageId ?? null,
        spellSlots: normalizeSpellSlotCapacities(monster.spellSlots ?? []),
        spells: monster.spells ?? [],
        notes: parseStoredResourceNotes(monster.notes, "monster notes"),
      };
    });
  const items: CompendiumEntry[] = [];
  const effects: CompendiumEntry[] = [];
  for (const row of database
    .prepare("SELECT id, category, name, notes FROM compendium_entries ORDER BY name COLLATE NOCASE")
    .all()) {
    const entry: CompendiumEntry = {
      id: String(row.id),
      name: String(row.name),
      notes: parseStoredResourceNotes(row.notes, "compendium entry notes"),
    };
    if (row.category === "items") {
      items.push(entry);
    } else if (row.category === "effects") {
      effects.push(entry);
    } else {
      throw new Error("The database contains an unknown compendium category.");
    }
  }

  const gear: GearEntry[] = database
    .prepare("SELECT data_json FROM gear_entries ORDER BY name COLLATE NOCASE")
    .all()
    .map((row) => parseStoredGearEntry(parseJson<unknown>(row.data_json, "gear")));

  return { campaigns, monsters, items, gear, effects, currentBattle };
}

export function saveWorkspace(workspace: WorkspaceData): void {
  const saveCampaign = database.prepare(`
    INSERT INTO campaigns (id, name, notes_json) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      notes_json = excluded.notes_json
  `);
  const deletePlayers = database.prepare(
    "DELETE FROM players WHERE campaign_id = ?",
  );
  const savePlayer = database.prepare(`
    INSERT INTO players (id, campaign_id, name, profile_image_id, notes_json, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const deleteBattles = database.prepare(
    "DELETE FROM prepared_battles WHERE campaign_id = ?",
  );
  const saveBattle = database.prepare(`
    INSERT INTO prepared_battles
      (id, campaign_id, name, player_ids_json, enemies_json, notes_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const saveActiveBattle = database.prepare(`
    INSERT INTO active_battles (battle_id, campaign_id, battle_json) VALUES (?, ?, ?)
    ON CONFLICT(campaign_id, battle_id) DO UPDATE SET
      battle_json = excluded.battle_json
  `);
  const deleteActiveBattles = database.prepare(
    "DELETE FROM active_battles WHERE campaign_id = ?",
  );
  const deleteNpcs = database.prepare(
    "DELETE FROM campaign_npcs WHERE campaign_id = ?",
  );
  const saveNpc = database.prepare(`
    INSERT INTO campaign_npcs (id, campaign_id, name, profile_image_id, notes, stats_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const deleteLocations = database.prepare(
    "DELETE FROM campaign_locations WHERE campaign_id = ?",
  );
  const saveLocation = database.prepare(`
    INSERT INTO campaign_locations (id, campaign_id, parent_id, name, kind, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const saveMonster = database.prepare(`
    INSERT INTO monsters
      (id, name, creature_type, challenge_rating, dexterity_score, data_json)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      creature_type = excluded.creature_type,
      challenge_rating = excluded.challenge_rating,
      dexterity_score = excluded.dexterity_score,
      data_json = excluded.data_json
  `);
  const saveCompendiumEntry = database.prepare(`
    INSERT INTO compendium_entries (id, category, name, notes)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      category = excluded.category,
      name = excluded.name,
      notes = excluded.notes
  `);
  const saveGearEntry = database.prepare(`
    INSERT INTO gear_entries (id, name, data_json) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      data_json = excluded.data_json
  `);
  const saveCurrentBattle = database.prepare(`
    UPDATE workspace_state SET current_battle_json = ? WHERE id = 'main'
  `);

  database.exec("BEGIN IMMEDIATE");
  try {
    const campaignIds = new Set(workspace.campaigns.map((campaign) => campaign.id));
    for (const campaign of workspace.campaigns) {
      saveCampaign.run(
        campaign.id,
        campaign.name,
        serializeResourceNotes(campaign.notes),
      );
      deletePlayers.run(campaign.id);
      campaign.players.forEach((player, index) => {
        savePlayer.run(
          player.id,
          campaign.id,
          player.name,
          player.profileImageId,
          serializeResourceNotes(player.notes),
          index,
        );
      });
      deleteBattles.run(campaign.id);
      for (const battle of campaign.preparedBattles) {
        saveBattle.run(
          battle.id,
          campaign.id,
          battle.name,
          JSON.stringify(battle.playerIds),
          JSON.stringify(battle.enemies),
          serializeResourceNotes(battle.notes),
        );
      }
      deleteActiveBattles.run(campaign.id);
      for (const activeBattle of campaign.activeBattles) {
        saveActiveBattle.run(
          activeBattle.id,
          campaign.id,
          JSON.stringify(activeBattle),
        );
      }
      deleteNpcs.run(campaign.id);
      for (const npc of campaign.npcs) {
        saveNpc.run(
          npc.id,
          campaign.id,
          npc.name,
          npc.profileImageId,
          serializeResourceNotes(npc.notes),
          npc.stats === null ? null : JSON.stringify(npc.stats),
        );
      }

      deleteLocations.run(campaign.id);
      const unsavedLocations = [...campaign.locations];
      const savedLocationIds = new Set<string>();
      while (unsavedLocations.length > 0) {
        const readyLocations = unsavedLocations.filter(
          (location) =>
            location.parentId === null ||
            savedLocationIds.has(location.parentId),
        );
        if (readyLocations.length === 0) {
          throw new Error("Campaign locations contain an invalid folder hierarchy.");
        }
        for (const location of readyLocations) {
          saveLocation.run(
            location.id,
            campaign.id,
            location.parentId,
            location.name,
            location.kind,
            serializeResourceNotes(location.notes),
          );
          savedLocationIds.add(location.id);
          unsavedLocations.splice(unsavedLocations.indexOf(location), 1);
        }
      }
    }

    for (const row of database.prepare("SELECT id FROM campaigns").all()) {
      const id = String(row.id);
      if (!campaignIds.has(id)) {
        database.prepare("DELETE FROM campaigns WHERE id = ?").run(id);
      }
    }

    const monsterIds = new Set(workspace.monsters.map((monster) => monster.id));
    for (const monster of workspace.monsters) {
      saveMonster.run(
        monster.id,
        monster.name,
        monster.creatureType,
        monster.challengeRating,
        monster.abilityScores.DEX,
        JSON.stringify(monster),
      );
    }
    for (const row of database.prepare("SELECT id FROM monsters").all()) {
      const id = String(row.id);
      if (!monsterIds.has(id)) {
        database.prepare("DELETE FROM monsters WHERE id = ?").run(id);
      }
    }

    const compendiumEntries: {
      category: CompendiumCategory;
      entry: CompendiumEntry;
    }[] = [
      ...workspace.items.map((entry) => ({ category: "items" as const, entry })),
      ...workspace.effects.map((entry) => ({ category: "effects" as const, entry })),
    ];
    const compendiumEntryIds = new Set(compendiumEntries.map(({ entry }) => entry.id));
    for (const { category, entry } of compendiumEntries) {
      saveCompendiumEntry.run(
        entry.id,
        category,
        entry.name,
        serializeResourceNotes(entry.notes),
      );
    }
    for (const row of database.prepare("SELECT id FROM compendium_entries").all()) {
      const id = String(row.id);
      if (!compendiumEntryIds.has(id)) {
        database.prepare("DELETE FROM compendium_entries WHERE id = ?").run(id);
      }
    }

    const gearIds = new Set(workspace.gear.map((entry) => entry.id));
    for (const entry of workspace.gear) {
      saveGearEntry.run(entry.id, entry.name, JSON.stringify(entry));
    }
    for (const row of database.prepare("SELECT id FROM gear_entries").all()) {
      const id = String(row.id);
      if (!gearIds.has(id)) {
        database.prepare("DELETE FROM gear_entries WHERE id = ?").run(id);
      }
    }

    saveCurrentBattle.run(
      workspace.currentBattle === null
        ? null
        : JSON.stringify(workspace.currentBattle),
    );

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function listNotes(campaignId?: string): Note[] {
  const rows = campaignId !== undefined
    ? database
        .prepare("SELECT * FROM notes WHERE campaign_id = ? ORDER BY updated_at DESC")
        .all(campaignId)
    : database
        .prepare("SELECT * FROM notes ORDER BY updated_at DESC")
        .all();

  return rows.map((row) => ({
    id: String(row.id),
    campaignId: row.campaign_id === null ? null : String(row.campaign_id),
    title: String(row.title),
    content: String(row.content),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export function saveNote(note: Pick<Note, "id" | "campaignId" | "title" | "content">): Note {
  const now = new Date().toISOString();
  database.prepare(`
    INSERT INTO notes (id, campaign_id, title, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      campaign_id = excluded.campaign_id,
      title = excluded.title,
      content = excluded.content,
      updated_at = excluded.updated_at
  `).run(note.id, note.campaignId, note.title, note.content, now, now);
  const savedNote = listNotes().find((item) => item.id === note.id);
  if (!savedNote) {
    throw new Error("The note was not available after it was saved.");
  }
  return savedNote;
}

export function hasCampaign(campaignId: string): boolean {
  return database.prepare("SELECT 1 FROM campaigns WHERE id = ?").get(campaignId) !== undefined;
}

export interface StoredImage {
  mimeType: string;
  data: Uint8Array;
}

export function storeImage(id: string, mimeType: string, data: Uint8Array): void {
  database.prepare("INSERT INTO images (id, mime_type, data) VALUES (?, ?, ?)").run(
    id,
    mimeType,
    data,
  );
}

export function readImage(id: string): StoredImage | undefined {
  const row = database.prepare("SELECT mime_type, data FROM images WHERE id = ?").get(id);
  if (!row) return undefined;
  if (typeof row.mime_type !== "string" || !(row.data instanceof Uint8Array)) {
    throw new Error("The database contains invalid image data.");
  }
  return { mimeType: row.mime_type, data: row.data };
}

export function deleteNote(noteId: string): boolean {
  return database.prepare("DELETE FROM notes WHERE id = ?").run(noteId).changes > 0;
}

export function closeDatabase(): void {
  database.close();
}

export const databaseFile = databasePath;
