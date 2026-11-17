import type {
  ActiveBattle,
  ActiveEnemyParticipant,
  ActiveBattleParticipant,
  EnemyInitiativeInput,
  Monster,
  MonsterBattleSnapshot,
  TurnParticipant,
} from "../../workspace.types";

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function rollEnemyInitiative(
  dexterityScore: number,
  random: () => number = Math.random,
): number {
  return Math.floor(random() * 20) + 1 + abilityModifier(dexterityScore);
}

export function rollEnemyInitiatives(
  enemies: EnemyInitiativeInput[],
  random: () => number = Math.random,
): TurnParticipant[] {
  return enemies.map((enemy) => ({
    id: enemy.id,
    name: enemy.name,
    kind: "enemy",
    initiative: rollEnemyInitiative(enemy.dexterityScore, random),
    dexterityModifier: abilityModifier(enemy.dexterityScore),
  }));
}

export function sortInitiative<T extends TurnParticipant>(
  participants: T[],
): T[] {
  return [...participants].sort(
    (first, second) => second.initiative - first.initiative,
  );
}

export function addParticipantsToBattle(
  battle: ActiveBattle,
  additions: ActiveBattleParticipant[],
): ActiveBattle {
  return {
    ...battle,
    participants: sortInitiative([...battle.participants, ...additions]),
  };
}

export function createEnemyUnits(
  monsters: Monster[],
  enemyCounts: Record<string, number>,
) {
  return monsters.flatMap((monster) => {
    const count = enemyCounts[monster.id] ?? 0;
    return Array.from({ length: count }, (_, index) => ({
      id: `${monster.id}-${index}`,
      name: count > 1 ? `${monster.name} ${index + 1}` : monster.name,
      monsterId: monster.id,
      dexterityScore: monster.abilityScores.DEX,
    }));
  });
}

export function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

export function formatMovementInSquares(speed: string): string {
  return speed.replace(/\b(\d+(?:\.\d+)?)\s*(?:ft\.?|feet)(?![a-z])/gi, (_, feet: string) => {
    const squares = Number(feet) / 5;
    const formattedSquares = Number(squares.toFixed(2)).toString();
    return `${formattedSquares} ${formattedSquares === "1" ? "square" : "squares"}`;
  });
}

export function spellLevelLabel(level: number): string {
  if (level === 0) return "Cantrip (0)";
  const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
  return `${level}${suffix}`;
}

export function getSpellResourceStatus(
  participant: ActiveEnemyParticipant,
  spell: ActiveEnemyParticipant["monster"]["spells"][number],
): string {
  switch (spell.usage.type) {
    case "spell-slot": {
      const { level } = spell.usage;
      const slot = participant.spellSlots.find((item) => item.level === level);
      return slot
        ? `${slot.maximum - slot.remaining} used · ${slot.remaining} slots left`
        : "No slots configured";
    }
    case "shared-daily": {
      const { usesPerDay } = spell.usage;
      const pool = participant.sharedDailySpellPools.find(
        (item) => item.usesPerDay === usesPerDay,
      );
      return pool
        ? `${pool.maximum - pool.remaining} shared uses used · ${pool.remaining} left`
        : "No shared uses configured";
    }
    case "daily-each": {
      const tracker = participant.individualDailySpells.find(
        (item) => item.spellId === spell.id,
      );
      return tracker
        ? `${tracker.maximum - tracker.remaining} used · ${tracker.remaining} left`
        : "No uses configured";
    }
    case "at-will":
      return "No resource cost";
  }
}

export function snapshotMonster(monster: Monster): MonsterBattleSnapshot {
  const { id, name, profileImageId, spellSlots, spells, ...stats } = monster;
  return {
    ...stats,
    id,
    name,
    profileImageId,
    spellSlots: spellSlots.map((slot) => ({ ...slot })),
    spells: spells.map((spell) => ({ ...spell, usage: { ...spell.usage } })),
  };
}
