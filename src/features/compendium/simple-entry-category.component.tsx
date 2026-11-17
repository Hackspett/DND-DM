import { useEffect, useState, type FormEvent } from "react";
import { TextInput } from "@mantine/core";
import AppButton from "../../shared/app-button.component";
import ResourceNotes from "../../shared/resource-notes.component";
import { createEmptyResourceNotes } from "../../shared/resource-notes.utils";
import type {
  CompendiumCategory,
  CompendiumEntry,
  ResourceNavigation,
  ResourceNotes as ResourceNotesValue,
  ResourceOption,
} from "../../workspace.types";

interface SimpleEntryCategoryProps {
  category: CompendiumCategory;
  entries: CompendiumEntry[];
  resources: ResourceOption[];
  onSave: (category: CompendiumCategory, entry: CompendiumEntry) => void;
  onDelete: (category: CompendiumCategory, entryId: string) => void;
  onOpenResource: (resource: ResourceNavigation["resource"]) => void;
  resourceNavigation: ResourceNavigation | null;
  onFinishResourceNavigation: (requestId: string) => void;
}

export default function SimpleEntryCategory({
  category,
  entries,
  resources,
  onSave,
  onDelete,
  onOpenResource,
  resourceNavigation,
  onFinishResourceNavigation,
}: SimpleEntryCategoryProps) {
  const [draft, setDraft] = useState<{ id?: string; name: string; notes: ResourceNotesValue }>({
    name: "",
    notes: createEmptyResourceNotes(),
  });
  const [formError, setFormError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const singular = category === "items" ? "item" : "effect";
  const sortedEntries = [...entries].sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    const focus = resourceNavigation;
    const type = category === "items" ? "item" : "effect";
    if (focus?.resource.type !== type) return;
    document.getElementById(`resource-${type}-${focus.resource.id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    onFinishResourceNavigation(focus.requestId);
  }, [category, onFinishResourceNavigation, resourceNavigation]);

  function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setFormError("A name is required.");
      return;
    }

    onSave(category, {
      id: draft.id ?? crypto.randomUUID(),
      name,
      notes: draft.notes,
    });
    setDraft({ name: "", notes: createEmptyResourceNotes() });
    setFormError("");
    setIsFormOpen(false);
  }

  function editEntry(entry: CompendiumEntry) {
    setDraft({ ...entry });
    setFormError("");
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() {
    setDraft({ name: "", notes: createEmptyResourceNotes() });
    setFormError("");
    setIsFormOpen(false);
  }

  function deleteEntry(entry: CompendiumEntry) {
    if (window.confirm(`Delete ${entry.name} from ${category}?`)) {
      onDelete(category, entry.id);
      if (draft.id === entry.id) closeForm();
    }
  }

  return (
    <>
      {!isFormOpen ? (
        <AppButton className="primary-button" type="button" onClick={() => setIsFormOpen(true)}>
          ＋ Add {singular}
        </AppButton>
      ) : <form className="simple-entry-form card" onSubmit={submitEntry}>
        <div className="form-heading">
          <div>
            <p className="eyebrow">{draft.id ? `EDIT ${singular.toUpperCase()}` : `ADD TO ${category.toUpperCase()}`}</p>
            <h2>{draft.id ? `Edit ${draft.name}` : `New ${singular}`}</h2>
          </div>
          <AppButton className="secondary-button" type="button" onClick={closeForm}>
            Cancel
          </AppButton>
        </div>
        <TextInput
          className="form-field"
          label="Name *"
          value={draft.name}
          onChange={(event) => {
            setDraft((current) => ({ ...current, name: event.currentTarget.value }));
            setFormError("");
          }}
          placeholder={`Name this ${singular.toLowerCase()}`}
          required
        />
        <ResourceNotes
          value={draft.notes}
          resources={resources}
          onOpenResource={onOpenResource}
          onChange={(notes) => setDraft((current) => ({ ...current, notes }))}
        />
        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="form-submit-row">
          <AppButton className="primary-button" type="submit">{draft.id ? "Save changes" : `Add ${singular}`}</AppButton>
        </div>
      </form>}

      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR {category.toUpperCase()}</p>
          <h2>Saved {category}</h2>
        </div>
      </div>

      {sortedEntries.length === 0 ? (
        <div className="empty-state card compact-empty">
          <h2>No {category} yet</h2>
          <p>Add a name and optional notes to create your first {singular}.</p>
        </div>
      ) : (
        <div className="simple-entry-list">
          {sortedEntries.map((entry) => (
            <article
              className="simple-entry-card card"
              key={entry.id}
              id={`resource-${category === "items" ? "item" : "effect"}-${entry.id}`}
            >
              <div className="simple-entry-heading">
                <h3>{entry.name}</h3>
                <div className="monster-actions">
                  <AppButton className="secondary-button" type="button" onClick={() => editEntry(entry)}>Edit</AppButton>
                  <AppButton className="danger-text-button" type="button" onClick={() => deleteEntry(entry)}>Delete</AppButton>
                </div>
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

