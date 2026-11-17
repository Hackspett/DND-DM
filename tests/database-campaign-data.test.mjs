import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { after } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createEmptyCreatureStats } from "../src/shared/creature-stats.utils.ts";
import { isWorkspaceData } from "../src/workspace.schema.ts";

const dataDirectory = mkdtempSync(join(tmpdir(), "hearthside-campaign-data-"));
process.env.DND_DM_DATA_DIR = dataDirectory;

const legacyDatabase = new DatabaseSync(join(dataDirectory, "hearthside.sqlite"));
legacyDatabase.exec(`
  CREATE TABLE campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE players (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE prepared_battles (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    player_ids_json TEXT NOT NULL,
    enemies_json TEXT NOT NULL
  );
  CREATE TABLE active_battles (
    campaign_id TEXT PRIMARY KEY REFERENCES campaigns(id) ON DELETE CASCADE,
    battle_json TEXT NOT NULL
  );
  CREATE TABLE campaign_npcs (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    stats_json TEXT
  );
  CREATE TABLE campaign_locations (
    id TEXT PRIMARY KEY,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES campaign_locations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE compendium_entries (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE monsters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    creature_type TEXT NOT NULL,
    challenge_rating TEXT NOT NULL,
    dexterity_score INTEGER NOT NULL,
    data_json TEXT NOT NULL
  );
  INSERT INTO campaigns (id, name) VALUES ('campaign-1', 'Existing campaign');
  INSERT INTO players (id, campaign_id, name) VALUES ('player-1', 'campaign-1', 'Existing player');
  INSERT INTO active_battles (campaign_id, battle_json)
    VALUES (
      'campaign-1',
      '{"id":"legacy-active","name":"Legacy active battle","round":1,"currentParticipantId":"legacy-player","participants":[{"id":"legacy-player","name":"Traveler","kind":"player","initiative":12,"dexterityModifier":0,"playerId":"player-1","monster":null}]}'
    );
  INSERT INTO prepared_battles (id, campaign_id, name, player_ids_json, enemies_json)
    VALUES ('battle-old', 'campaign-1', 'Old battle', '["player-1"]', '[]');
  INSERT INTO campaign_npcs (id, campaign_id, name, notes)
    VALUES ('npc-old', 'campaign-1', 'Old NPC', 'Old NPC notes');
  INSERT INTO campaign_locations (id, campaign_id, name, kind, notes)
    VALUES ('location-old', 'campaign-1', 'Old location', 'location', 'Old location notes');
  INSERT INTO compendium_entries (id, category, name, notes)
    VALUES ('item-old', 'items', 'Old item', 'Old item notes');
  PRAGMA user_version = 3;
`);
legacyDatabase.prepare(`
  INSERT INTO monsters (id, name, creature_type, challenge_rating, dexterity_score, data_json)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(
  "monster-old",
  "Old monster",
  "humanoid",
  "1/4",
  10,
  JSON.stringify({
    ...createEmptyCreatureStats(),
    id: "monster-old",
    name: "Old monster",
    spellSlots: [{ level: 1, maximum: 12 }],
  }),
);
legacyDatabase.close();

const database = await import("../server/database.service.ts");

after(() => {
  database.closeDatabase();
  rmSync(dataDirectory, { recursive: true, force: true });
});

test("upgrades existing campaigns and persists NPCs and nested locations", () => {
  assert.deepEqual(database.readWorkspace().campaigns[0].activeBattles, [{
    id: "legacy-active",
    name: "Legacy active battle",
    round: 1,
    currentParticipantId: "legacy-player",
    participants: [{
      id: "legacy-player",
      name: "Traveler",
      kind: "player",
      initiative: 12,
      dexterityModifier: 0,
      playerId: "player-1",
      monster: null,
    }],
  }]);
  const legacyGearDatabase = new DatabaseSync(database.databaseFile);
  legacyGearDatabase.prepare(`
    INSERT INTO gear_entries (id, name, data_json) VALUES (?, ?, ?)
  `).run(
    "legacy-weapon",
    "Longbow",
    JSON.stringify({
      id: "legacy-weapon",
      name: "Longbow",
      kind: "weapon",
      cost: "50 gp",
      damage: { count: 1, die: "d8", modifier: 0 },
      damageType: "piercing",
      range: "80/320 ft.",
      notes: { text: "", links: [], images: [] },
    }),
  );
  legacyGearDatabase.close();

  const imageId = "12345678-1234-4234-8234-123456789abc";
  const imageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  database.storeImage(imageId, "image/png", imageBytes);
  const existing = database.readWorkspace();
  assert.equal(existing.campaigns[0].name, "Existing campaign");
  assert.deepEqual(existing.monsters[0].spellSlots, [{ level: 1, maximum: 4 }]);
  assert.deepEqual(existing.monsters[0].spells, []);
  assert.deepEqual(existing.campaigns[0].players, [
    { id: "player-1", name: "Existing player", profileImageId: null, notes: { text: "", links: [], images: [] } },
  ]);
  assert.deepEqual(existing.campaigns[0].notes, { text: "", links: [], images: [] });
  assert.deepEqual(existing.campaigns[0].preparedBattles[0].notes, { text: "", links: [], images: [] });
  assert.equal(existing.campaigns[0].npcs[0].notes.text, "Old NPC notes");
  assert.equal(existing.campaigns[0].locations[0].notes.text, "Old location notes");
  assert.equal(existing.items[0].notes.text, "Old item notes");
  assert.deepEqual(existing.gear[0].range, { normal: 80, long: 320 });
  assert.deepEqual(existing.monsters[0].notes, { text: "", links: [], images: [] });

  const campaign = existing.campaigns[0];
  campaign.players[0].profileImageId = imageId;
  campaign.players[0].notes.images = [{ id: imageId, altText: "Player portrait" }];
  campaign.npcs.push({
    id: "npc-1",
    name: "Mara",
    profileImageId: imageId,
    notes: { text: "A local guide", links: [], images: [] },
    stats: null,
  });
  campaign.notes = {
    text: "See the guide.",
    links: [{ type: "npc", id: "npc-1", campaignId: "campaign-1", label: "Mara" }],
    images: [],
  };
  campaign.npcs[0].notes.images = [{ id: imageId, altText: "A sketch" }];
  campaign.players[0].notes = {
    text: "Knows the guide.",
    links: [{ type: "npc", id: "npc-1", campaignId: "campaign-1", label: "Mara" }],
    images: [],
  };
  campaign.preparedBattles[0].notes = {
    text: "The potion may help.",
    links: [{ type: "item", id: "item-old", campaignId: null, label: "Old item" }],
    images: [],
  };
  campaign.locations[0].notes = {
    text: "The guide is waiting here.",
    links: [{ type: "npc", id: "npc-1", campaignId: "campaign-1", label: "Mara" }],
    images: [],
  };
  campaign.locations.push(
    { id: "church", name: "Church", parentId: null, kind: "folder", notes: { text: "", links: [], images: [] } },
    { id: "room", name: "Room A", parentId: "church", kind: "location", notes: { text: "Quiet", links: [], images: [] } },
  );
  campaign.npcs.sort((left, right) => left.name.localeCompare(right.name));
  campaign.locations.sort((left, right) => left.name.localeCompare(right.name));
  existing.items[0].notes = {
    text: "A useful item.",
    links: [{ type: "battle", id: "battle-old", campaignId: "campaign-1", label: "Old battle" }],
    images: [],
  };
  existing.effects.push({
    id: "effect-1",
    name: "Blessing",
    notes: { text: "See the guide.", links: [{ type: "npc", id: "npc-1", campaignId: "campaign-1", label: "Mara" }], images: [] },
  });
  existing.gear.push(
    {
      id: "weapon-1",
      name: "Longsword",
      kind: "weapon",
      cost: "15 gp",
      damage: { count: 1, die: "d8", modifier: 2 },
      damageType: "slashing",
      range: { normal: 5, long: 5 },
      notes: { text: "", links: [], images: [] },
    },
    {
      id: "armor-1",
      name: "Leather armor",
      kind: "armor",
      cost: "10 gp",
      armorClass: "11 + Dex modifier",
      notes: { text: "", links: [], images: [] },
    },
  );
  existing.monsters.push({
    ...createEmptyCreatureStats(),
    id: "monster-1",
    name: "Goblin",
    profileImageId: imageId,
    spellSlots: [{ level: 2, maximum: 3 }],
    spells: [
      { id: "fireball", name: "Fireball", usage: { type: "spell-slot", level: 2 } },
      { id: "breath", name: "Breath Weapon", usage: { type: "shared-daily", usesPerDay: 2 } },
      { id: "shield", name: "Shield", usage: { type: "daily-each", usesPerDay: 1 } },
      { id: "detect-magic", name: "Detect Magic", usage: { type: "at-will" } },
    ],
    notes: { text: "A recurring foe.", links: [{ type: "location", id: "room", campaignId: "campaign-1", label: "Room A" }], images: [] },
  });
  const activeMonsterSnapshot = {
    ...createEmptyCreatureStats(),
    id: "monster-1",
    name: "Goblin",
    profileImageId: imageId,
    spellSlots: [{ level: 2, maximum: 3 }],
    spells: existing.monsters.at(-1).spells,
  };
  campaign.activeBattles = [{
    id: "active-1",
    name: "Church Ambush",
    round: 2,
    currentParticipantId: "enemy-instance-1",
    participants: [
      {
        id: "player-1",
        name: "Existing player",
        kind: "player",
        initiative: 14,
        dexterityModifier: 0,
        playerId: "player-1",
        monster: null,
      },
      {
        id: "enemy-instance-1",
        name: "Goblin",
        kind: "enemy",
        initiative: 11,
        dexterityModifier: 2,
        playerId: null,
        monster: activeMonsterSnapshot,
        currentHitPoints: 8,
        maxHitPoints: 12,
        spellSlots: [{ level: 2, maximum: 3, remaining: 1 }],
        sharedDailySpellPools: [{ usesPerDay: 2, maximum: 2, remaining: 1 }],
        individualDailySpells: [{ spellId: "shield", maximum: 1, remaining: 0 }],
      },
    ],
  }, {
    id: "active-2",
    name: "Second encounter",
    round: 1,
    currentParticipantId: "player-1",
    participants: [{
      id: "player-1",
      name: "Existing player",
      kind: "player",
      initiative: 14,
      dexterityModifier: 0,
      playerId: "player-1",
      monster: null,
    }],
  }];
  existing.currentBattle = {
    campaignId: campaign.id,
    name: "Church Ambush",
    setup: {
      playerIds: ["player-1"],
      enemies: [{ monsterId: "monster-1", count: 1 }],
      notes: { text: "At the church.", links: [], images: [] },
      playerInitiatives: { "player-1": "14" },
    },
  };
  assert.equal(isWorkspaceData(existing), true);
  database.saveWorkspace(existing);

  const saved = database.readWorkspace();
  assert.deepEqual(saved.campaigns[0], campaign);
  assert.deepEqual(saved.currentBattle, existing.currentBattle);
  assert.deepEqual(database.readImage(imageId), {
    mimeType: "image/png",
    data: imageBytes,
  });
  assert.deepEqual(saved.items[0].notes, existing.items[0].notes);
  assert.deepEqual(
    saved.gear,
    [...existing.gear].sort((a, b) => a.name.localeCompare(b.name)),
  );
  assert.deepEqual(saved.effects[0].notes, existing.effects[0].notes);
  assert.deepEqual(
    saved.monsters.find((monster) => monster.id === "monster-1").notes,
    existing.monsters.find((monster) => monster.id === "monster-1").notes,
  );
  assert.equal(
    saved.monsters.find((monster) => monster.id === "monster-1").profileImageId,
    imageId,
  );
  const versionDatabase = new DatabaseSync(database.databaseFile);
  assert.equal(versionDatabase.prepare("PRAGMA user_version").get().user_version, 10);
  versionDatabase.close();
});
