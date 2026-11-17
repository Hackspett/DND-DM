import type { CurrentBattle } from "../workspace.types.js";
import { isResourceNotes } from "../shared/resource-notes.utils.js";
import { isRecord } from "./primitives.utils.js";

export function isCurrentBattle(value: unknown): value is CurrentBattle {
  if (
    !isRecord(value) ||
    typeof value.campaignId !== "string" ||
    typeof value.name !== "string" ||
    !(value.setup === null || isRecord(value.setup))
  ) {
    return false;
  }
  if (value.setup === null) return true;

  const setup = value.setup;
  return (
    Array.isArray(setup.playerIds) &&
    setup.playerIds.every((id) => typeof id === "string") &&
    Array.isArray(setup.enemies) &&
    setup.enemies.every(
      (enemy) =>
        isRecord(enemy) &&
        typeof enemy.monsterId === "string" &&
        typeof enemy.count === "number" &&
        Number.isSafeInteger(enemy.count) &&
        enemy.count > 0,
    ) &&
    isResourceNotes(setup.notes) &&
    isRecord(setup.playerInitiatives) &&
    Object.values(setup.playerInitiatives).every(
      (initiative) => typeof initiative === "string",
    )
  );
}

