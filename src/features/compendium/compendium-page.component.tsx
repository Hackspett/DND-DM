import { useEffect, useState, type FormEvent } from "react";
import { Accordion, TextInput } from "@mantine/core";
import AppButton from "../../shared/app-button.component";
import CreatureStatBlock from "../../shared/creature-stat-block.component";
import CreatureStatsFields from "../../shared/creature-stats-fields.component";
import { createEmptyCreatureStats } from "../../shared/creature-stats.utils";
import GearCategory from "./gear-category.component";
import SimpleEntryCategory from "./simple-entry-category.component";
import { MonsterSpellFields, SpellSlotFields } from "./spell-editor-fields.component";
import ImageUpload from "../../shared/image-upload.component";
import ProfileAvatar from "../../shared/profile-avatar.component";
import ResourceNotes from "../../shared/resource-notes.component";
import { createEmptyResourceNotes } from "../../shared/resource-notes.utils";
import {
  type CompendiumCategory,
  type CompendiumEntry,
  type CreatureStats,
  type GearEntry,
  type Monster,
  type ResourceNavigation,
  type ResourceNotes as ResourceNotesValue,
  type ResourceOption,
} from "../../workspace.types";

type MonsterDraft = Omit<Monster, "id"> & { id?: string };
type CompendiumTab = "monsters" | "gear" | CompendiumCategory;

interface CompendiumPageProps {
  monsters: Monster[];
  items: CompendiumEntry[];
  gear: GearEntry[];
  effects: CompendiumEntry[];
  resources: ResourceOption[];
  onSaveMonster: (monster: Monster) => void;
  onDeleteMonster: (monsterId: string) => void;
  onSaveEntry: (category: CompendiumCategory, entry: CompendiumEntry) => void;
  onDeleteEntry: (category: CompendiumCategory, entryId: string) => void;
  onSaveGear: (entry: GearEntry) => void;
  onDeleteGear: (entryId: string) => void;
  resourceNavigation: ResourceNavigation | null;
  onOpenResource: (resource: ResourceNavigation["resource"]) => void;
  onFinishResourceNavigation: (requestId: string) => void;
}

function createEmptyMonster(): MonsterDraft {
  return {
    name: "",
    ...createEmptyCreatureStats(),
    profileImageId: null,
    spellSlots: [],
    spells: [],
    notes: createEmptyResourceNotes(),
  };
}

