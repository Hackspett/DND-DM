import { useState, type FormEvent } from "react";
import { NativeSelect, NumberInput, TextInput } from "@mantine/core";
import AppButton from "../../shared/app-button.component";
import DiceInput from "../../shared/dice-input.component";
import { formatDiceExpression } from "../../shared/dice.utils";
import ResourceNotes from "../../shared/resource-notes.component";
import { createEmptyResourceNotes } from "../../shared/resource-notes.utils";
import type {
  ArmorGearEntry,
  GearEntry,
  ResourceLink,
  ResourceNotes as ResourceNotesValue,
  ResourceOption,
  WeaponGearEntry,
} from "../../workspace.types";

type GearDraft =
  | (Omit<WeaponGearEntry, "id"> & { id?: string })
  | (Omit<ArmorGearEntry, "id"> & { id?: string });

interface GearCategoryProps {
  entries: GearEntry[];
  resources: ResourceOption[];
  onSave: (entry: GearEntry) => void;
  onDelete: (entryId: string) => void;
  onOpenResource: (resource: ResourceLink) => void;
}

function createGearDraft(kind: GearDraft["kind"]): GearDraft {
  const shared = {
    name: "",
    cost: "",
    notes: createEmptyResourceNotes(),
  };
  return kind === "weapon"
    ? {
        ...shared,
        kind,
        damage: { count: 1, die: "d6", modifier: 0 },
        damageType: "",
        range: { normal: 5, long: 5 },
      }
    : { ...shared, kind, armorClass: "" };
}

