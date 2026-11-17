import type {
  ActiveBattle,
  ActiveEnemyParticipant,
  DailySpellPoolTracker,
  IndividualDailySpellTracker,
  Monster,
  MonsterSpell,
  MonsterSpellUsage,
  SpellSlotTracker,
} from "../workspace.types.js";

export function createSpellResources(
  monster: Pick<Monster, "spellSlots" | "spells">,
): Pick<
  ActiveEnemyParticipant,
  "spellSlots" | "sharedDailySpellPools" | "individualDailySpells"
> {
  const sharedDailySpellPools = new Map<number, DailySpellPoolTracker>();
  const individualDailySpells: IndividualDailySpellTracker[] = [];

  for (const spell of monster.spells) {
    if (spell.usage.type === "shared-daily") {
      if (!sharedDailySpellPools.has(spell.usage.usesPerDay)) {
        sharedDailySpellPools.set(spell.usage.usesPerDay, {
          usesPerDay: spell.usage.usesPerDay,
          maximum: spell.usage.usesPerDay,
          remaining: spell.usage.usesPerDay,
        });
      }
    } else if (spell.usage.type === "daily-each") {
      individualDailySpells.push({
        spellId: spell.id,
        maximum: spell.usage.usesPerDay,
        remaining: spell.usage.usesPerDay,
      });
    }
  }

  return {
    spellSlots: normalizeSpellSlotCapacities(monster.spellSlots).map((slot) => ({
      ...slot,
      remaining: slot.maximum,
    })),
    sharedDailySpellPools: [...sharedDailySpellPools.values()],
    individualDailySpells,
  };
}

export function canCastMonsterSpell(
  participant: ActiveEnemyParticipant,
  spell: MonsterSpell,
): boolean {
  switch (spell.usage.type) {
    case "spell-slot": {
      const { level } = spell.usage;
      return participant.spellSlots.some(
        (slot) => slot.level === level && slot.remaining > 0,
      );
    }
    case "shared-daily": {
      const { usesPerDay } = spell.usage;
      return participant.sharedDailySpellPools.some(
        (pool) =>
          pool.usesPerDay === usesPerDay && pool.remaining > 0,
      );
    }
    case "daily-each":
      return participant.individualDailySpells.some(
        (tracker) => tracker.spellId === spell.id && tracker.remaining > 0,
      );
    case "at-will":
      return true;
  }
}

export function castMonsterSpell(
  participant: ActiveEnemyParticipant,
  spell: MonsterSpell,
): ActiveEnemyParticipant {
  if (!canCastMonsterSpell(participant, spell) || spell.usage.type === "at-will") {
    return participant;
  }

  switch (spell.usage.type) {
    case "spell-slot":
      return {
        ...participant,
        spellSlots: consumeResource(
          participant.spellSlots,
          spell.usage.level,
          (slot) => slot.level,
        ),
      };
    case "shared-daily":
      return {
        ...participant,
        sharedDailySpellPools: consumeResource(
          participant.sharedDailySpellPools,
          spell.usage.usesPerDay,
          (pool) => pool.usesPerDay,
        ),
      };
    case "daily-each":
      return {
        ...participant,
        individualDailySpells: consumeResource(
          participant.individualDailySpells,
          spell.id,
          (tracker) => tracker.spellId,
        ),
      };
  }
}

export function spellUsageLabel(usage: MonsterSpellUsage): string {
  switch (usage.type) {
    case "spell-slot":
      return usage.level === 0
        ? "Cantrip (level 0 slot)"
        : `${spellLevelLabel(usage.level)}-level spell slot`;
    case "shared-daily":
      return `${usage.usesPerDay}/day shared`;
    case "daily-each":
      return `${usage.usesPerDay}/day each`;
    case "at-will":
      return "At will";
  }
}

export function normalizeActiveBattleSpellResources(
  battle: ActiveBattle,
): ActiveBattle {
  return {
    ...battle,
    participants: battle.participants.map((participant) => {
      if (participant.kind !== "enemy") return participant;

      const monster = {
        ...participant.monster,
        spellSlots: normalizeSpellSlotCapacities(
          participant.monster.spellSlots ?? [],
        ),
        spells: participant.monster.spells ?? [],
      };
      const resources = createSpellResources(monster);
      const spellSlots = participant.spellSlots?.map((slot) => {
        const maximum = Math.min(4, slot.maximum);
        return {
          ...slot,
          maximum,
          remaining: Math.min(maximum, slot.remaining),
        };
      });
      return {
        ...participant,
        monster,
        spellSlots: spellSlots ?? resources.spellSlots,
        sharedDailySpellPools:
          participant.sharedDailySpellPools ?? resources.sharedDailySpellPools,
        individualDailySpells:
          participant.individualDailySpells ?? resources.individualDailySpells,
      };
    }),
  };
}

export function normalizeSpellSlotCapacities(
  slots: Monster["spellSlots"],
): Monster["spellSlots"] {
  return slots.map((slot) => ({ ...slot, maximum: Math.min(4, slot.maximum) }));
}

function consumeResource<T extends { remaining: number }, K extends string | number>(
  resources: T[],
  key: K,
  getKey: (resource: T) => K,
): T[] {
  let consumed = false;
  return resources.map((resource) => {
    if (consumed || getKey(resource) !== key || resource.remaining <= 0) {
      return resource;
    }
    consumed = true;
    return { ...resource, remaining: resource.remaining - 1 };
  });
}

function spellLevelLabel(level: number): string {
  const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
  return `${level}${suffix}`;
}
