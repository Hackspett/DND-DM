import type { DiceExpression, DndDie } from "../workspace.types.js";

export const DND_DICE: readonly DndDie[] = [
  "d4",
  "d6",
  "d8",
  "d10",
  "d12",
  "d20",
];

export function isDiceExpression(value: unknown): value is DiceExpression {
  return (
    typeof value === "object" &&
    value !== null &&
    "count" in value &&
    typeof value.count === "number" &&
    Number.isSafeInteger(value.count) &&
    value.count > 0 &&
    "die" in value &&
    typeof value.die === "string" &&
    DND_DICE.some((die) => die === value.die) &&
    "modifier" in value &&
    typeof value.modifier === "number" &&
    Number.isSafeInteger(value.modifier)
  );
}

export function formatDiceExpression(value: DiceExpression): string {
  if (value.modifier === 0) return `${value.count}${value.die}`;
  const sign = value.modifier > 0 ? "+" : "-";
  return `${value.count}${value.die} ${sign} ${Math.abs(value.modifier)}`;
}