function GearCategory({
  entries,
  resources,
  onSave,
  onDelete,
  onOpenResource,
}: GearCategoryProps) {
  const [draft, setDraft] = useState<GearDraft>(() => createGearDraft("weapon"));
  const [formError, setFormError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const sortedEntries = [...entries].sort((a, b) => a.name.localeCompare(b.name));

  function changeKind(kind: GearDraft["kind"]) {
    setDraft((current) => ({
      ...createGearDraft(kind),
      id: current.id,
      name: current.name,
      cost: current.cost,
      notes: current.notes,
    }));
    setFormError("");
  }

  function updateNotes(notes: ResourceNotesValue) {
    setDraft((current) => ({ ...current, notes }));
  }

  function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setFormError("A name is required.");
      return;
    }

    onSave({
      ...draft,
      id: draft.id ?? crypto.randomUUID(),
      name,
      cost: draft.cost.trim(),
    });
    setDraft(createGearDraft(draft.kind));
    setFormError("");
    setIsFormOpen(false);
  }

  function editEntry(entry: GearEntry) {
    setDraft({ ...entry });
    setFormError("");
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setDraft(createGearDraft(draft.kind));
    setFormError("");
    setIsFormOpen(false);
  }

  function deleteEntry(entry: GearEntry) {
    if (window.confirm(`Delete ${entry.name} from gear?`)) {
      onDelete(entry.id);
      if (draft.id === entry.id) closeForm();
    }
  }

  return (
    <>
      {!isFormOpen ? (
        <AppButton className="primary-button" type="button" onClick={() => setIsFormOpen(true)}>
          ＋ Add gear
        </AppButton>
      ) : <form className="gear-form card" onSubmit={submitEntry}>
        <div className="form-heading">
          <div>
            <p className="eyebrow">{draft.id ? "EDIT GEAR" : "ADD TO GEAR"}</p>
            <h2>{draft.id ? `Edit ${draft.name}` : "New gear"}</h2>
          </div>
          <AppButton className="secondary-button" type="button" onClick={closeForm}>
            Cancel
          </AppButton>
        </div>

        <div className="form-grid form-grid-two">
          <NativeSelect
            className="form-field"
            label="Gear type"
            value={draft.kind}
            onChange={(event) => {
                if (event.currentTarget.value === "weapon" || event.currentTarget.value === "armor") {
                  changeKind(event.currentTarget.value);
                }
              }}
          >
              <option value="weapon">Weapon</option>
              <option value="armor">Armor</option>
          </NativeSelect>
          <TextInput
            className="form-field"
            label="Name *"
            value={draft.name}
            onChange={(event) => {
              setDraft((current) => ({ ...current, name: event.currentTarget.value }));
              setFormError("");
            }}
            placeholder="Name this gear"
            required
          />
          <TextInput
            className="form-field"
            label="Cost *"
            value={draft.cost}
            onChange={(event) => setDraft((current) => ({ ...current, cost: event.currentTarget.value }))}
            placeholder="e.g. 15 gp"
            required
          />

          {draft.kind === "weapon" ? (
            <>
              <div className="form-field gear-damage-field">
                <span>Damage</span>
                <DiceInput
                  value={draft.damage}
                  onChange={(damage) => setDraft((current) =>
                    current.kind === "weapon" ? { ...current, damage } : current,
                  )}
                />
              </div>
              <TextInput
                className="form-field"
                label="Damage type *"
                value={draft.damageType}
                onChange={(event) => setDraft((current) =>
                    current.kind === "weapon"
                      ? { ...current, damageType: event.currentTarget.value }
                      : current,
                  )}
                placeholder="e.g. slashing"
                required
              />
              <div className="form-field gear-range-fields">
                <span>Range (ft) *</span>
                <div className="gear-range-inputs">
                  <NumberInput
                    className="form-field"
                    label="Normal"
                    min={0}
                    step={1}
                    value={draft.range.normal}
                    onChange={(normal) => setDraft((current) =>
                        current.kind === "weapon"
                          ? {
                              ...current,
                              range: {
                                ...current.range,
                                normal: Number(normal) || 0,
                              },
                            }
                          : current,
                      )}
                    required
                  />
                  <NumberInput
                    className="form-field"
                    label="Long"
                    min={0}
                    step={1}
                    value={draft.range.long}
                    onChange={(long) => setDraft((current) =>
                        current.kind === "weapon"
                          ? {
                              ...current,
                              range: {
                                ...current.range,
                                long: Number(long) || 0,
                              },
                            }
                          : current,
                      )}
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <TextInput
              className="form-field"
              label="Armor class *"
              value={draft.armorClass}
              onChange={(event) => setDraft((current) =>
                  current.kind === "armor"
                    ? { ...current, armorClass: event.currentTarget.value }
                    : current,
                )}
              placeholder="e.g. 12 + Dex modifier"
              required
            />
          )}
        </div>

        <ResourceNotes
          value={draft.notes}
          resources={resources}
          onOpenResource={onOpenResource}
          onChange={updateNotes}
        />
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="form-submit-row">
          <AppButton className="primary-button" type="submit">
            {draft.id ? "Save changes" : "Add gear"}
          </AppButton>
        </div>
      </form>}

      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR GEAR</p>
          <h2>Saved gear</h2>
        </div>
      </div>

      {sortedEntries.length === 0 ? (
        <div className="empty-state card compact-empty">
          <h2>No gear yet</h2>
          <p>Add a weapon or armor to start your gear collection.</p>
        </div>
      ) : (
        <div className="simple-entry-list">
          {sortedEntries.map((entry) => (
            <article
              className="simple-entry-card card"
              key={entry.id}
              id={`resource-gear-${entry.id}`}
            >
              <div className="simple-entry-heading">
                <div>
                  <h3>{entry.name}</h3>
                  <p className="gear-kind">{entry.kind}</p>
                </div>
                <div className="monster-actions">
                  <AppButton className="secondary-button" type="button" onClick={() => editEntry(entry)}>Edit</AppButton>
                  <AppButton className="danger-text-button" type="button" onClick={() => deleteEntry(entry)}>Delete</AppButton>
                </div>
              </div>
              <div className="monster-summary">
                <span><strong>Cost</strong> {entry.cost}</span>
                {entry.kind === "weapon" ? (
                  <>
                    <span><strong>Damage</strong> {formatDiceExpression(entry.damage)} {entry.damageType}</span>
                    <span><strong>Range</strong> {entry.range.normal}/{entry.range.long} ft</span>
                  </>
                ) : (
                  <span><strong>AC</strong> {entry.armorClass}</span>
                )}
              </div>
              <ResourceNotes
                value={entry.notes}
                resources={resources}
                onOpenResource={onOpenResource}
              />
            </article>
          ))}
        </div>
      )}
    </>
  );
}

export default GearCategory;
