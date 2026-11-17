import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";
import {
  closeDatabase,
  databaseFile,
  deleteNote,
  hasCampaign,
  listNotes,
  readImage,
  readWorkspace,
  saveNote,
  saveWorkspace,
  storeImage,
} from "./database.service.js";
import { isRecord, isWorkspaceData } from "../src/workspace.schema.js";
import type { Note } from "../src/workspace.types.js";

class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

interface NoteInput {
  campaignId: string | null;
  title: string;
  content: string;
}

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port.");
}

const distDirectory = resolve(process.cwd(), "dist");
const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};
const maxRequestBytes = 10 * 1024 * 1024;
const maxImageBytes = 5 * 1024 * 1024;
const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let byteLength = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;
    if (byteLength > maxRequestBytes) {
      throw new HttpError(413, "Request body exceeds the 10 MB limit.");
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    throw new HttpError(400, "A JSON request body is required.");
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new HttpError(400, "Request body must contain valid JSON.");
  }
}

async function readImageBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let byteLength = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;
    if (byteLength > maxImageBytes) {
      throw new HttpError(413, "Images must be 5 MB or smaller.");
    }
    chunks.push(buffer);
  }
  if (byteLength === 0) throw new HttpError(400, "An image body is required.");
  return Buffer.concat(chunks);
}

function matchesImageSignature(mimeType: string, data: Buffer): boolean {
  switch (mimeType) {
    case "image/jpeg":
      return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    case "image/png":
      return data.length >= 8 && data.subarray(0, 8).equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
    case "image/webp":
      return data.length >= 12 &&
        data.toString("ascii", 0, 4) === "RIFF" &&
        data.toString("ascii", 8, 12) === "WEBP";
    case "image/gif":
      return data.length >= 6 &&
        ["GIF87a", "GIF89a"].includes(data.toString("ascii", 0, 6));
    default:
      return false;
  }
}

function isNoteInput(value: unknown): value is NoteInput {
  return (
    isRecord(value) &&
    (value.campaignId === null || typeof value.campaignId === "string") &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.content === "string"
  );
}

async function handleApi(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
): Promise<boolean> {
  if (url.pathname === "/api/health" && request.method === "GET") {
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (url.pathname === "/api/workspace" && request.method === "GET") {
    sendJson(response, 200, readWorkspace());
    return true;
  }

  if (url.pathname === "/api/workspace" && request.method === "PUT") {
    const body = await readJson(request);
    if (!isWorkspaceData(body)) {
      throw new HttpError(400, "Workspace data has an invalid format.");
    }
    saveWorkspace(body);
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (url.pathname === "/api/images" && request.method === "POST") {
    const mimeType = request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase();
    if (!mimeType || !imageMimeTypes.has(mimeType)) {
      throw new HttpError(415, "Choose a JPEG, PNG, WebP, or GIF image.");
    }
    const data = await readImageBody(request);
    if (!matchesImageSignature(mimeType, data)) {
      throw new HttpError(400, "The image data does not match its file type.");
    }
    const id = crypto.randomUUID();
    storeImage(id, mimeType, data);
    sendJson(response, 201, { id });
    return true;
  }

  const imageMatch = url.pathname.match(/^\/api\/images\/([0-9a-f-]{36})$/i);
  if (imageMatch && request.method === "GET") {
    const image = readImage(imageMatch[1]);
    if (!image) throw new HttpError(404, "Image not found.");
    response.writeHead(200, {
      "Content-Type": image.mimeType,
      "Content-Length": image.data.byteLength,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=31536000, immutable",
    });
    response.end(image.data);
    return true;
  }

  if (url.pathname === "/api/notes" && request.method === "GET") {
    const campaignId = url.searchParams.get("campaignId") ?? undefined;
    sendJson(response, 200, listNotes(campaignId));
    return true;
  }

  if (url.pathname === "/api/notes" && request.method === "POST") {
    const body = await readJson(request);
    if (!isNoteInput(body)) {
      throw new HttpError(400, "A note title and content are required.");
    }
    if (body.campaignId && !hasCampaign(body.campaignId)) {
      throw new HttpError(400, "The selected campaign does not exist.");
    }
    const note: Pick<Note, "id" | "campaignId" | "title" | "content"> = {
      id: crypto.randomUUID(),
      ...body,
      title: body.title.trim(),
    };
    sendJson(response, 201, saveNote(note));
    return true;
  }

  const noteMatch = url.pathname.match(/^\/api\/notes\/([^/]+)$/);
  if (noteMatch && request.method === "PUT") {
    const body = await readJson(request);
    if (!isNoteInput(body)) {
      throw new HttpError(400, "A note title and content are required.");
    }
    if (body.campaignId && !hasCampaign(body.campaignId)) {
      throw new HttpError(400, "The selected campaign does not exist.");
    }
    const note: Pick<Note, "id" | "campaignId" | "title" | "content"> = {
      id: decodeURIComponent(noteMatch[1]),
      ...body,
      title: body.title.trim(),
    };
    sendJson(response, 200, saveNote(note));
    return true;
  }

  if (noteMatch && request.method === "DELETE") {
    const deleted = deleteNote(decodeURIComponent(noteMatch[1]));
    if (!deleted) throw new HttpError(404, "Note not found.");
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (url.pathname.startsWith("/api/")) {
    throw new HttpError(404, "API endpoint not found.");
  }

  return false;
}

async function serveStatic(
  pathname: string,
  response: ServerResponse,
): Promise<void> {
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    throw new HttpError(400, "Invalid URL path.");
  }

  const requestedPath = resolve(distDirectory, `.${decodedPath}`);
  if (
    requestedPath !== distDirectory &&
    !requestedPath.startsWith(`${distDirectory}${sep}`)
  ) {
    throw new HttpError(400, "Invalid URL path.");
  }

  let fileInfo = await statIfPresent(requestedPath);
  let filePath = requestedPath;
  if (!fileInfo || !fileInfo.isFile()) {
    if (extname(requestedPath)) throw new HttpError(404, "File not found.");
    filePath = resolve(distDirectory, "index.html");
    fileInfo = await statIfPresent(filePath);
  }

  if (!fileInfo?.isFile()) {
    throw new HttpError(404, "Built app not found. Run npm run build.");
  }
  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream",
    "Content-Length": fileInfo.size,
  });
  const fileStream = createReadStream(filePath);
  fileStream.on("error", (error) => {
    console.error("Could not read a built app file.", error);
    response.destroy(error);
  });
  fileStream.pipe(response);
}

async function statIfPresent(path: string) {
  try {
    return await stat(path);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return undefined;
    }
    throw error;
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (await handleApi(request, response, url)) return;
    await serveStatic(url.pathname, response);
  } catch (error) {
    if (error instanceof HttpError) {
      sendJson(response, error.statusCode, { error: error.message });
      return;
    }
    console.error("Local API request failed.", error);
    sendJson(response, 500, { error: "The local server could not complete the request." });
  }
});

server.on("error", (error) => {
  console.error("Could not start the local server.", error);
  closeDatabase();
  process.exitCode = 1;
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Hearthside server listening at http://127.0.0.1:${port}`);
  console.log(`SQLite database: ${databaseFile}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => {
      closeDatabase();
      process.exit(0);
    });
  });
}