function CompendiumPage({
  monsters,
  items,
  gear,
  effects,
  resources,
  onSaveMonster,
  onDeleteMonster,
  onSaveEntry,
  onDeleteEntry,
  onSaveGear,
  onDeleteGear,
  resourceNavigation,
  onOpenResource,
  onFinishResourceNavigation,
}: CompendiumPageProps) {
  const [category, setCategory] = useState<CompendiumTab>("monsters");
  const [draft, setDraft] = useState<MonsterDraft>(createEmptyMonster);
  const [isMonsterFormOpen, setIsMonsterFormOpen] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const type = resourceNavigation?.resource.type;
    if (type === "monster") setCategory("monsters");
    if (type === "item") setCategory("items");
    if (type === "gear") setCategory("gear");
    if (type === "effect") setCategory("effects");
  }, [resourceNavigation]);

  useEffect(() => {
    const focus = resourceNavigation;
    if (!focus) return;
    const categoryForType = focus.resource.type === "monster"
      ? "monsters"
      : focus.resource.type === "item"
        ? "items"
        : focus.resource.type === "gear"
          ? "gear"
          : focus.resource.type === "effect"
            ? "effects"
            : null;
    if (categoryForType && category === categoryForType) {
      document.getElementById(`resource-${focus.resource.type}-${focus.resource.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      onFinishResourceNavigation(focus.requestId);
    }
  }, [category, onFinishResourceNavigation, resourceNavigation]);

  function updateField<K extends keyof MonsterDraft>(
    key: K,
    value: MonsterDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateStatsField<K extends keyof CreatureStats>(
    key: K,
    value: CreatureStats[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submitMonster(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setFormError("A monster name is required.");
      return;
    }
    if (draft.spells.some((spell) => !spell.name.trim())) {
      setFormError("Give each spell a name or remove the empty spell.");
      return;
    }

    const { id, ...monsterData } = draft;
    onSaveMonster({
      ...monsterData,
      id: id ?? crypto.randomUUID(),
      name: draft.name.trim(),
      spells: draft.spells.map((spell) => ({
        ...spell,
        name: spell.name.trim(),
      })),
    });
    setDraft(createEmptyMonster());
    setFormError("");
    setIsMonsterFormOpen(false);
  }

  function editMonster(monster: Monster) {
    setDraft({ ...monster, abilityScores: { ...monster.abilityScores } });
    setFormError("");
    setIsMonsterFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeMonsterForm() {
    setDraft(createEmptyMonster());
    setFormError("");
    setIsMonsterFormOpen(false);
  }

  function deleteMonster(monster: Monster) {
    if (window.confirm(`Delete ${monster.name} from the compendium?`)) {
      onDeleteMonster(monster.id);
      if (draft.id === monster.id) closeMonsterForm();
    }
  }

  const sortedMonsters = [...monsters].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const categoryEntries = category === "items" ? items : effects;
  const categoryCount =
    category === "monsters"
      ? monsters.length
      : category === "gear"
        ? gear.length
        : categoryEntries.length;

  return (
    <section className="workspace-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">SHARED ACROSS ALL YOUR TABLES</p>
          <h1>Compendium</h1>
          <p className="page-lede">Keep monsters, items, gear, and effects together in one library.</p>
        </div>
        <span className="count-badge">{categoryCount} {categoryCount === 1 ? "entry" : "entries"}</span>
      </div>

      <nav className="compendium-tabs" aria-label="Compendium categories">
        {([
          ["monsters", "Monsters"],
          ["items", "Items"],
          ["gear", "Gear"],
          ["effects", "Effects"],
        ] as const).map(([key, label]) => (
          <AppButton
            className={`compendium-tab${category === key ? " active" : ""}`}
            type="button"
            key={key}
            onClick={() => setCategory(key)}
            aria-current={category === key ? "page" : undefined}
          >
            {label}
            <span className="compendium-tab-count">
              {key === "monsters"
                ? monsters.length
                : key === "items"
                  ? items.length
                  : key === "gear"
                    ? gear.length
                    : effects.length}
            </span>
          </AppButton>
        ))}
      </nav>

      {category === "monsters" ? (
        <>
      {!isMonsterFormOpen ? (
        <AppButton className="primary-button" type="button" onClick={() => setIsMonsterFormOpen(true)}>
          ＋ Add creature
        </AppButton>
      ) : <form className="monster-form card" onSubmit={submitMonster}>
        <div className="form-heading">
          <div>
            <p className="eyebrow">{draft.id ? "EDIT STAT BLOCK" : "ADD TO YOUR LIBRARY"}</p>
            <h2>{draft.id ? `Editing ${draft.name}` : "New creature"}</h2>
          </div>
          <AppButton className="secondary-button" type="button" onClick={closeMonsterForm}>
            Cancel
          </AppButton>
        </div>

        <div className="form-section">
          <h3>Identity</h3>
          <TextInput className="form-field" label="Name *" value={draft.name} onChange={(event) => updateField("name", event.currentTarget.value)} required />
          <ImageUpload
            imageId={draft.profileImageId}
            onChange={(imageId) => updateField("profileImageId", imageId)}
            label={draft.profileImageId ? "Change profile picture" : "Add profile picture"}
            variant="profile"
          />
        </div>
        <CreatureStatsFields
          stats={draft}
          onChange={updateStatsField}
        />
        <SpellSlotFields
          value={draft.spellSlots}
          onChange={(spellSlots) => updateField("spellSlots", spellSlots)}
        />
        <MonsterSpellFields
          value={draft.spells}
          onChange={(spells) => updateField("spells", spells)}
        />
        <ResourceNotes
          value={draft.notes}
          resources={resources}
          onOpenResource={onOpenResource}
          onChange={(notes) => updateField("notes", notes)}
        />

        {formError && <p className="form-error" role="alert">{formError}</p>}
        <div className="form-submit-row">
          <AppButton className="primary-button" type="submit">{draft.id ? "Save changes" : "Add to compendium"}</AppButton>
        </div>
      </form>}

      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR CREATURES</p>
          <h2>Saved stat blocks</h2>
        </div>
      </div>

      {sortedMonsters.length === 0 ? (
        <div className="empty-state card compact-empty">
          <h2>No creatures yet</h2>
          <p>Add your first creature to start building the compendium.</p>
        </div>
      ) : (
        <div className="monster-list">
          {sortedMonsters.map((monster) => (
            <article className="monster-card card" key={monster.id} id={`resource-monster-${monster.id}`}>
              <div className="monster-card-heading">
                <div className="monster-card-title">
                  <ProfileAvatar name={monster.name} imageId={monster.profileImageId} />
                  <div>
                  <h3>{monster.name}</h3>
                  <p>{monster.size} {monster.creatureType}{monster.alignment ? ` · ${monster.alignment}` : ""}</p>
                  </div>
                </div>
                <div className="monster-actions">
                  <AppButton className="secondary-button" type="button" onClick={() => editMonster(monster)}>Edit</AppButton>
                  <AppButton className="danger-text-button" type="button" onClick={() => deleteMonster(monster)}>Delete</AppButton>
                </div>
              </div>
              <div className="monster-summary">
                <span><strong>AC</strong> {monster.armorClass}</span>
                <span><strong>HP</strong> {monster.hitPoints}{monster.hitDice ? ` (${monster.hitDice})` : ""}</span>
                <span><strong>Speed</strong> {monster.speed || "—"}</span>
                <span><strong>CR</strong> {monster.challengeRating || "—"}</span>
                <span><strong>DEX mod</strong> {formatModifier(Math.floor((monster.abilityScores.DEX - 10) / 2))}</span>
              </div>
              <ResourceNotes
                value={monster.notes}
                resources={resources}
                onOpenResource={onOpenResource}
              />
              <Accordion className="stat-block-details" variant="default">
                <Accordion.Item value={monster.id}>
                  <Accordion.Control>Full stat block</Accordion.Control>
                  <Accordion.Panel>
                    <CreatureStatBlock
                      stats={monster}
                      spellSlots={monster.spellSlots}
                      spells={monster.spells}
                    />
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </article>
          ))}
        </div>
      )}
        </>
      ) : category === "gear" ? (
        <GearCategory
          entries={gear}
          resources={resources}
          onSave={onSaveGear}
          onDelete={onDeleteGear}
          onOpenResource={onOpenResource}
        />
      ) : (
        <SimpleEntryCategory
          key={category}
          category={category}
          entries={categoryEntries}
          resources={resources}
          onSave={onSaveEntry}
          onDelete={onDeleteEntry}
          onOpenResource={onOpenResource}
          resourceNavigation={resourceNavigation}
          onFinishResourceNavigation={onFinishResourceNavigation}
        />
      )}
    </section>
  );
}

function formatModifier(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

export default CompendiumPage;
