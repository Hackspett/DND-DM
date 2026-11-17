import type { CreatureStats } from "../workspace.types";

export function createEmptyCreatureStats(): CreatureStats {
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
