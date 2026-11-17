import {
  ABILITIES,
  type ActiveBattle,
  type ActiveBattleParticipant,
  type Campaign,
  type CompendiumEntry,
  type CreatureStats,
  type DailySpellPoolTracker,
  type IndividualDailySpellTracker,
  type LocationNode,
  type Monster,
  type MonsterBattleSnapshot,
  type MonsterSpell,
  type MonsterSpellUsage,
  type Npc,
  type Player,
  type PreparedBattle,
  type SpellSlotCapacity,
  type SpellSlotTracker,
  type WorkspaceData,
} from "./workspace.types.js";
import { isResourceNotes } from "./shared/resource-notes.utils.js";
import { isRecord, isOptionalImageId } from "./validation/primitives.utils.js";
import { isCurrentBattle } from "./validation/current-battle.schema.js";
import { isGearEntry } from "./validation/gear.schema.js";

export { isRecord } from "./validation/primitives.utils.js";
export { isGearEntry } from "./validation/gear.schema.js";

function isPlayer(value: unknown): value is Player {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isOptionalImageId(value.profileImageId) &&
    isResourceNotes(value.notes)
  );
}

function isPreparedBattle(value: unknown): value is PreparedBattle {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isResourceNotes(value.notes) &&
    Array.isArray(value.playerIds) &&
    value.playerIds.every((id) => typeof id === "string") &&
    Array.isArray(value.enemies) &&
    value.enemies.every(
      (enemy) =>
        isRecord(enemy) &&
        typeof enemy.monsterId === "string" &&
        typeof enemy.count === "number" &&
        Number.isInteger(enemy.count) &&
        enemy.count > 0,
    )
  );
}

function isCreatureStats(value: unknown): value is CreatureStats {
  if (!isRecord(value) || !isRecord(value.abilityScores)) return false;
  const abilityScores = value.abilityScores;

  const stringFields = [
    "size",
    "creatureType",
    "alignment",
    "hitDice",
    "speed",
    "savingThrows",
    "skills",
    "damageVulnerabilities",
    "damageResistances",
    "damageImmunities",
    "conditionImmunities",
    "senses",
    "languages",
    "challengeRating",
    "traits",
    "actions",
    "bonusActions",
    "reactions",
    "legendaryActions",
  ];
  const numberFields = ["armorClass", "hitPoints", "proficiencyBonus"];

  return (
    stringFields.every((field) => typeof value[field] === "string") &&
    numberFields.every((field) => typeof value[field] === "number") &&
    typeof value.hitPoints === "number" &&
    Number.isInteger(value.hitPoints) &&
    value.hitPoints > 0 &&
    ABILITIES.every((ability) => typeof abilityScores[ability] === "number")
  );
}

function isSpellSlotCapacity(value: unknown): value is SpellSlotCapacity {
  return (
    isRecord(value) &&
    typeof value.level === "number" &&
    Number.isInteger(value.level) &&
    value.level >= 0 &&
    value.level <= 9 &&
    typeof value.maximum === "number" &&
    Number.isInteger(value.maximum) &&
    value.maximum >= 0 &&
    value.maximum <= 4
  );
}

function isSpellSlotTracker(value: unknown): value is SpellSlotTracker {
  return (
    isRecord(value) &&
    typeof value.level === "number" &&
    Number.isInteger(value.level) &&
    value.level >= 0 &&
    value.level <= 9 &&
    typeof value.maximum === "number" &&
    Number.isInteger(value.maximum) &&
    value.maximum >= 0 &&
    value.maximum <= 4 &&
    typeof value.remaining === "number" &&
    Number.isInteger(value.remaining) &&
    value.remaining >= 0 &&
    value.remaining <= value.maximum
  );
}

