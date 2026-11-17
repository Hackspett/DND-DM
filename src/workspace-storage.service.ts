import { isWorkspaceData } from "./workspace.schema.js";
import type { WorkspaceData } from "./workspace.types.js";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const allowedImageMimeTypes: ReadonlySet<string> = new Set(IMAGE_MIME_TYPES);

async function responseError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }
  } catch {
    // Non-JSON errors still report their HTTP status.
  }
  return `Request failed (${response.status} ${response.statusText}).`;
}

export async function loadWorkspace(): Promise<WorkspaceData> {
  const response = await fetch("/api/workspace");
  if (!response.ok) {
    throw new Error(await responseError(response));
  }

  const body: unknown = await response.json();
  if (!isWorkspaceData(body)) {
    throw new Error("The local API returned workspace data in an invalid format.");
  }
  return body;
}

export async function uploadImage(file: File): Promise<string> {
  if (!allowedImageMimeTypes.has(file.type)) {
    throw new Error("Choose a JPEG, PNG, WebP, or GIF image.");
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error("Images must be 5 MB or smaller.");
  }

  const response = await fetch("/api/images", {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!response.ok) {
    throw new Error(await responseError(response));
  }
  const body: unknown = await response.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("id" in body) ||
    typeof body.id !== "string"
  ) {
    throw new Error("The local API returned an invalid image response.");
  }
  return body.id;
}

export function imageUrl(imageId: string): string {
  return `/api/images/${encodeURIComponent(imageId)}`;
}

let pendingSaves: Promise<void> = Promise.resolve();

export function saveWorkspace(data: WorkspaceData): Promise<void> {
  const save = pendingSaves.then(async () => {
    const response = await fetch("/api/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(await responseError(response));
    }
  });
  pendingSaves = save.then(
    () => undefined,
    () => undefined,
  );
  return save;
}
