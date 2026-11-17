import assert from "node:assert/strict";
import test from "node:test";
import {
  addParticipantsToBattle,
  abilityModifier,
  formatMovementInSquares,
  rollEnemyInitiative,
  rollEnemyInitiatives,
  sortInitiative,
} from "../src/features/battle/battle.utils.ts";

test("converts enemy movement speeds from feet to 5-foot squares", () => {
  assert.equal(
    formatMovementInSquares("30 ft., climb 20 ft., fly 60 ft. (hover)"),
    "6 squares, climb 4 squares, fly 12 squares (hover)",
  );
  assert.equal(formatMovementInSquares("5 feet"), "1 square");
  assert.equal(formatMovementInSquares("No listed movement"), "No listed movement");
});

test("calculates D&D ability modifiers around score boundaries", () => {
  assert.equal(abilityModifier(7), -2);
  assert.equal(abilityModifier(8), -1);
  assert.equal(abilityModifier(10), 0);
  assert.equal(abilityModifier(20), 5);
});

test("rolls a d20 and adds the enemy's Dexterity modifier", () => {
  assert.equal(rollEnemyInitiative(8, () => 0), 0);
  assert.equal(rollEnemyInitiative(14, () => 0.999999), 22);
});

test("rolls separately for each enemy in a group", () => {
  const rolls = [0, 0.5, 0.999999];
  let rollIndex = 0;
  const participants = rollEnemyInitiatives(
    [
      { id: "g1", name: "Goblin 1", dexterityScore: 10 },
      { id: "g2", name: "Goblin 2", dexterityScore: 10 },
      { id: "g3", name: "Goblin 3", dexterityScore: 10 },
    ],
    () => rolls[rollIndex++],
  );

  assert.deepEqual(participants.map(({ initiative }) => initiative), [1, 11, 20]);
  assert.equal(rollIndex, 3);
});

test("sorts the turn order from highest initiative to lowest", () => {
  const participants = [
    { id: "p1", name: "Player", kind: "player", initiative: 12, dexterityModifier: 0 },
    { id: "e1", name: "Goblin", kind: "enemy", initiative: 18, dexterityModifier: 2 },
    { id: "p2", name: "Another player", kind: "player", initiative: 7, dexterityModifier: 0 },
  ];

  assert.deepEqual(
    sortInitiative(participants).map(({ name }) => name),
    ["Goblin", "Player", "Another player"],
  );
  assert.equal(participants[0].name, "Player");
});

test("inserts new combatants into initiative order without changing the current turn", () => {
  const battle = {
    id: "active-1",
    name: "At the bridge",
    round: 3,
    currentParticipantId: "player-current",
    participants: [{
      id: "player-current",
      name: "Ari",
      kind: "player",
      initiative: 10,
      dexterityModifier: 0,
      playerId: "player-current",
      monster: null,
    }],
  };
  const updated = addParticipantsToBattle(battle, [{
    id: "player-added",
    name: "Bryn",
    kind: "player",
    initiative: 18,
    dexterityModifier: 0,
    playerId: "player-added",
    monster: null,
  }]);

  assert.deepEqual(updated.participants.map(({ id }) => id), [
    "player-added",
    "player-current",
  ]);
  assert.equal(updated.currentParticipantId, "player-current");
  assert.equal(updated.round, 3);
});
