import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

export type RoyalAssetKind =
  | "image"
  | "document"
  | "audio"
  | "video"
  | "other";

export type RoyalAssetSource =
  | "upload"
  | "generated";

export type RoyalAssetRecord = {
  id: string;
  title: string;
  fileName: string;
  originalFileName: string;
  kind: RoyalAssetKind;
  source: RoyalAssetSource;
  mimeType: string;
  sizeBytes: number;
  publicUrl: string;
  relativePath: string;
  prompt?: string | null;
  createdAt: string;
};

const ASSET_ROOT = path.join(
  process.cwd(),
  "public",
  "royalos-assets"
);

const UPLOADS_DIR = path.join(
  ASSET_ROOT,
  "uploads"
);

const GENERATED_DIR = path.join(
  ASSET_ROOT,
  "generated"
);

const INDEX_PATH = path.join(
  ASSET_ROOT,
  "index.json"
);

async function ensureAssetDirectories() {
  await fs.mkdir(UPLOADS_DIR, {
    recursive: true,
  });

  await fs.mkdir(GENERATED_DIR, {
    recursive: true,
  });

  try {
    await fs.access(INDEX_PATH);
  } catch {
    await fs.writeFile(
      INDEX_PATH,
      JSON.stringify([], null, 2),
      "utf8"
    );
  }
}

async function readIndex(): Promise<RoyalAssetRecord[]> {
  await ensureAssetDirectories();

  try {
    const raw = await fs.readFile(
      INDEX_PATH,
      "utf8"
    );

    const parsed =
      JSON.parse(raw) as RoyalAssetRecord[];

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

async function writeIndex(
  assets: RoyalAssetRecord[]
) {
  await ensureAssetDirectories();

  await fs.writeFile(
    INDEX_PATH,
    JSON.stringify(assets, null, 2),
    "utf8"
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function detectKind(
  mimeType: string,
  fileName: string
): RoyalAssetKind {
  if (
    mimeType.startsWith("image/") ||
    /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(
      fileName
    )
  ) {
    return "image";
  }

  if (
    mimeType.startsWith("audio/") ||
    /\.(mp3|wav|m4a|aac)$/i.test(fileName)
  ) {
    return "audio";
  }

  if (
    mimeType.startsWith("video/") ||
    /\.(mp4|mov|avi|webm)$/i.test(fileName)
  ) {
    return "video";
  }

  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("sheet") ||
    /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/i.test(
      fileName
    )
  ) {
    return "document";
  }

  return "other";
}

function safeTitleFromFileName(
  fileName: string
) {
  const ext = path.extname(fileName);
  const base = fileName.replace(ext, "");
  return (
    base
      .replace(/[-_]+/g, " ")
      .trim() || "Untitled Asset"
  );
}

export async function listRoyalAssets(
  query?: string
): Promise<RoyalAssetRecord[]> {
  const assets = await readIndex();

  const sorted = assets.sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  if (!query?.trim()) {
    return sorted;
  }

  const q = query.trim().toLowerCase();

  return sorted.filter((asset) => {
    return (
      asset.title
        .toLowerCase()
        .includes(q) ||
      asset.originalFileName
        .toLowerCase()
        .includes(q) ||
      asset.source
        .toLowerCase()
        .includes(q) ||
      asset.kind
        .toLowerCase()
        .includes(q) ||
      (asset.prompt || "")
        .toLowerCase()
        .includes(q)
    );
  });
}

export async function saveUploadedAsset({
  file,
  title,
}: {
  file: File;
  title?: string;
}): Promise<RoyalAssetRecord> {
  await ensureAssetDirectories();

  const originalFileName =
    file.name || "upload";
  const mimeType =
    file.type ||
    "application/octet-stream";
  const ext =
    path.extname(originalFileName) || "";
  const cleanTitle =
    title?.trim() ||
    safeTitleFromFileName(
      originalFileName
    );
  const storedName = `${Date.now()}-${slugify(
    cleanTitle
  )}${ext}`;

  const relativePath = `/royalos-assets/uploads/${storedName}`;
  const absolutePath = path.join(
    UPLOADS_DIR,
    storedName
  );

  const bytes = Buffer.from(
    await file.arrayBuffer()
  );

  await fs.writeFile(
    absolutePath,
    bytes
  );

  const record: RoyalAssetRecord = {
    id: randomUUID(),
    title: cleanTitle,
    fileName: storedName,
    originalFileName,
    kind: detectKind(
      mimeType,
      originalFileName
    ),
    source: "upload",
    mimeType,
    sizeBytes: bytes.length,
    publicUrl: relativePath,
    relativePath,
    prompt: null,
    createdAt: new Date().toISOString(),
  };

  const assets = await readIndex();
  assets.unshift(record);
  await writeIndex(assets);

  return record;
}

export async function saveGeneratedImage({
  base64,
  title,
  prompt,
}: {
  base64: string;
  title: string;
  prompt: string;
}): Promise<RoyalAssetRecord> {
  await ensureAssetDirectories();

  const cleanTitle =
    title.trim() ||
    "Nova Generated Image";

  const storedName = `${Date.now()}-${slugify(
    cleanTitle
  )}.png`;

  const relativePath = `/royalos-assets/generated/${storedName}`;
  const absolutePath = path.join(
    GENERATED_DIR,
    storedName
  );

  const bytes = Buffer.from(
    base64,
    "base64"
  );

  await fs.writeFile(
    absolutePath,
    bytes
  );

  const record: RoyalAssetRecord = {
    id: randomUUID(),
    title: cleanTitle,
    fileName: storedName,
    originalFileName: storedName,
    kind: "image",
    source: "generated",
    mimeType: "image/png",
    sizeBytes: bytes.length,
    publicUrl: relativePath,
    relativePath,
    prompt,
    createdAt: new Date().toISOString(),
  };

  const assets = await readIndex();
  assets.unshift(record);
  await writeIndex(assets);

  return record;
}