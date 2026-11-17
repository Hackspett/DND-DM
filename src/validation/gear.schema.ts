import type { GearEntry } from "../workspace.types.js";
import { isDiceExpression } from "../shared/dice.utils.js";
import { isResourceNotes } from "../shared/resource-notes.utils.js";
import { isRecord } from "./primitives.utils.js";

export function isGearEntry(value: unknown): value is GearEntry {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.cost !== "string" ||
    !isResourceNotes(value.notes)
  ) {
    return false;
  }
  if (value.kind === "weapon") {
    const range = value.range;
    return (
      isDiceExpression(value.damage) &&
      typeof value.damageType === "string" &&
      isRecord(range) &&
      typeof range.normal === "number" &&
      Number.isSafeInteger(range.normal) &&
      range.normal >= 0 &&
      typeof range.long === "number" &&
      Number.isSafeInteger(range.long) &&
      range.long >= 0
    );
  }
  return value.kind === "armor" && typeof value.armorClass === "string";
}

