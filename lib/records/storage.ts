import "server-only";

import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  createRoyalOSSignedUrl,
  deleteRoyalOSFiles,
  readRoyalOSFile,
  readRoyalOSJson,
  usesSupabaseStorage,
  writeRoyalOSFile,
  writeRoyalOSJson,
} from "@/lib/storage/royalosStorage";

export type RecordItem = {
  id: string;
  name: string;
  type: "folder" | "document" | "file";
  parentId: string | null;
  mimeType?: string;
  storedName?: string;
  storagePath?: string;
  sizeBytes?: number;
  content?: string;
  tags: string[];
  status: "active" | "trash";
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  versions?: Array<{ id: string; content: string; createdAt: string }>;
};

const INDEX_PATH = "data/records/index.json";
const FILES_PREFIX = "company-records/files";
const DEFAULT_FOLDERS = ["01 Income", "02 Expenses", "03 Receipts", "04 Invoices", "05 Banking", "06 Contracts", "07 Taxes", "08 Reports", "09 Audit History"];

function seedItems(): RecordItem[] {
  const now = new Date().toISOString();
  return DEFAULT_FOLDERS.map((name) => ({ id: randomUUID(), name, type: "folder", parentId: null, tags: [], status: "active", createdAt: now, updatedAt: now }));
}

async function read(): Promise<RecordItem[]> {
  const items = await readRoyalOSJson<RecordItem[]>(INDEX_PATH, []);
  if (Array.isArray(items) && items.length) return items;
  const seeded = seedItems();
  await writeRoyalOSJson(INDEX_PATH, seeded);
  return seeded;
}

async function write(items: RecordItem[]) {
  await writeRoyalOSJson(INDEX_PATH, items);
}

export async function listRecordItems(parentId: string | null, status: "active" | "trash" = "active", query = "") {
  const items = await read();
  const q = query.trim().toLowerCase();
  return items
    .filter((item) => item.status === status && (status === "trash" || item.parentId === parentId) && (!q || item.name.toLowerCase().includes(q) || item.tags.some((tag) => tag.toLowerCase().includes(q))))
    .sort((a, b) => a.type === b.type ? b.updatedAt.localeCompare(a.updatedAt) : a.type === "folder" ? -1 : 1);
}

export async function getRecordItem(id: string) {
  return (await read()).find((item) => item.id === id);
}

export async function createFolder(name: string, parentId: string | null) {
  const items = await read();
  const now = new Date().toISOString();
  const item: RecordItem = { id: randomUUID(), name: name.trim(), type: "folder", parentId, tags: [], status: "active", createdAt: now, updatedAt: now };
  await write([item, ...items]);
  return item;
}

export async function createDocument(name: string, parentId: string | null, content = "") {
  const items = await read();
  const now = new Date().toISOString();
  const item: RecordItem = { id: randomUUID(), name: name.trim(), type: "document", parentId, content, tags: [], status: "active", createdAt: now, updatedAt: now, versions: [] };
  await write([item, ...items]);
  return item;
}

export async function uploadRecordFile(file: File, parentId: string | null) {
  const items = await read();
  const now = new Date().toISOString();
  const ext = path.extname(file.name).slice(0, 20);
  const storedName = `${Date.now()}-${randomUUID()}${ext}`;
  const storagePath = `${FILES_PREFIX}/${storedName}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeRoyalOSFile({ path: storagePath, data: bytes, contentType: file.type || "application/octet-stream", overwrite: false });
  const item: RecordItem = {
    id: randomUUID(), name: file.name, type: "file", parentId,
    mimeType: file.type || "application/octet-stream", storedName, storagePath,
    sizeBytes: bytes.length, tags: [], status: "active", createdAt: now, updatedAt: now,
  };
  await write([item, ...items]);
  return item;
}

export async function updateRecordItem(id: string, changes: { name?: string; parentId?: string | null; content?: string; tags?: string[]; action?: "trash" | "restore" }) {
  const items = await read();
  let updated: RecordItem | undefined;
  const now = new Date().toISOString();
  const next = items.map((item) => {
    if (item.id !== id) return item;
    const versions = changes.content !== undefined && item.type === "document" && item.content !== changes.content
      ? [...(item.versions ?? []), { id: randomUUID(), content: item.content ?? "", createdAt: item.updatedAt }].slice(-25)
      : item.versions;
    updated = {
      ...item,
      ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
      ...(changes.parentId !== undefined ? { parentId: changes.parentId } : {}),
      ...(changes.content !== undefined ? { content: changes.content, versions } : {}),
      ...(changes.tags ? { tags: changes.tags } : {}),
      ...(changes.action === "trash" ? { status: "trash" as const, deletedAt: now } : changes.action === "restore" ? { status: "active" as const, deletedAt: null } : {}),
      updatedAt: now,
    };
    return updated;
  });
  if (!updated) throw new Error("Record item not found.");
  await write(next);
  return updated;
}

export async function deleteRecordItem(id: string) {
  const items = await read();
  const target = items.find((item) => item.id === id);
  if (!target) throw new Error("Record item not found.");
  const descendants = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items) {
      if (item.parentId && descendants.has(item.parentId) && !descendants.has(item.id)) {
        descendants.add(item.id);
        changed = true;
      }
    }
  }
  const paths = items.filter((item) => descendants.has(item.id)).flatMap((item) => item.storagePath ? [item.storagePath] : item.storedName ? [`${FILES_PREFIX}/${item.storedName}`] : []);
  await deleteRoyalOSFiles(paths);
  await write(items.filter((item) => !descendants.has(item.id)));
}

export async function readRecordFile(item: RecordItem): Promise<Buffer> {
  const storagePath = item.storagePath || (item.storedName ? `${FILES_PREFIX}/${item.storedName}` : "");
  if (!storagePath) throw new Error("Record file does not have a storage path.");
  return readRoyalOSFile(storagePath);
}

export async function recordFileUrl(item: RecordItem): Promise<string | null> {
  const storagePath = item.storagePath || (item.storedName ? `${FILES_PREFIX}/${item.storedName}` : "");
  if (!storagePath) return null;
  return usesSupabaseStorage() ? createRoyalOSSignedUrl(storagePath, 3600) : `/api/records/file?id=${encodeURIComponent(item.id)}`;
}
