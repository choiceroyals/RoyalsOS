import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export type RoyalOSStorageDriver = "local" | "supabase";

export function getRoyalOSStorageDriver(): RoyalOSStorageDriver {
  const configured = process.env.ROYALOS_STORAGE_DRIVER?.trim().toLowerCase();
  if (configured === "supabase") return "supabase";
  return "local";
}

export function usesSupabaseStorage(): boolean {
  return getRoyalOSStorageDriver() === "supabase";
}

export function getRoyalOSStorageBucket(): string {
  return process.env.ROYALOS_STORAGE_BUCKET?.trim() || "royalos-private";
}

export function normalizeRoyalOSStoragePath(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
  if (!normalized || normalized === ".." || normalized.includes("../") || normalized.includes("\0")) {
    throw new Error("Invalid RoyalOS storage path.");
  }
  return normalized;
}

function localAbsolutePath(storagePath: string): string {
  const safe = normalizeRoyalOSStoragePath(storagePath);
  const root = path.resolve(process.cwd());
  const absolute = path.resolve(root, safe);
  if (!absolute.startsWith(root + path.sep) && absolute !== root) throw new Error("Unsafe local storage path.");
  return absolute;
}

export async function writeRoyalOSFile(options: {
  path: string;
  data: Buffer | Uint8Array | ArrayBuffer | string;
  contentType?: string;
  overwrite?: boolean;
}): Promise<string> {
  const storagePath = normalizeRoyalOSStoragePath(options.path);
  const bytes = typeof options.data === "string" ? Buffer.from(options.data, "utf8") : Buffer.from(options.data as ArrayBufferLike);

  if (!usesSupabaseStorage()) {
    const absolute = localAbsolutePath(storagePath);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    if (options.overwrite === false) {
      try { await fs.access(absolute); throw new Error(`File already exists: ${storagePath}`); } catch (error) {
        if (error instanceof Error && error.message.startsWith("File already exists")) throw error;
      }
    }
    const temporary = `${absolute}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(temporary, bytes);
    await fs.rename(temporary, absolute);
    return storagePath;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.storage.from(getRoyalOSStorageBucket()).upload(storagePath, bytes, {
    contentType: options.contentType,
    upsert: options.overwrite ?? true,
    cacheControl: "3600",
  });
  if (error) throw new Error(`RoyalOS cloud upload failed: ${error.message}`);
  return storagePath;
}

export async function readRoyalOSFile(storagePath: string): Promise<Buffer> {
  const safe = normalizeRoyalOSStoragePath(storagePath);
  if (!usesSupabaseStorage()) return fs.readFile(localAbsolutePath(safe));
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(getRoyalOSStorageBucket()).download(safe);
  if (error || !data) throw new Error(`RoyalOS cloud download failed: ${error?.message || "No file returned."}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function readRoyalOSJson<T>(storagePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readRoyalOSFile(storagePath);
    return JSON.parse(raw.toString("utf8")) as T;
  } catch {
    return fallback;
  }
}

export async function writeRoyalOSJson(storagePath: string, value: unknown): Promise<string> {
  return writeRoyalOSFile({
    path: storagePath,
    data: `${JSON.stringify(value, null, 2)}\n`,
    contentType: "application/json",
    overwrite: true,
  });
}

export async function deleteRoyalOSFiles(paths: string[]): Promise<void> {
  const safe = paths.map(normalizeRoyalOSStoragePath);
  if (!safe.length) return;
  if (!usesSupabaseStorage()) {
    await Promise.all(safe.map(async (item) => { try { await fs.rm(localAbsolutePath(item), { recursive: true, force: true }); } catch {} }));
    return;
  }
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.storage.from(getRoyalOSStorageBucket()).remove(safe);
  if (error) throw new Error(`RoyalOS cloud deletion failed: ${error.message}`);
}

export async function createRoyalOSSignedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
  const safe = normalizeRoyalOSStoragePath(storagePath);
  if (!usesSupabaseStorage()) return `/${safe.replace(/^public\//, "")}`;
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.storage.from(getRoyalOSStorageBucket()).createSignedUrl(safe, expiresInSeconds);
  if (error) throw new Error(`RoyalOS signed URL failed: ${error.message}`);
  return data.signedUrl;
}
