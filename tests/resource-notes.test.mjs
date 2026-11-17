import assert from "node:assert/strict";
import test from "node:test";
import { parseStoredResourceNotes } from "../src/shared/resource-notes.utils.ts";

test("adds an empty image list when reading earlier structured notes", () => {
  const notes = {
    text: "See the goblin.",
    links: [{
      type: "monster",
      id: "monster-1",
      campaignId: null,
      label: "Goblin",
    }],
  };

  assert.deepEqual(parseStoredResourceNotes(JSON.stringify(notes), "notes"), {
    ...notes,
    images: [],
  });
});

test("preserves plain-text notes while adding an empty image list", () => {
  assert.deepEqual(parseStoredResourceNotes("Old notes", "notes"), {
    text: "Old notes",
    links: [],
    images: [],
  });
});
