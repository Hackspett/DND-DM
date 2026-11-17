import assert from "node:assert/strict";
import test from "node:test";
import { isWorkspaceData } from "../src/workspace.schema.ts";

function emptyStats() {
  return {
    size: "Medium",
    creatureType: "humanoid",
    alignment: "unaligned",
    armorClass: 10,
    hitPoints: 1,
    hitDice: "",
    speed: "30 ft.",
    abilityScores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
    savingThrows: "",
    skills: "",
    damageVulnerabilities: "",
    damageResistances: "",
    damageImmunities: "",
    conditionImmunities: "",
    senses: "",
    languages: "",
    challengeRating: "",
    proficiencyBonus: 2,
    traits: "",
    actions: "",
    bonusActions: "",
    reactions: "",
    legendaryActions: "",
  };
}

function emptyNotes() {
  return { text: "", links: [], images: [] };
}

function workspace() {
  return {
    campaigns: [{
      id: "campaign-1",
      name: "The Long Road",
      notes: emptyNotes(),
      players: [{ id: "player-1", name: "Ari", profileImageId: null, notes: emptyNotes() }],
      preparedBattles: [{
        id: "battle-1",
        name: "At the Bridge",
        playerIds: ["player-1"],
        enemies: [],
        notes: emptyNotes(),
      }],
      activeBattles: [],
      npcs: [{
        id: "npc-1",
        name: "Mara",
        profileImageId: null,
        notes: {
          text: "A local guide",
          links: [{ type: "location", id: "room-a", campaignId: "campaign-1", label: "Room A" }],
          images: [],
        },
        stats: emptyStats(),
      }],
      locations: [
        { id: "church", name: "Church of the Light", parentId: null, kind: "folder", notes: emptyNotes() },
        { id: "cathedral", name: "Cathedral", parentId: "church", kind: "folder", notes: emptyNotes() },
        { id: "room-a", name: "Room A", parentId: "cathedral", kind: "location", notes: { text: "A quiet sanctuary", links: [], images: [] } },
      ],
    }],
    monsters: [{ id: "monster-1", name: "Goblin", profileImageId: null, spellSlots: [], spells: [], ...emptyStats(), notes: emptyNotes() }],
    items: [{ id: "item-1", name: "Potion", notes: emptyNotes() }],
    gear: [],
    effects: [{ id: "effect-1", name: "Blessing", notes: emptyNotes() }],
    currentBattle: null,
  };
}

test("accepts NPC stat blocks and nested campaign locations", () => {
  assert.equal(isWorkspaceData(workspace()), true);
});

test("validates the resumable current battle and its campaign", () => {
  const pendingBattle = workspace();
  pendingBattle.currentBattle = {
    campaignId: "campaign-1",
    name: "At the Bridge",
    setup: {
      playerIds: ["player-1"],
      enemies: [{ monsterId: "monster-1", count: 2 }],
      notes: emptyNotes(),
      playerInitiatives: { "player-1": "14" },
    },
  };
  assert.equal(isWorkspaceData(pendingBattle), true);

  const missingCampaign = workspace();
  missingCampaign.currentBattle = {
    campaignId: "missing",
    name: "At the Bridge",
    setup: null,
  };
  assert.equal(isWorkspaceData(missingCampaign), false);
});

test("accepts multiple active battles in one campaign", () => {
  const activeBattles = workspace();
  const participant = {
    id: "player-instance",
    name: "Ari",
    kind: "player",
    initiative: 14,
    dexterityModifier: 0,
    playerId: "player-1",
    monster: null,
  };
  activeBattles.campaigns[0].activeBattles = [
    {
      id: "active-1",
      name: "Ambush",
      round: 1,
      currentParticipantId: participant.id,
      participants: [participant],
    },
    {
      id: "active-2",
      name: "Cave fight",
      round: 2,
      currentParticipantId: participant.id,
      participants: [participant],
    },
  ];
  assert.equal(isWorkspaceData(activeBattles), true);

  activeBattles.campaigns[0].activeBattles[1].id = "active-1";
  assert.equal(isWorkspaceData(activeBattles), false);
});

