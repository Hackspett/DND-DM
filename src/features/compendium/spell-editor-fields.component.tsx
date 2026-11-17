import { NativeSelect, NumberInput, TextInput } from "@mantine/core";
import AppButton from "../../shared/app-button.component";
import type { MonsterSpell, MonsterSpellUsage, SpellSlotCapacity } from "../../workspace.types";

export function SpellSlotFields({
  value,
  onChange,
}: {
  value: SpellSlotCapacity[];
  onChange: (spellSlots: SpellSlotCapacity[]) => void;
}) {
  const availableLevels = Array.from({ length: 10 }, (_, level) => level)
    .filter((level) => !value.some((slot) => slot.level === level));

  function addSpellSlotLevel() {
    const level = availableLevels[0];
    if (level === undefined) return;
    onChange([...value, { level, maximum: 1 }].sort((a, b) => a.level - b.level));
  }

  function updateSlotLevel(oldLevel: number, level: number) {
    onChange(
      value
        .map((slot) => slot.level === oldLevel ? { ...slot, level } : slot)
        .sort((a, b) => a.level - b.level),
    );
  }

  return (
    <div className="form-section spell-slot-fields">
      <div className="spell-slot-fields-heading">
        <h3>Spell slots</h3>
        <AppButton
          className="subtle-button"
          type="button"
          onClick={addSpellSlotLevel}
          disabled={availableLevels.length === 0}
        >
          ＋ Add level
        </AppButton>
      </div>
      {value.length === 0 ? (
        <p className="muted-copy">No spell slots configured for this monster.</p>
      ) : (
        <div className="spell-slot-editor-list">
          {value.map((slot) => (
            <div className="spell-slot-edit-row" key={slot.level}>
              <NativeSelect
                className="form-field"
                label="Spell level"
                value={slot.level}
                onChange={(event) => updateSlotLevel(slot.level, Number(event.currentTarget.value))}
              >
                  {[slot.level, ...availableLevels].sort((a, b) => a - b).map((level) => (
                    <option key={level} value={level}>{spellLevelLabel(level)}</option>
                  ))}
              </NativeSelect>
              <NumberInput
                className="form-field"
                label="Maximum slots"
                min={0}
                max={4}
                step={1}
                value={slot.maximum}
                onChange={(maximum) => onChange(
                    value.map((item) =>
                      item.level === slot.level
                        ? { ...item, maximum: Math.max(0, Math.min(4, Number(maximum) || 0)) }
                        : item,
                    ),
                  )}
                required
              />
              <AppButton
                className="danger-text-button"
                type="button"
                onClick={() => onChange(value.filter((item) => item.level !== slot.level))}
              >
                Remove
              </AppButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MonsterSpellFields({
  value,
  onChange,
}: {
  value: MonsterSpell[];
  onChange: (spells: MonsterSpell[]) => void;
}) {
  function updateSpell(spellId: string, update: Partial<MonsterSpell>) {
    onChange(value.map((spell) =>
      spell.id === spellId ? { ...spell, ...update } : spell,
    ));
  }

  function updateUsage(spell: MonsterSpell, type: MonsterSpellUsage["type"]) {
    let usage: MonsterSpellUsage;
    switch (type) {
      case "spell-slot":
        usage = { type, level: 1 };
        break;
      case "shared-daily":
      case "daily-each":
        usage = { type, usesPerDay: 1 };
        break;
      case "at-will":
        usage = { type };
        break;
    }
    updateSpell(spell.id, { usage });
  }

  function updateDailyUses(spell: MonsterSpell, usesPerDay: number) {
    if (spell.usage.type === "shared-daily" || spell.usage.type === "daily-each") {
      updateSpell(spell.id, { usage: { ...spell.usage, usesPerDay } });
    }
  }

  function addSpell() {
    onChange([
      ...value,
      {
        id: crypto.randomUUID(),
        name: "",
        usage: { type: "spell-slot", level: 1 },
      },
    ]);
  }

  return (
    <div className="form-section monster-spell-fields">
      <div className="spell-slot-fields-heading">
        <h3>Spells</h3>
        <AppButton className="subtle-button" type="button" onClick={addSpell}>＋ Add spell</AppButton>
      </div>
      <p className="muted-copy">Matching X/day spells share one pool. X/day each spells have separate uses.</p>
      {value.length === 0 ? (
        <p className="muted-copy">No spells added for this monster.</p>
      ) : (
        <div className="monster-spell-editor-list">
          {value.map((spell) => (
            <div className="monster-spell-edit-row" key={spell.id}>
              <TextInput
                className="form-field"
                label="Spell name"
                value={spell.name}
                onChange={(event) => updateSpell(spell.id, { name: event.currentTarget.value })}
                placeholder="e.g. Fireball"
                required
              />
              <NativeSelect
                className="form-field"
                label="Usage"
                value={spell.usage.type}
                onChange={(event) => {
                    const type = event.currentTarget.value;
                    if (
                      type === "spell-slot" ||
                      type === "shared-daily" ||
                      type === "daily-each" ||
                      type === "at-will"
                    ) {
                      updateUsage(spell, type);
                    }
                  }}
              >
                  <option value="spell-slot">Spell slot</option>
                  <option value="shared-daily">X/day shared pool</option>
                  <option value="daily-each">X/day each</option>
                  <option value="at-will">At will</option>
              </NativeSelect>
              {spell.usage.type === "spell-slot" ? (
                <NativeSelect
                  className="form-field"
                  label="Spell level"
                  value={spell.usage.level}
                  onChange={(event) =>
                      updateSpell(spell.id, {
                        usage: { type: "spell-slot", level: Number(event.currentTarget.value) },
                      })
                    }
                >
                    {Array.from({ length: 10 }, (_, level) => (
                      <option key={level} value={level}>{spellLevelLabel(level)}</option>
                    ))}
                </NativeSelect>
              ) : spell.usage.type === "shared-daily" || spell.usage.type === "daily-each" ? (
                <NumberInput
                  className="form-field"
                  label="Uses per day"
                  min={1}
                  step={1}
                  value={spell.usage.usesPerDay}
                  onChange={(usesPerDay) =>
                    updateDailyUses(spell, Math.max(1, Math.floor(Number(usesPerDay) || 1)))
                  }
                  required
                />
              ) : (
                <span className="monster-spell-at-will">No resource cost</span>
              )}
              <AppButton
                className="danger-text-button"
                type="button"
                onClick={() => onChange(value.filter((item) => item.id !== spell.id))}
              >
                Remove
              </AppButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function spellLevelLabel(level: number): string {
  if (level === 0) return "Cantrip (0)";
  const suffix = level === 1 ? "st" : level === 2 ? "nd" : level === 3 ? "rd" : "th";
  return `${level}${suffix}`;
}

