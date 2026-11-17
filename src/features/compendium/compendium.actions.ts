import type { CompendiumCategory, CompendiumEntry, GearEntry, Monster } from "../../workspace.types";
import type { Dispatch, SetStateAction } from "react";

export function createCompendiumActions({
  setMonsters,
  setItems,
  setGear,
  setEffects,
}: {
  setMonsters: Dispatch<SetStateAction<Monster[]>>;
  setItems: Dispatch<SetStateAction<CompendiumEntry[]>>;
  setGear: Dispatch<SetStateAction<GearEntry[]>>;
  setEffects: Dispatch<SetStateAction<CompendiumEntry[]>>;
}) {
  function saveMonster(monster: Monster) {
    setMonsters((current) =>
      [...current.filter((item) => item.id !== monster.id), monster].sort(
        (a, b) => a.name.localeCompare(b.name),
      ),
    );
  }

  function deleteMonster(monsterId: string) {
    setMonsters((current) => current.filter((monster) => monster.id !== monsterId));
  }

  function saveCompendiumEntry(
    category: CompendiumCategory,
    entry: CompendiumEntry,
  ) {
    const updateEntries = (current: CompendiumEntry[]) =>
      [...current.filter((item) => item.id !== entry.id), entry].sort(
        (a, b) => a.name.localeCompare(b.name),
      );
    if (category === "items") {
      setItems(updateEntries);
    } else {
      setEffects(updateEntries);
    }
  }

  function deleteCompendiumEntry(
    category: CompendiumCategory,
    entryId: string,
  ) {
    if (category === "items") {
      setItems((current) => current.filter((entry) => entry.id !== entryId));
    } else {
      setEffects((current) => current.filter((entry) => entry.id !== entryId));
    }
  }

  function saveGearEntry(entry: GearEntry) {
    setGear((current) =>
      [...current.filter((item) => item.id !== entry.id), entry].sort(
        (a, b) => a.name.localeCompare(b.name),
      ),
    );
  }

  function deleteGearEntry(entryId: string) {
    setGear((current) => current.filter((entry) => entry.id !== entryId));
  }

  return {
    saveMonster,
    deleteMonster,
    saveCompendiumEntry,
    deleteCompendiumEntry,
    saveGearEntry,
    deleteGearEntry,
  };
}