test("validates weapon and armor gear, including normal damage dice", () => {
  const validGear = workspace();
  validGear.gear = [
    {
      id: "weapon-1",
      name: "Longsword",
      kind: "weapon",
      cost: "15 gp",
      damage: { count: 1, die: "d8", modifier: 2 },
      damageType: "slashing",
      range: { normal: 80, long: 320 },
      notes: emptyNotes(),
    },
    {
      id: "armor-1",
      name: "Leather armor",
      kind: "armor",
      cost: "10 gp",
      armorClass: "11 + Dex modifier",
      notes: emptyNotes(),
    },
  ];
  validGear.gear[0].notes.links.push({
    type: "gear",
    id: "armor-1",
    campaignId: null,
    label: "Leather armor",
  });
  assert.equal(isWorkspaceData(validGear), true);

  const invalidDie = workspace();
  invalidDie.gear = [{
    id: "weapon-1",
    name: "Longsword",
    kind: "weapon",
    cost: "15 gp",
    damage: { count: 1, die: "d7", modifier: 0 },
    damageType: "slashing",
    range: { normal: 5, long: 5 },
    notes: emptyNotes(),
  }];
  assert.equal(isWorkspaceData(invalidDie), false);

  const invalidDiceCount = workspace();
  invalidDiceCount.gear = [{
    id: "weapon-1",
    name: "Longsword",
    kind: "weapon",
    cost: "15 gp",
    damage: { count: 0, die: "d8", modifier: 0 },
    damageType: "slashing",
    range: { normal: 5, long: 5 },
    notes: emptyNotes(),
  }];
  assert.equal(isWorkspaceData(invalidDiceCount), false);
});

test("rejects locations with missing or non-folder parents", () => {
  const missingParent = workspace();
  missingParent.campaigns[0].locations[1].parentId = "missing";
  assert.equal(isWorkspaceData(missingParent), false);

  const locationParent = workspace();
  locationParent.campaigns[0].locations[2].parentId = "room-a";
  assert.equal(isWorkspaceData(locationParent), false);
});

test("rejects cyclic location folders and malformed NPC stats", () => {
  const cyclic = workspace();
  cyclic.campaigns[0].locations[0].parentId = "cathedral";
  assert.equal(isWorkspaceData(cyclic), false);

  const malformedNpc = workspace();
  malformedNpc.campaigns[0].npcs[0].stats.abilityScores.DEX = "high";
  assert.equal(isWorkspaceData(malformedNpc), false);

  const invalidLink = workspace();
  invalidLink.campaigns[0].npcs[0].notes.links[0].type = "unknown";
  assert.equal(isWorkspaceData(invalidLink), false);
});

test("rejects empty image references and profile image ids", () => {
  const invalidAttachment = workspace();
  invalidAttachment.campaigns[0].npcs[0].notes.images = [{ id: "", altText: "" }];
  assert.equal(isWorkspaceData(invalidAttachment), false);

  const invalidProfileImage = workspace();
  invalidProfileImage.campaigns[0].players[0].profileImageId = "";
  assert.equal(isWorkspaceData(invalidProfileImage), false);
});

test("validates configured monster spell-slot levels", () => {
  const validSlots = workspace();
  validSlots.monsters[0].spellSlots = [
    { level: 0, maximum: 0 },
    { level: 1, maximum: 4 },
    { level: 9, maximum: 2 },
  ];
  assert.equal(isWorkspaceData(validSlots), true);

  const duplicateLevel = workspace();
  duplicateLevel.monsters[0].spellSlots = [
    { level: 2, maximum: 1 },
    { level: 2, maximum: 3 },
  ];
  assert.equal(isWorkspaceData(duplicateLevel), false);

  const tooManySlots = workspace();
  tooManySlots.monsters[0].spellSlots = [{ level: 1, maximum: 5 }];
  assert.equal(isWorkspaceData(tooManySlots), false);
});

test("validates monster spell usage modes and daily-use limits", () => {
  const spellModes = workspace();
  spellModes.monsters[0].spells = [
    { id: "cantrip", name: "Fire Bolt", usage: { type: "spell-slot", level: 0 } },
    { id: "shared", name: "Fireball", usage: { type: "shared-daily", usesPerDay: 2 } },
    { id: "each", name: "Shield", usage: { type: "daily-each", usesPerDay: 1 } },
    { id: "will", name: "Detect Magic", usage: { type: "at-will" } },
  ];
  assert.equal(isWorkspaceData(spellModes), true);

  const invalidDailyUses = workspace();
  invalidDailyUses.monsters[0].spells = [
    { id: "invalid", name: "Fireball", usage: { type: "shared-daily", usesPerDay: 0 } },
  ];
  assert.equal(isWorkspaceData(invalidDailyUses), false);

  const duplicateSpellIds = workspace();
  duplicateSpellIds.monsters[0].spells = [
    { id: "same", name: "Spell A", usage: { type: "at-will" } },
    { id: "same", name: "Spell B", usage: { type: "at-will" } },
  ];
  assert.equal(isWorkspaceData(duplicateSpellIds), false);
});
