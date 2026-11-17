import type { NoteImage, ResourceLink, ResourceNotes, ResourceType } from "../workspace.types.js";

const resourceTypes: readonly string[] = [
  "campaign",
  "player",
  "npc",
  "location",
  "battle",
  "monster",
  "item",
  "gear",
  "effect",
];

export function createEmptyResourceNotes(): ResourceNotes {
  return { text: "", links: [], images: [] };
}

function isNoteImage(value: unknown): value is NoteImage {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    "altText" in value &&
    typeof value.altText === "string"
  );
}

export function isResourceLink(value: unknown): value is ResourceLink {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "string" &&
    resourceTypes.includes(value.type) &&
    "id" in value &&
    typeof value.id === "string" &&
    "campaignId" in value &&
    (value.campaignId === null || typeof value.campaignId === "string") &&
    "label" in value &&
    typeof value.label === "string"
  );
}

export function isResourceNotes(value: unknown): value is ResourceNotes {
  return (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof value.text === "string" &&
    "links" in value &&
    Array.isArray(value.links) &&
    value.links.every(isResourceLink) &&
    "images" in value &&
    Array.isArray(value.images) &&
    value.images.every(isNoteImage)
  );
}

function isPreviousResourceNotes(
  value: unknown,
): value is Pick<ResourceNotes, "text" | "links"> {
  return (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof value.text === "string" &&
    "links" in value &&
    Array.isArray(value.links) &&
    value.links.every(isResourceLink)
  );
}

function normalizeParsedNotes(value: unknown): ResourceNotes | undefined {
  if (isResourceNotes(value)) return value;
  if (isPreviousResourceNotes(value)) {
    return { text: value.text, links: value.links, images: [] };
  }
  return undefined;
}

export function parseStoredResourceNotes(
  value: unknown,
  description: string,
): ResourceNotes {
  if (value === null || value === undefined) {
    return createEmptyResourceNotes();
  }
  if (typeof value !== "string") {
    const notes = normalizeParsedNotes(value);
    if (notes) return notes;
    throw new Error(`The database contains invalid ${description} data.`);
  }
  try {
    const parsed: unknown = JSON.parse(value);
    const notes = normalizeParsedNotes(parsed);
    if (notes) return notes;
  } catch {
    // Older versions stored notes as plain text.
  }
  return { text: value, links: [], images: [] };
}

export function serializeResourceNotes(notes: ResourceNotes): string {
  return JSON.stringify(notes);
}
