import {
  createHash,
} from "node:crypto";

import {
  access,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";

import path from "node:path";

import type {
  RoyalOSEmployee,
} from "./brain";

export type RoyalOSKnowledgeIndexEntry = {
  id: string;

  relativePath: string;

  absolutePath: string;

  fileName: string;

  extension: ".md" | ".mdx";

  title: string;

  category: string;

  subcategory?: string;

  workspaceHints: string[];

  employeeHints: Array<
    RoyalOSEmployee | "Ifeoluwa"
  >;

  headings: string[];

  keywords: string[];

  excerpt: string;

  wordCount: number;

  characterCount: number;

  fileSizeBytes: number;

  modifiedAt: string;

  contentHash: string;
};

export type RoyalOSKnowledgeIndex = {
  version: 1;

  rootDirectory: string;

  generatedAt: string;

  documentCount: number;

  totalWords: number;

  totalCharacters: number;

  categories: string[];

  workspaces: string[];

  employees: Array<
    RoyalOSEmployee | "Ifeoluwa"
  >;

  fingerprint: string;

  entries: RoyalOSKnowledgeIndexEntry[];
};

export type BuildKnowledgeIndexOptions = {
  knowledgeRoot?: string;

  persist?: boolean;

  indexFileName?: string;

  includeContentExcerptCharacters?: number;
};

export type SearchKnowledgeIndexOptions = {
  query: string;

  workspace?: string;

  employee?:
    | RoyalOSEmployee
    | "Ifeoluwa";

  categories?: string[];

  limit?: number;

  refresh?: boolean;
};

export type RoyalOSKnowledgeIndexMatch = {
  entry: RoyalOSKnowledgeIndexEntry;

  score: number;

  matchedTerms: string[];
};

const DEFAULT_INDEX_FILE_NAME =
  ".royalos-index.json";

const DEFAULT_EXCERPT_CHARACTERS =
  700;

const DEFAULT_SEARCH_LIMIT =
  20;

const validEmployees = [
  "Adedeji",
  "Atlas",
  "Emmy",
  "Nova",
  "Jack",
  "Tyson",
  "Titan",
  "Janet",
  "Orion",
] as const satisfies readonly RoyalOSEmployee[];

const privateAdviserName =
  "Ifeoluwa" as const;

const allKnowledgePeople = [
  ...validEmployees,
  privateAdviserName,
] as const;

const knownWorkspaces = [
  "Triple-Hay Concept LLC",
  "ChoiceRoyals",
  "Xena Grace",
  "TD Talk",
  "RoyalOS",
] as const;

const excludedDirectoryNames =
  new Set([
    ".git",
    ".next",
    "node_modules",
    "archive",
    "archived",
    "deprecated",
    "temp",
    "tmp",
  ]);

const excludedFileNames =
  new Set([
    DEFAULT_INDEX_FILE_NAME,
    ".ds_store",
    "thumbs.db",
  ]);

const stopWords =
  new Set([
    "about",
    "after",
    "again",
    "against",
    "also",
    "among",
    "because",
    "before",
    "being",
    "between",
    "both",
    "business",
    "company",
    "could",
    "does",
    "doing",
    "during",
    "each",
    "from",
    "further",
    "have",
    "having",
    "into",
    "itself",
    "more",
    "most",
    "other",
    "our",
    "ours",
    "royalos",
    "same",
    "should",
    "some",
    "such",
    "than",
    "that",
    "their",
    "theirs",
    "them",
    "themselves",
    "then",
    "there",
    "these",
    "they",
    "this",
    "those",
    "through",
    "under",
    "until",
    "very",
    "what",
    "when",
    "where",
    "which",
    "while",
    "with",
    "within",
    "would",
    "your",
  ]);

let cachedIndex:
  | RoyalOSKnowledgeIndex
  | null = null;

let cachedFingerprint:
  | string
  | null = null;

function normalizePath(
  value: string
): string {
  return value
    .split(path.sep)
    .join("/");
}

function normalizeText(
  value: string
): string {
  return value
    .toLowerCase()
    .replace(/[`*_>#()[\]{}|~]/g, " ")
    .replace(/[^a-z0-9\s\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createHashValue(
  value: string
): string {
  return createHash("sha256")
    .update(value)
    .digest("hex");
}

function cleanHeading(
  value: string
): string {
  return value
    .replace(/^#+\s*/, "")
    .replace(/\s+#+$/, "")
    .trim();
}

function titleCaseFileName(
  fileName: string
): string {
  const withoutExtension =
    fileName.replace(
      /\.(md|mdx)$/i,
      ""
    );

  return withoutExtension
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

function tokenize(
  value: string
): string[] {
  const normalized =
    normalizeText(value);

  if (!normalized) {
    return [];
  }

  return normalized
    .split(" ")
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length >= 3 &&
        !stopWords.has(token) &&
        !/^\d+$/.test(token)
    );
}

function uniqueStrings(
  values: string[]
): string[] {
  return Array.from(
    new Set(
      values
        .map((value) =>
          value.trim()
        )
        .filter(Boolean)
    )
  );
}

function countWords(
  value: string
): number {
  const normalized =
    value.trim();

  if (!normalized) {
    return 0;
  }

  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function extractHeadings(
  content: string
): string[] {
  return uniqueStrings(
    content
      .split(/\r?\n/)
      .filter((line) =>
        /^#{1,6}\s+/.test(line)
      )
      .map(cleanHeading)
  ).slice(0, 40);
}

function extractTitle(
  content: string,
  fileName: string
): string {
  const firstHeading =
    content
      .split(/\r?\n/)
      .find((line) =>
        /^#\s+/.test(line)
      );

  if (firstHeading) {
    return cleanHeading(
      firstHeading
    );
  }

  const titleMetadata =
    content.match(
      /^title:\s*(.+)$/im
    );

  if (titleMetadata?.[1]) {
    return titleMetadata[1]
      .replace(/^["']|["']$/g, "")
      .trim();
  }

  return titleCaseFileName(
    fileName
  );
}

function extractExcerpt(
  content: string,
  maximumCharacters: number
): string {
  const withoutFrontmatter =
    content.replace(
      /^---[\s\S]*?---\s*/m,
      ""
    );

  const cleaned =
    withoutFrontmatter
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_>#|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  if (
    cleaned.length <=
    maximumCharacters
  ) {
    return cleaned;
  }

  return `${cleaned.slice(
    0,
    maximumCharacters
  ).trim()}…`;
}

function extractKeywords(
  content: string,
  title: string,
  headings: string[],
  relativePath: string
): string[] {
  const weightedText = [
    title,
    title,
    title,
    ...headings,
    ...headings,
    relativePath,
    content,
  ].join(" ");

  const frequency =
    new Map<string, number>();

  for (
    const token of tokenize(
      weightedText
    )
  ) {
    frequency.set(
      token,
      (frequency.get(token) ?? 0) +
        1
    );
  }

  return Array.from(
    frequency.entries()
  )
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return a[0].localeCompare(
        b[0]
      );
    })
    .slice(0, 35)
    .map(([keyword]) => keyword);
}

function extractEmployeeHints(
  content: string,
  relativePath: string
): Array<
  RoyalOSEmployee | "Ifeoluwa"
> {
  const searchable =
    normalizeText(
      `${relativePath} ${content.slice(
        0,
        15_000
      )}`
    );

  return allKnowledgePeople.filter(
    (employee) =>
      searchable.includes(
        employee.toLowerCase()
      )
  );
}

function extractWorkspaceHints(
  content: string,
  relativePath: string
): string[] {
  const searchable =
    normalizeText(
      `${relativePath} ${content.slice(
        0,
        15_000
      )}`
    );

  return knownWorkspaces.filter(
    (workspace) =>
      searchable.includes(
        normalizeText(workspace)
      )
  );
}

function resolveCategory(
  relativePath: string
): {
  category: string;
  subcategory?: string;
} {
  const pathParts =
    normalizePath(relativePath)
      .split("/")
      .filter(Boolean);

  return {
    category:
      pathParts[0] ??
      "uncategorized",

    subcategory:
      pathParts.length > 2
        ? pathParts[1]
        : undefined,
  };
}

async function pathExists(
  targetPath: string
): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveKnowledgeRoot(
  configuredRoot?: string
): Promise<string> {
  if (configuredRoot?.trim()) {
    const absoluteConfiguredRoot =
      path.resolve(
        configuredRoot.trim()
      );

    if (
      !(await pathExists(
        absoluteConfiguredRoot
      ))
    ) {
      throw new Error(
        `RoyalOS Knowledge Index could not find the configured knowledge directory: ${absoluteConfiguredRoot}`
      );
    }

    return absoluteConfiguredRoot;
  }

  const environmentRoot =
    process.env
      .ROYALOS_KNOWLEDGE_DIR
      ?.trim();

  if (environmentRoot) {
    const resolvedEnvironmentRoot =
      path.resolve(environmentRoot);

    if (
      await pathExists(
        resolvedEnvironmentRoot
      )
    ) {
      return resolvedEnvironmentRoot;
    }

    throw new Error(
      `ROYALOS_KNOWLEDGE_DIR points to a directory that does not exist: ${resolvedEnvironmentRoot}`
    );
  }

  const candidates = [
    path.join(
      process.cwd(),
      "Knowledge"
    ),
    path.join(
      process.cwd(),
      "knowledge"
    ),
  ];

  for (const candidate of candidates) {
    if (
      await pathExists(candidate)
    ) {
      return candidate;
    }
  }

  throw new Error(
    `RoyalOS Knowledge Index could not find a Knowledge directory under ${process.cwd()}.`
  );
}

async function discoverMarkdownFiles(
  directory: string
): Promise<string[]> {
  const discoveredFiles:
    string[] = [];

  async function walk(
    currentDirectory: string
  ): Promise<void> {
    const directoryEntries =
      await readdir(
        currentDirectory,
        {
          withFileTypes: true,
        }
      );

    directoryEntries.sort(
      (a, b) =>
        a.name.localeCompare(
          b.name
        )
    );

    for (
      const directoryEntry of
      directoryEntries
    ) {
      const lowerName =
        directoryEntry.name
          .toLowerCase();

      if (
        directoryEntry.isDirectory()
      ) {
        if (
          excludedDirectoryNames.has(
            lowerName
          ) ||
          lowerName.startsWith(".")
        ) {
          continue;
        }

        await walk(
          path.join(
            currentDirectory,
            directoryEntry.name
          )
        );

        continue;
      }

      if (
        !directoryEntry.isFile()
      ) {
        continue;
      }

      if (
        excludedFileNames.has(
          lowerName
        )
      ) {
        continue;
      }

      if (
        !/\.(md|mdx)$/i.test(
          directoryEntry.name
        )
      ) {
        continue;
      }

      discoveredFiles.push(
        path.join(
          currentDirectory,
          directoryEntry.name
        )
      );
    }
  }

  await walk(directory);

  return discoveredFiles;
}

async function createFileFingerprint(
  files: string[],
  rootDirectory: string
): Promise<string> {
  const fingerprintParts:
    string[] = [];

  for (const file of files) {
    const fileStat =
      await stat(file);

    fingerprintParts.push(
      [
        normalizePath(
          path.relative(
            rootDirectory,
            file
          )
        ),
        fileStat.size,
        fileStat.mtimeMs,
      ].join(":")
    );
  }

  return createHashValue(
    fingerprintParts.join("|")
  );
}

async function indexMarkdownFile(
  absolutePath: string,
  rootDirectory: string,
  excerptCharacters: number
): Promise<RoyalOSKnowledgeIndexEntry> {
  const [
    content,
    fileStat,
  ] = await Promise.all([
    readFile(
      absolutePath,
      "utf8"
    ),
    stat(absolutePath),
  ]);

  const relativePath =
    normalizePath(
      path.relative(
        rootDirectory,
        absolutePath
      )
    );

  const fileName =
    path.basename(
      absolutePath
    );

  const headings =
    extractHeadings(content);

  const title =
    extractTitle(
      content,
      fileName
    );

  const {
    category,
    subcategory,
  } = resolveCategory(
    relativePath
  );

  const contentHash =
    createHashValue(content);

  return {
    id:
      createHashValue(
        relativePath
      ).slice(0, 24),

    relativePath,

    absolutePath,

    fileName,

    extension:
      fileName
        .toLowerCase()
        .endsWith(".mdx")
        ? ".mdx"
        : ".md",

    title,

    category,

    subcategory,

    workspaceHints:
      extractWorkspaceHints(
        content,
        relativePath
      ),

    employeeHints:
      extractEmployeeHints(
        content,
        relativePath
      ),

    headings,

    keywords:
      extractKeywords(
        content,
        title,
        headings,
        relativePath
      ),

    excerpt:
      extractExcerpt(
        content,
        excerptCharacters
      ),

    wordCount:
      countWords(content),

    characterCount:
      content.length,

    fileSizeBytes:
      fileStat.size,

    modifiedAt:
      fileStat.mtime.toISOString(),

    contentHash,
  };
}

async function persistKnowledgeIndex(
  index: RoyalOSKnowledgeIndex,
  indexFileName: string
): Promise<void> {
  const outputPath =
    path.join(
      index.rootDirectory,
      indexFileName
    );

  try {
    await mkdir(
      index.rootDirectory,
      {
        recursive: true,
      }
    );

    const safeIndex = {
      ...index,

      entries:
        index.entries.map(
          ({
            absolutePath:
              _absolutePath,
            ...entry
          }) => entry
        ),
    };

    await writeFile(
      outputPath,
      `${JSON.stringify(
        safeIndex,
        null,
        2
      )}\n`,
      "utf8"
    );

    console.log(
      `RoyalOS Knowledge Index saved: ${outputPath}`
    );
  } catch (error) {
    console.warn(
      "RoyalOS Knowledge Index could not persist the JSON index. The in-memory index remains available:",
      error
    );
  }
}

export async function buildRoyalOSKnowledgeIndex(
  options: BuildKnowledgeIndexOptions = {}
): Promise<RoyalOSKnowledgeIndex> {
  const rootDirectory =
    await resolveKnowledgeRoot(
      options.knowledgeRoot
    );

  const files =
    await discoverMarkdownFiles(
      rootDirectory
    );

  const fingerprint =
    await createFileFingerprint(
      files,
      rootDirectory
    );

  const excerptCharacters =
    Math.min(
      2_000,
      Math.max(
        200,
        Math.floor(
          options
            .includeContentExcerptCharacters ??
            DEFAULT_EXCERPT_CHARACTERS
        )
      )
    );

  const entries =
    await Promise.all(
      files.map((file) =>
        indexMarkdownFile(
          file,
          rootDirectory,
          excerptCharacters
        )
      )
    );

  entries.sort(
    (a, b) =>
      a.relativePath.localeCompare(
        b.relativePath
      )
  );

  const index:
    RoyalOSKnowledgeIndex = {
      version: 1,

      rootDirectory,

      generatedAt:
        new Date().toISOString(),

      documentCount:
        entries.length,

      totalWords:
        entries.reduce(
          (total, entry) =>
            total +
            entry.wordCount,
          0
        ),

      totalCharacters:
        entries.reduce(
          (total, entry) =>
            total +
            entry.characterCount,
          0
        ),

      categories:
        uniqueStrings(
          entries.map(
            (entry) =>
              entry.category
          )
        ).sort(),

      workspaces:
        uniqueStrings(
          entries.flatMap(
            (entry) =>
              entry.workspaceHints
          )
        ).sort(),

      employees:
        Array.from(
          new Set(
            entries.flatMap(
              (entry) =>
                entry.employeeHints
            )
          )
        ),

      fingerprint,

      entries,
    };

  cachedIndex =
    index;

  cachedFingerprint =
    fingerprint;

  if (options.persist) {
    await persistKnowledgeIndex(
      index,
      options.indexFileName ??
        DEFAULT_INDEX_FILE_NAME
    );
  }

  console.log(
    "RoyalOS Knowledge Index built:",
    {
      rootDirectory,
      documents:
        index.documentCount,
      categories:
        index.categories,
      totalWords:
        index.totalWords,
      fingerprint:
        index.fingerprint.slice(
          0,
          12
        ),
    }
  );

  return index;
}

export async function getRoyalOSKnowledgeIndex(
  options: BuildKnowledgeIndexOptions & {
    refresh?: boolean;
  } = {}
): Promise<RoyalOSKnowledgeIndex> {
  if (options.refresh) {
    return buildRoyalOSKnowledgeIndex(
      options
    );
  }

  const rootDirectory =
    await resolveKnowledgeRoot(
      options.knowledgeRoot
    );

  const files =
    await discoverMarkdownFiles(
      rootDirectory
    );

  const currentFingerprint =
    await createFileFingerprint(
      files,
      rootDirectory
    );

  if (
    cachedIndex &&
    cachedFingerprint ===
      currentFingerprint
  ) {
    return cachedIndex;
  }

  return buildRoyalOSKnowledgeIndex(
    options
  );
}

function countTextOccurrences(
  source: string,
  term: string
): number {
  if (!term) {
    return 0;
  }

  let count = 0;
  let position = 0;

  while (true) {
    const foundAt =
      source.indexOf(
        term,
        position
      );

    if (foundAt < 0) {
      break;
    }

    count += 1;

    position =
      foundAt + term.length;
  }

  return count;
}

function scoreKnowledgeEntry(
  entry: RoyalOSKnowledgeIndexEntry,
  options: SearchKnowledgeIndexOptions
): RoyalOSKnowledgeIndexMatch {
  const queryTerms =
    uniqueStrings(
      tokenize(options.query)
    );

  const title =
    normalizeText(
      entry.title
    );

  const relativePath =
    normalizeText(
      entry.relativePath
    );

  const headings =
    normalizeText(
      entry.headings.join(" ")
    );

  const keywords =
    entry.keywords.map(
      normalizeText
    );

  const excerpt =
    normalizeText(
      entry.excerpt
    );

  let score = 0;

  const matchedTerms:
    string[] = [];

  for (
    const term of queryTerms
  ) {
    let matched = false;

    if (
      title.includes(term)
    ) {
      score += 100;
      matched = true;
    }

    if (
      relativePath.includes(
        term
      )
    ) {
      score += 80;
      matched = true;
    }

    if (
      headings.includes(term)
    ) {
      score += 60;
      matched = true;
    }

    if (
      keywords.some(
        (keyword) =>
          keyword.includes(term)
      )
    ) {
      score += 45;
      matched = true;
    }

    const excerptOccurrences =
      countTextOccurrences(
        excerpt,
        term
      );

    if (
      excerptOccurrences > 0
    ) {
      score +=
        Math.min(
          excerptOccurrences,
          5
        ) * 12;

      matched = true;
    }

    if (matched) {
      matchedTerms.push(term);
    }
  }

  if (
    options.workspace &&
    entry.workspaceHints.some(
      (workspace) =>
        normalizeText(workspace) ===
        normalizeText(
          options.workspace!
        )
    )
  ) {
    score += 120;
  }

  if (
    options.employee &&
    entry.employeeHints.includes(
      options.employee
    )
  ) {
    score += 140;
  }

  if (
    options.categories?.length &&
    options.categories.some(
      (category) =>
        normalizeText(category) ===
        normalizeText(
          entry.category
        )
    )
  ) {
    score += 100;
  }

  return {
    entry,

    score,

    matchedTerms:
      uniqueStrings(
        matchedTerms
      ),
  };
}

export async function searchRoyalOSKnowledgeIndex(
  options: SearchKnowledgeIndexOptions
): Promise<RoyalOSKnowledgeIndexMatch[]> {
  const index =
    await getRoyalOSKnowledgeIndex({
      refresh:
        options.refresh,
    });

  const limit =
    Math.min(
      100,
      Math.max(
        1,
        Math.floor(
          options.limit ??
          DEFAULT_SEARCH_LIMIT
        )
      )
    );

  const queryHasTerms =
    tokenize(
      options.query
    ).length > 0;

  return index.entries
    .map((entry) =>
      scoreKnowledgeEntry(
        entry,
        options
      )
    )
    .filter((match) => {
      if (
        !queryHasTerms &&
        !options.workspace &&
        !options.employee &&
        !options.categories
          ?.length
      ) {
        return true;
      }

      return match.score > 0;
    })
    .sort((a, b) => {
      if (
        b.score !== a.score
      ) {
        return (
          b.score - a.score
        );
      }

      return a.entry
        .relativePath
        .localeCompare(
          b.entry.relativePath
        );
    })
    .slice(0, limit);
}

export function resetRoyalOSKnowledgeIndex():
  void {
  cachedIndex = null;
  cachedFingerprint = null;
}