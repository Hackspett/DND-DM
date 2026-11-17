import assert from "node:assert/strict";
import test from "node:test";
import {
  canCastMonsterSpell,
  castMonsterSpell,
  createSpellResources,
  normalizeActiveBattleSpellResources,
} from "../src/shared/spells.utils.ts";

const spells = [
  { id: "flame", name: "Flame Burst", usage: { type: "shared-daily", usesPerDay: 3 } },
  { id: "frost", name: "Frost Ray", usage: { type: "shared-daily", usesPerDay: 3 } },
  { id: "roar", name: "Roar", usage: { type: "shared-daily", usesPerDay: 1 } },
  { id: "shield", name: "Shield", usage: { type: "daily-each", usesPerDay: 2 } },
  { id: "bolt", name: "Lightning Bolt", usage: { type: "spell-slot", level: 2 } },
  { id: "spark", name: "Spark", usage: { type: "at-will" } },
];

function enemy() {
  return {
    id: "enemy-1",
    name: "Mage",
    kind: "enemy",
    initiative: 10,
    dexterityModifier: 0,
    playerId: null,
    monster: {
      id: "mage",
      name: "Mage",
      spells,
      spellSlots: [{ level: 2, maximum: 2 }],
    },
    currentHitPoints: 10,
    maxHitPoints: 10,
    ...createSpellResources({
      spells,
      spellSlots: [{ level: 2, maximum: 2 }],
    }),
  };
}

test("groups shared daily spells by uses per day and keeps each-spell uses separate", () => {
  const resources = createSpellResources({
    spells,
    spellSlots: [{ level: 2, maximum: 2 }],
  });
  assert.deepEqual(resources.sharedDailySpellPools, [
    { usesPerDay: 3, maximum: 3, remaining: 3 },
    { usesPerDay: 1, maximum: 1, remaining: 1 },
  ]);
  assert.deepEqual(resources.individualDailySpells, [
    { spellId: "shield", maximum: 2, remaining: 2 },
  ]);
});

test("casting spends the appropriate shared pool, individual use, or spell slot", () => {
  let participant = enemy();
  participant = castMonsterSpell(participant, spells[0]);
  assert.equal(participant.sharedDailySpellPools[0].remaining, 2);
  participant = castMonsterSpell(participant, spells[1]);
  assert.equal(participant.sharedDailySpellPools[0].remaining, 1);
  participant = castMonsterSpell(participant, spells[3]);
  assert.equal(participant.individualDailySpells[0].remaining, 1);
  participant = castMonsterSpell(participant, spells[4]);
  assert.equal(participant.spellSlots[0].remaining, 1);
});

test("prevents casting when a resource is empty and leaves at-will spells unspent", () => {
  let participant = enemy();
  participant = castMonsterSpell(participant, spells[0]);
  participant = castMonsterSpell(participant, spells[0]);
  participant = castMonsterSpell(participant, spells[0]);
  assert.equal(canCastMonsterSpell(participant, spells[1]), false);
  assert.equal(castMonsterSpell(participant, spells[1]).sharedDailySpellPools[0].remaining, 0);

  const before = participant;
  assert.equal(canCastMonsterSpell(participant, spells[5]), true);
  assert.equal(castMonsterSpell(participant, spells[5]), before);
});

test("normalizes previously saved active battles without changing tracked spell slots", () => {
  const battle = {
    id: "battle-1",
    name: "Old encounter",
    round: 1,
    currentParticipantId: "enemy-1",
    participants: [{
      id: "enemy-1",
      name: "Mage",
      kind: "enemy",
      initiative: 10,
      dexterityModifier: 0,
      playerId: null,
      monster: {
        id: "mage",
        name: "Mage",
        spellSlots: [{ level: 2, maximum: 2 }],
      },
      currentHitPoints: 5,
      maxHitPoints: 10,
      spellSlots: [{ level: 2, maximum: 2, remaining: 1 }],
    }],
  };
  const normalized = normalizeActiveBattleSpellResources(battle);
  const participant = normalized.participants[0];
  assert.deepEqual(participant.monster.spells, []);
  assert.deepEqual(participant.spellSlots, [{ level: 2, maximum: 2, remaining: 1 }]);
  assert.deepEqual(participant.sharedDailySpellPools, []);
  assert.deepEqual(participant.individualDailySpells, []);
});

test("caps legacy spell-slot totals at the new maximum", () => {
  const battle = {
    id: "battle-1",
    name: "Old encounter",
    round: 1,
    currentParticipantId: "enemy-1",
    participants: [{
      id: "enemy-1",
      name: "Mage",
      kind: "enemy",
      initiative: 10,
      dexterityModifier: 0,
      playerId: null,
      monster: {
        id: "mage",
        name: "Mage",
        spellSlots: [{ level: 2, maximum: 10 }],
      },
      currentHitPoints: 5,
      maxHitPoints: 10,
      spellSlots: [{ level: 2, maximum: 10, remaining: 8 }],
    }],
  };
  const participant = normalizeActiveBattleSpellResources(battle).participants[0];
  assert.deepEqual(participant.monster.spellSlots, [{ level: 2, maximum: 4 }]);
  assert.deepEqual(participant.spellSlots, [{ level: 2, maximum: 4, remaining: 4 }]);
});