function isMonsterSpellUsage(value: unknown): value is MonsterSpellUsage {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (value.type === "spell-slot") {
    return (
      typeof value.level === "number" &&
      Number.isInteger(value.level) &&
      value.level >= 0 &&
      value.level <= 9
    );
  }
  if (value.type === "shared-daily" || value.type === "daily-each") {
    return (
      typeof value.usesPerDay === "number" &&
      Number.isInteger(value.usesPerDay) &&
      value.usesPerDay > 0
    );
  }
  return value.type === "at-will";
}

function isMonsterSpell(value: unknown): value is MonsterSpell {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    isMonsterSpellUsage(value.usage)
  );
}

function isDailySpellPoolTracker(value: unknown): value is DailySpellPoolTracker {
  return (
    isRecord(value) &&
    typeof value.usesPerDay === "number" &&
    Number.isInteger(value.usesPerDay) &&
    value.usesPerDay > 0 &&
    typeof value.maximum === "number" &&
    Number.isInteger(value.maximum) &&
    value.maximum === value.usesPerDay &&
    typeof value.remaining === "number" &&
    Number.isInteger(value.remaining) &&
    value.remaining >= 0 &&
    value.remaining <= value.maximum
  );
}

function isIndividualDailySpellTracker(
  value: unknown,
): value is IndividualDailySpellTracker {
  return (
    isRecord(value) &&
    typeof value.spellId === "string" &&
    value.spellId.length > 0 &&
    typeof value.maximum === "number" &&
    Number.isInteger(value.maximum) &&
    value.maximum > 0 &&
    typeof value.remaining === "number" &&
    Number.isInteger(value.remaining) &&
    value.remaining >= 0 &&
    value.remaining <= value.maximum
  );
}

function hasUniqueSpellIds(spells: MonsterSpell[]): boolean {
  return new Set(spells.map((spell) => spell.id)).size === spells.length;
}

function isMonsterBattleSnapshot(value: unknown): value is MonsterBattleSnapshot {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isOptionalImageId(value.profileImageId) &&
    isCreatureStats(value) &&
    Array.isArray(value.spellSlots) &&
    value.spellSlots.every(isSpellSlotCapacity) &&
    new Set(value.spellSlots.map((slot) => slot.level)).size === value.spellSlots.length &&
    Array.isArray(value.spells) &&
    value.spells.every(isMonsterSpell) &&
    hasUniqueSpellIds(value.spells)
  );
}

function isActiveBattleParticipant(value: unknown): value is ActiveBattleParticipant {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.initiative !== "number" ||
    !Number.isInteger(value.initiative) ||
    typeof value.dexterityModifier !== "number" ||
    !Number.isInteger(value.dexterityModifier)
  ) {
    return false;
  }
  if (value.kind === "player") {
    return (
      typeof value.playerId === "string" &&
      value.monster === null
    );
  }
  return (
    value.kind === "enemy" &&
    value.playerId === null &&
    isMonsterBattleSnapshot(value.monster) &&
    typeof value.currentHitPoints === "number" &&
    Number.isInteger(value.currentHitPoints) &&
    value.currentHitPoints >= 0 &&
    typeof value.maxHitPoints === "number" &&
    Number.isInteger(value.maxHitPoints) &&
    value.maxHitPoints > 0 &&
    value.maxHitPoints >= value.currentHitPoints &&
    Array.isArray(value.spellSlots) &&
    value.spellSlots.every(isSpellSlotTracker) &&
    new Set(value.spellSlots.map((slot) => slot.level)).size === value.spellSlots.length &&
    Array.isArray(value.sharedDailySpellPools) &&
    value.sharedDailySpellPools.every(isDailySpellPoolTracker) &&
    new Set(value.sharedDailySpellPools.map((pool) => pool.usesPerDay)).size === value.sharedDailySpellPools.length &&
    Array.isArray(value.individualDailySpells) &&
    value.individualDailySpells.every(isIndividualDailySpellTracker) &&
    new Set(value.individualDailySpells.map((spell) => spell.spellId)).size === value.individualDailySpells.length
  );
}

