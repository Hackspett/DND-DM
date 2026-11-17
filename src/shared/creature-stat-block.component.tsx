import { spellUsageLabel } from "./spells.utils";
import {
  ABILITIES,
  type CreatureStats,
  type MonsterSpell,
  type SpellSlotCapacity,
} from "../workspace.types";

interface CreatureStatBlockProps {
  stats: CreatureStats;
  spellSlots?: SpellSlotCapacity[];
  spells?: MonsterSpell[];
  speedLabel?: string;
}

function CreatureStatBlock({
  stats,
  spellSlots = [],
  spells = [],
  speedLabel = "Speed",
}: CreatureStatBlockProps) {
  const slotsDescription = [...spellSlots]
    .sort((first, second) => first.level - second.level)
    .map((slot) => `${spellLevelLabel(slot.level)}: ${slot.maximum}`)
    .join(" · ");
  const spellsDescription = spells
    .map((spell) => `${spell.name} (${spellUsageLabel(spell.usage)})`)
    .join(" · ");

  return (
    <>
      <div className="ability-score-row">
        {ABILITIES.map((ability) => (
          <span key={ability}><strong>{ability}</strong>{stats.abilityScores[ability]}</span>
        ))}
      </div>
      <div className="stat-block-grid">
        <StatLine label="Size" value={stats.size} />
        <StatLine label="Creature type" value={stats.creatureType} />
        <StatLine label="Alignment" value={stats.alignment} />
        <StatLine label="Armor class" value={String(stats.armorClass)} />
        <StatLine label="Hit points" value={`${stats.hitPoints}${stats.hitDice ? ` (${stats.hitDice})` : ""}`} />
        <StatLine label={speedLabel} value={stats.speed} />
        <StatLine label="Challenge rating" value={stats.challengeRating} />
        <StatLine label="Proficiency bonus" value={formatModifier(stats.proficiencyBonus)} />
        <StatLine label="Spell slots" value={slotsDescription} />
        <StatLine label="Spells" value={spellsDescription} />
        <StatLine label="Saving throws" value={stats.savingThrows} />
        <StatLine label="Skills" value={stats.skills} />
        <StatLine label="Damage vulnerabilities" value={stats.damageVulnerabilities} />
        <StatLine label="Damage resistances" value={stats.damageResistances} />
        <StatLine label="Damage immunities" value={stats.damageImmunities} />
        <StatLine label="Condition immunities" value={stats.conditionImmunities} />
        <StatLine label="Senses" value={stats.senses} />
        <StatLine label="Languages" value={stats.languages} />
        <StatLine label="Traits" value={stats.traits} />
        <StatLine label="Actions" value={stats.actions} />
        <StatLine label="Bonus actions" value={stats.bonusActions} />
        <StatLine label="Reactions" value={stats.reactions} />
        <StatLine label="Legendary actions" value={stats.legendaryActions} />
      </div>
    </>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p className="stat-line">
      <strong>{label}:</strong> <span>{value}</span>
    </p>
  );
}

function spellLevelLabel(level: number): string {
  if (level === 0) return "Cantrip (0)";
  const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
  return `${level}${suffix}`;
}

function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

export default CreatureStatBlock;
