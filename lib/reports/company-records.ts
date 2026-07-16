import "server-only";

import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { buildRoyalOSCompanyPdf, type RoyalOSCompanyPdfInput } from "@/lib/reports/pdf";
import { isRoyalOSToolsSupabaseConfigured, getRoyalOSToolsSupabaseClient } from "@/lib/tools/supabase";
import type { RoyalOSWorkspace } from "@/lib/missions/types";
import { createRoyalOSSignedUrl, readRoyalOSJson, usesSupabaseStorage, writeRoyalOSFile, writeRoyalOSJson } from "@/lib/storage/royalosStorage";

export type RoyalOSCompanyRecord = {
  recordId: string;
  title: string;
  workspace: RoyalOSWorkspace;
  employee: string;
  missionId?: string;
  conversationId?: string;
  tags: string[];
  sources: string[];
  storageMode: "supabase" | "local";
  storagePath: string;
  originalStoragePath: string;
  url: string;
  createdAt: string;
  sizeBytes: number;
  version: number;
};

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "company-report";
}

function localRecordRoot(): string {
  return path.join(process.cwd(), "public", "royalos-assets", "company-records");
}

function indexPath(): string {
  return path.join(process.cwd(), ".royalos-company-records", "index.json");
}

async function appendLocalIndex(record: RoyalOSCompanyRecord): Promise<void> {
  const filePath = indexPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  let records: RoyalOSCompanyRecord[] = [];
  try {
    records = JSON.parse(await fs.readFile(filePath, "utf8")) as RoyalOSCompanyRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const next = [record, ...records.filter((item) => item.recordId !== record.recordId)].slice(0, 5_000);
  const temporary = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await fs.rename(temporary, filePath);
}

async function saveLocally(input: {
  recordId: string;
  fileName: string;
  pdf: Uint8Array;
  original: Record<string, unknown>;
  workspace: RoyalOSWorkspace;
  employee: string;
  title: string;
  missionId?: string;
  conversationId?: string;
  tags: string[];
  sources: string[];
  createdAt: string;
}): Promise<RoyalOSCompanyRecord> {
  const date = input.createdAt.slice(0, 10);
  const workspaceSlug = slug(input.workspace);
  const relativeDirectory = path.join(workspaceSlug, date);
  const absoluteDirectory = path.join(localRecordRoot(), relativeDirectory);
  await fs.mkdir(absoluteDirectory, { recursive: true });

  const pdfPath = path.join(absoluteDirectory, input.fileName);
  const originalName = input.fileName.replace(/\.pdf$/i, ".json");
  const originalPath = path.join(absoluteDirectory, originalName);
  await fs.writeFile(pdfPath, input.pdf);
  await fs.writeFile(originalPath, `${JSON.stringify(input.original, null, 2)}\n`, "utf8");

  const publicPdfPath = `/royalos-assets/company-records/${relativeDirectory.replace(/\\/g, "/")}/${input.fileName}`;
  const record: RoyalOSCompanyRecord = {
    recordId: input.recordId,
    title: input.title,
    workspace: input.workspace,
    employee: input.employee,
    missionId: input.missionId,
    conversationId: input.conversationId,
    tags: input.tags,
    sources: input.sources,
    storageMode: "local",
    storagePath: publicPdfPath,
    originalStoragePath: `/royalos-assets/company-records/${relativeDirectory.replace(/\\/g, "/")}/${originalName}`,
    url: publicPdfPath,
    createdAt: input.createdAt,
    sizeBytes: input.pdf.byteLength,
    version: 1,
  };
  await appendLocalIndex(record);
  return record;
}

async function appendCloudIndex(record: RoyalOSCompanyRecord): Promise<void> {
  const index = "company-records/index.json";
  const records = await readRoyalOSJson<RoyalOSCompanyRecord[]>(index, []);
  const next = [record, ...records.filter((item) => item.recordId !== record.recordId)].slice(0, 5000);
  await writeRoyalOSJson(index, next);
}

async function saveToSupabase(input: {
  recordId: string;
  fileName: string;
  pdf: Uint8Array;
  original: Record<string, unknown>;
  workspace: RoyalOSWorkspace;
  employee: string;
  title: string;
  missionId?: string;
  conversationId?: string;
  tags: string[];
  sources: string[];
  createdAt: string;
}): Promise<RoyalOSCompanyRecord> {
  const basePath = `company-records/${slug(input.workspace)}/${input.createdAt.slice(0, 10)}/${input.recordId}`;
  const pdfPath = `${basePath}/${input.fileName}`;
  const originalPath = `${basePath}/${input.fileName.replace(/\.pdf$/i, ".json")}`;

  await writeRoyalOSFile({ path: pdfPath, data: input.pdf, contentType: "application/pdf", overwrite: false });
  await writeRoyalOSFile({ path: originalPath, data: JSON.stringify(input.original, null, 2), contentType: "application/json", overwrite: false });
  const url = await createRoyalOSSignedUrl(pdfPath, 60 * 60 * 24 * 7);

  const record: RoyalOSCompanyRecord = {
    recordId: input.recordId,
    title: input.title,
    workspace: input.workspace,
    employee: input.employee,
    missionId: input.missionId,
    conversationId: input.conversationId,
    tags: input.tags,
    sources: input.sources,
    storageMode: "supabase",
    storagePath: pdfPath,
    originalStoragePath: originalPath,
    url,
    createdAt: input.createdAt,
    sizeBytes: input.pdf.byteLength,
    version: 1,
  };
  await appendCloudIndex(record);

  if (isRoyalOSToolsSupabaseConfigured()) {
    try {
      const supabase = getRoyalOSToolsSupabaseClient();
      const bucket = process.env.ROYALOS_STORAGE_BUCKET?.trim() || "royalos-private";
      const databaseInsert = await supabase.from("royalos_company_records").insert({
        record_id: input.recordId,
        workspace: input.workspace,
        title: input.title,
        employee: input.employee,
        mission_id: input.missionId ?? null,
        conversation_id: input.conversationId ?? null,
        version: 1,
        storage_bucket: bucket,
        storage_path: pdfPath,
        original_storage_path: originalPath,
        mime_type: "application/pdf",
        size_bytes: input.pdf.byteLength,
        tags: input.tags,
        sources: input.sources,
        metadata: { generatedBy: "RoyalOS Save as Company PDF" },
      });
      if (databaseInsert.error) console.warn("RoyalOS company-record database row was not created; cloud index remains available.", databaseInsert.error);
    } catch (error) {
      console.warn("RoyalOS company-record database insert failed; cloud index remains available.", error);
    }
  }
  return record;
}

export async function createRoyalOSCompanyRecord(input: {
  title: string;
  workspace: RoyalOSWorkspace;
  employee: string;
  content: string;
  missionId?: string;
  conversationId?: string;
  sources?: string[];
  tags?: string[];
}): Promise<RoyalOSCompanyRecord> {
  const createdAt = new Date().toISOString();
  const recordId = `company_record_${randomUUID()}`;
  const fileName = `${slug(input.title)}-${createdAt.slice(0, 10)}.pdf`;
  const tags = Array.from(new Set(input.tags ?? [])).slice(0, 20);
  const sources = Array.from(new Set(input.sources ?? [])).slice(0, 50);
  const pdfInput: RoyalOSCompanyPdfInput = {
    title: input.title,
    workspace: input.workspace,
    employee: input.employee,
    content: input.content,
    createdAt,
    missionId: input.missionId,
    conversationId: input.conversationId,
    tags,
    sources,
  };
  const pdf = buildRoyalOSCompanyPdf(pdfInput);
  const original = { ...pdfInput, recordId, version: 1 };
  const values = {
    recordId,
    fileName,
    pdf,
    original,
    workspace: input.workspace,
    employee: input.employee,
    title: input.title,
    missionId: input.missionId,
    conversationId: input.conversationId,
    tags,
    sources,
    createdAt,
  };

  if (usesSupabaseStorage()) return saveToSupabase(values);
  return saveLocally(values);
}

export async function listRoyalOSLocalCompanyRecords(limit = 100): Promise<RoyalOSCompanyRecord[]> {
  try {
    const records = JSON.parse(await fs.readFile(indexPath(), "utf8")) as RoyalOSCompanyRecord[];
    return records.slice(0, Math.max(1, Math.min(limit, 500)));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function listRoyalOSCompanyRecords(limit = 100): Promise<RoyalOSCompanyRecord[]> {
  const safeLimit = Math.max(1, Math.min(limit, 500));
  if (usesSupabaseStorage()) {
    const indexed = await readRoyalOSJson<RoyalOSCompanyRecord[]>("company-records/index.json", []);
    const refreshed: RoyalOSCompanyRecord[] = [];
    for (const record of indexed.slice(0, safeLimit)) {
      try { refreshed.push({ ...record, url: await createRoyalOSSignedUrl(record.storagePath, 3600) }); }
      catch { refreshed.push(record); }
    }
    return refreshed;
  }
  if (isRoyalOSToolsSupabaseConfigured()) {
    try {
      const supabase = getRoyalOSToolsSupabaseClient();
      const { data, error } = await supabase
        .from("royalos_company_records")
        .select("record_id,title,workspace,employee,mission_id,conversation_id,tags,sources,storage_bucket,storage_path,original_storage_path,created_at,size_bytes,version")
        .order("created_at", { ascending: false })
        .limit(safeLimit);
      if (error) throw error;

      const records: RoyalOSCompanyRecord[] = [];
      for (const row of data ?? []) {
        const signed = await supabase.storage
          .from(row.storage_bucket || "royalos-assets")
          .createSignedUrl(row.storage_path, 60 * 60);
        records.push({
          recordId: row.record_id,
          title: row.title,
          workspace: row.workspace,
          employee: row.employee,
          missionId: row.mission_id ?? undefined,
          conversationId: row.conversation_id ?? undefined,
          tags: Array.isArray(row.tags) ? row.tags : [],
          sources: Array.isArray(row.sources) ? row.sources : [],
          storageMode: "supabase",
          storagePath: row.storage_path,
          originalStoragePath: row.original_storage_path,
          url: signed.data?.signedUrl ?? "",
          createdAt: row.created_at,
          sizeBytes: Number(row.size_bytes) || 0,
          version: Number(row.version) || 1,
        });
      }
      return records;
    } catch (error) {
      console.warn("RoyalOS could not list Supabase company records; using the local index.", error);
    }
  }
  return listRoyalOSLocalCompanyRecords(safeLimit);
}