function isActiveBattle(value: unknown): value is ActiveBattle {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    !Number.isInteger(value.round) ||
    typeof value.round !== "number" ||
    value.round < 1 ||
    typeof value.currentParticipantId !== "string" ||
    !Array.isArray(value.participants) ||
    value.participants.length === 0 ||
    !value.participants.every(isActiveBattleParticipant)
  ) {
    return false;
  }
  const participantIds = new Set(value.participants.map((participant) => participant.id));
  return (
    participantIds.size === value.participants.length &&
    participantIds.has(value.currentParticipantId)
  );
}

function isNpc(value: unknown): value is Npc {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isOptionalImageId(value.profileImageId) &&
    isResourceNotes(value.notes) &&
    (value.stats === null || isCreatureStats(value.stats))
  );
}

function isLocationNode(value: unknown): value is LocationNode {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    (value.parentId === null || typeof value.parentId === "string") &&
    (value.kind === "folder" || value.kind === "location") &&
    isResourceNotes(value.notes)
  );
}

function isCampaign(value: unknown): value is Campaign {
  if (!(
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isResourceNotes(value.notes) &&
    Array.isArray(value.players) &&
    value.players.every(isPlayer) &&
    Array.isArray(value.preparedBattles) &&
    value.preparedBattles.every(isPreparedBattle) &&
    Array.isArray(value.activeBattles) &&
    value.activeBattles.every(isActiveBattle) &&
    new Set(value.activeBattles.map((battle) => battle.id)).size ===
      value.activeBattles.length &&
    Array.isArray(value.npcs) &&
    value.npcs.every(isNpc) &&
    Array.isArray(value.locations) &&
    value.locations.every(isLocationNode)
  )) {
    return false;
  }

  const nodes = new Map(
    value.locations.map((node) => [node.id, node] as const),
  );
  for (const node of value.locations) {
    if (node.parentId === null) continue;
    const parent = nodes.get(node.parentId);
    if (!parent || parent.kind !== "folder") return false;

    const visited = new Set([node.id]);
    let ancestor: LocationNode | undefined = parent;
    while (ancestor) {
      if (visited.has(ancestor.id)) return false;
      visited.add(ancestor.id);
      ancestor = ancestor.parentId === null
        ? undefined
        : nodes.get(ancestor.parentId);
    }
  }
  return true;
}

function isMonster(value: unknown): value is Monster {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isOptionalImageId(value.profileImageId) &&
    Array.isArray(value.spellSlots) &&
    value.spellSlots.every(isSpellSlotCapacity) &&
    new Set(value.spellSlots.map((slot) => slot.level)).size === value.spellSlots.length &&
    Array.isArray(value.spells) &&
    value.spells.every(isMonsterSpell) &&
    hasUniqueSpellIds(value.spells) &&
    isResourceNotes(value.notes) &&
    isCreatureStats(value)
  );
}

function isCompendiumEntry(value: unknown): value is CompendiumEntry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isResourceNotes(value.notes)
  );
}



export function isWorkspaceData(value: unknown): value is WorkspaceData {
  if (!(
    isRecord(value) &&
    Array.isArray(value.campaigns) &&
    value.campaigns.every(isCampaign) &&
    Array.isArray(value.monsters) &&
    value.monsters.every(isMonster) &&
    Array.isArray(value.items) &&
    value.items.every(isCompendiumEntry) &&
    Array.isArray(value.gear) &&
    value.gear.every(isGearEntry) &&
    Array.isArray(value.effects) &&
    value.effects.every(isCompendiumEntry)
  )) {
    return false;
  }
  const currentBattle = value.currentBattle;
  return (
    currentBattle === null ||
    (isCurrentBattle(currentBattle) &&
      value.campaigns.some(
        (campaign) =>
          isRecord(campaign) && campaign.id === currentBattle.campaignId,
      ))
  );
}
