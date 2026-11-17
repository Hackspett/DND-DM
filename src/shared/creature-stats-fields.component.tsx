import { Accordion, NativeSelect, NumberInput, TextInput, Textarea } from "@mantine/core";
import { ABILITIES } from "../workspace.types";
import type { CreatureStats } from "../workspace.types";

interface CreatureStatsFieldsProps {
  stats: CreatureStats;
  onChange: <K extends keyof CreatureStats>(
    key: K,
    value: CreatureStats[K],
  ) => void;
}

function CreatureStatsFields({ stats, onChange }: CreatureStatsFieldsProps) {
  return (
    <>
      <div className="form-section">
        <h3>Identity</h3>
        <div className="form-grid form-grid-three">
          <NativeSelect
            className="form-field"
            label="Size"
            value={stats.size}
            onChange={(event) => onChange("size", event.currentTarget.value)}
          >
            {["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"].map((size) => (
              <option key={size}>{size}</option>
            ))}
          </NativeSelect>
          <TextInput
            className="form-field"
            label="Creature type"
            value={stats.creatureType}
            onChange={(event) => onChange("creatureType", event.currentTarget.value)}
            placeholder="e.g. humanoid"
          />
          <TextInput
            className="form-field"
            label="Alignment"
            value={stats.alignment}
            onChange={(event) => onChange("alignment", event.currentTarget.value)}
            placeholder="e.g. chaotic evil"
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Combat statistics</h3>
        <div className="form-grid form-grid-four">
          <NumberInput
            className="form-field"
            label="Armor class"
            min={0}
            value={stats.armorClass}
            onChange={(value) => onChange("armorClass", Number(value) || 0)}
          />
          <NumberInput
            className="form-field"
            label="Hit points *"
            min={1}
            value={stats.hitPoints}
            onChange={(value) => onChange("hitPoints", Number(value) || 0)}
            required
          />
          <TextInput
            className="form-field"
            label="Hit dice"
            value={stats.hitDice}
            onChange={(event) => onChange("hitDice", event.currentTarget.value)}
            placeholder="e.g. 2d6 + 2"
          />
          <TextInput
            className="form-field"
            label="Speed"
            value={stats.speed}
            onChange={(event) => onChange("speed", event.currentTarget.value)}
            placeholder="e.g. 30 ft., climb 20 ft."
          />
          <TextInput
            className="form-field"
            label="Challenge rating"
            value={stats.challengeRating}
            onChange={(event) => onChange("challengeRating", event.currentTarget.value)}
            placeholder="e.g. 1/4"
          />
          <NumberInput
            className="form-field"
            label="Proficiency bonus"
            min={0}
            value={stats.proficiencyBonus}
            onChange={(value) => onChange("proficiencyBonus", Number(value) || 0)}
          />
        </div>
      </div>

      <div className="form-section">
        <h3>Ability scores</h3>
        <div className="ability-input-grid">
          {ABILITIES.map((ability) => (
            <NumberInput
              className="form-field ability-field"
              key={ability}
              label={ability}
              min={1}
              max={30}
              value={stats.abilityScores[ability]}
              onChange={(value) =>
                onChange("abilityScores", {
                  ...stats.abilityScores,
                  [ability]: Number(value) || 0,
                })
              }
            />
          ))}
        </div>
      </div>

      <Accordion className="advanced-fields" variant="default">
        <Accordion.Item value="advanced">
          <Accordion.Control>Skills, senses, defenses &amp; features</Accordion.Control>
          <Accordion.Panel>
            <div className="form-section">
              <div className="form-grid form-grid-two">
                <TextInput className="form-field" label="Saving throws" value={stats.savingThrows} onChange={(event) => onChange("savingThrows", event.currentTarget.value)} placeholder="e.g. Dex +4, Wis +2" />
                <TextInput className="form-field" label="Skills" value={stats.skills} onChange={(event) => onChange("skills", event.currentTarget.value)} placeholder="e.g. Stealth +6, Perception +2" />
                <TextInput className="form-field" label="Damage vulnerabilities" value={stats.damageVulnerabilities} onChange={(event) => onChange("damageVulnerabilities", event.currentTarget.value)} />
                <TextInput className="form-field" label="Damage resistances" value={stats.damageResistances} onChange={(event) => onChange("damageResistances", event.currentTarget.value)} />
                <TextInput className="form-field" label="Damage immunities" value={stats.damageImmunities} onChange={(event) => onChange("damageImmunities", event.currentTarget.value)} />
                <TextInput className="form-field" label="Condition immunities" value={stats.conditionImmunities} onChange={(event) => onChange("conditionImmunities", event.currentTarget.value)} />
                <TextInput className="form-field" label="Senses" value={stats.senses} onChange={(event) => onChange("senses", event.currentTarget.value)} placeholder="e.g. darkvision 60 ft., passive Perception 12" />
                <TextInput className="form-field" label="Languages" value={stats.languages} onChange={(event) => onChange("languages", event.currentTarget.value)} />
              </div>
            </div>
            <div className="form-section">
              <h3>Traits and actions</h3>
              <div className="form-grid form-grid-two">
                <Textarea className="form-field" label="Traits" rows={3} value={stats.traits} onChange={(event) => onChange("traits", event.currentTarget.value)} placeholder="Name and description, one feature per line" />
                <Textarea className="form-field" label="Actions" rows={3} value={stats.actions} onChange={(event) => onChange("actions", event.currentTarget.value)} placeholder="Name and description, one action per line" />
                <Textarea className="form-field" label="Bonus actions" rows={3} value={stats.bonusActions} onChange={(event) => onChange("bonusActions", event.currentTarget.value)} />
                <Textarea className="form-field" label="Reactions" rows={3} value={stats.reactions} onChange={(event) => onChange("reactions", event.currentTarget.value)} />
                <Textarea className="form-field" label="Legendary actions" rows={3} value={stats.legendaryActions} onChange={(event) => onChange("legendaryActions", event.currentTarget.value)} />
              </div>
            </div>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </>
  );
}

export default CreatureStatsFields;
