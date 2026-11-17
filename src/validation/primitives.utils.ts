export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isOptionalImageId(value: unknown): value is string | null {
  return value === null || (typeof value === "string" && value.length > 0);
}
