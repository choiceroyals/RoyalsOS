import { promises as fs } from "fs";
import path from "path";

export type KnowledgeDocument = {
  relativePath: string;
  category: string;
  filename: string;
  content: string;
};

export type KnowledgeBundle = {
  employee: string;
  workspace: string;
  documentsDiscovered: number;
  documentsLoaded: number;
  loadedFiles: string[];
  content: string;
};

type LoadKnowledgeOptions = {
  employee: string;
  workspace: string;
  query: string;
};

const KNOWLEDGE_ROOT = path.join(process.cwd(), "knowledge");

const MAX_FILE_CHARACTERS = 40_000;
const MAX_TOTAL_CHARACTERS = 150_000;
const MAX_SELECTED_DOCUMENTS = 28;

const EMPLOYEE_FILENAMES: Record<string, string[]> = {
  Adedeji: [
    "adedeji.md",
    "adedeji-playbook.md",
    "chief-of-staff.md",
  ],
  Atlas: [
    "atlas.md",
    "atlas-playbook.md",
  ],
  Emmy: [
    "emmy.md",
    "emmy-playbook.md",
  ],
  Nova: [
    "nova.md",
    "nova-playbook.md",
  ],
  Jack: [
    "jack.md",
    "jack-playbook.md",
  ],
  Tyson: [
    "tyson.md",
    "tyson-playbook.md",
  ],
  Titan: [
    "titan.md",
    "titan-playbook.md",
  ],
  Janet: [
    "janet.md",
    "janet-playbook.md",
  ],
  Orion: [
    "orion.md",
    "orion-playbook.md",
  ],
};

const WORKSPACE_TERMS: Record<string, string[]> = {
  "Triple-Hay Concept LLC": [
    "triple-hay",
    "triple hay",
    "parent company",
    "company",
    "corporate",
    "executive",
    "leadership",
    "business model",
    "strategy",
  ],

  ChoiceRoyals: [
    "choiceroyals",
    "choice royals",
    "academy",
    "webinar",
    "business education",
    "entrepreneurship",
    "cybersecurity",
    "robotics",
    "digital product",
  ],

  "Xena Grace": [
    "xena grace",
    "xena",
    "music",
    "song",
    "spotify",
    "artist",
    "streaming",
    "album",
    "community",
    "xgrace",
  ],

  "TD Talk": [
    "td talk",
    "documentary",
    "podcast",
    "biography",
    "storytelling",
    "media",
    "motivational",
  ],
};

const EMPLOYEE_EXPERTISE_TERMS: Record<string, string[]> = {
  Adedeji: [
    "executive",
    "leadership",
    "priority",
    "coordination",
    "mission",
    "briefing",
    "decision",
    "strategy",
    "chief of staff",
  ],

  Atlas: [
    "research",
    "market",
    "competitor",
    "intelligence",
    "evidence",
    "trend",
    "industry",
    "investigate",
  ],

  Emmy: [
    "marketing",
    "content",
    "seo",
    "campaign",
    "audience",
    "email",
    "social media",
    "promotion",
    "brand message",
  ],

  Nova: [
    "design",
    "creative",
    "visual",
    "branding",
    "artwork",
    "logo",
    "ui",
    "ux",
    "graphic",
  ],

  Jack: [
    "video",
    "documentary",
    "youtube",
    "podcast",
    "media",
    "script",
    "storyboard",
    "production",
  ],

  Tyson: [
    "analytics",
    "metrics",
    "data",
    "kpi",
    "performance",
    "revenue",
    "forecast",
    "conversion",
  ],

  Titan: [
    "operations",
    "workflow",
    "process",
    "sop",
    "project",
    "efficiency",
    "quality",
    "execution",
  ],

  Janet: [
    "customer",
    "support",
    "community",
    "feedback",
    "retention",
    "onboarding",
    "faq",
    "experience",
  ],

  Orion: [
    "technology",
    "automation",
    "software",
    "api",
    "code",
    "database",
    "security",
    "architecture",
    "integration",
    "royalos",
  ],
};

/*
 * These documents are considered foundational.
 * They should be included whenever they exist.
 */
const ALWAYS_INCLUDE_FILENAMES = new Set([
  "royalos-constitution.md",
  "company-operating-system.md",
  "company.md",
  "mission.md",
  "vision.md",
  "core-values.md",
  "ethics.md",
  "business-model.md",
  "company-structure.md",
  "leadership-principles.md",
  "decision-framework.md",
  "executive-briefing.md",
  "communication.md",
]);

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "create",
  "do",
  "for",
  "from",
  "help",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "please",
  "the",
  "this",
  "to",
  "using",
  "want",
  "we",
  "what",
  "with",
  "you",
]);

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  const normalized = normalizeText(value);

  if (!normalized) {
    return [];
  }

  return Array.from(
    new Set(
      normalized
        .split(" ")
        .map((token) => token.trim())
        .filter(
          (token) =>
            token.length >= 3 &&
            !STOP_WORDS.has(token)
        )
    )
  );
}

function getCategory(relativePath: string): string {
  const normalized = normalizePath(relativePath);
  return normalized.split("/")[0] || "uncategorized";
}

async function directoryExists(
  directoryPath: string
): Promise<boolean> {
  try {
    const stats = await fs.stat(directoryPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function findMarkdownFiles(
  directoryPath: string
): Promise<string[]> {
  const entries = await fs.readdir(directoryPath, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(
      directoryPath,
      entry.name
    );

    if (entry.isDirectory()) {
      const nestedFiles =
        await findMarkdownFiles(absolutePath);

      files.push(...nestedFiles);
      continue;
    }

    if (
      entry.isFile() &&
      entry.name.toLowerCase().endsWith(".md")
    ) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function readKnowledgeDocument(
  absolutePath: string
): Promise<KnowledgeDocument | null> {
  try {
    const rawContent = await fs.readFile(
      absolutePath,
      "utf8"
    );

    const trimmedContent = rawContent.trim();

    if (!trimmedContent) {
      return null;
    }

    const relativePath = normalizePath(
      path.relative(KNOWLEDGE_ROOT, absolutePath)
    );

    const limitedContent =
      trimmedContent.length > MAX_FILE_CHARACTERS
        ? `${trimmedContent.slice(
            0,
            MAX_FILE_CHARACTERS
          )}

[ROYALOS NOTICE: This document was shortened because it exceeded the per-file limit.]`
        : trimmedContent;

    return {
      relativePath,
      category: getCategory(relativePath),
      filename: path.basename(relativePath),
      content: limitedContent,
    };
  } catch (error) {
    console.error(
      `RoyalOS could not read knowledge file: ${absolutePath}`,
      error
    );

    return null;
  }
}

function countOccurrences(
  source: string,
  searchTerm: string
): number {
  if (!searchTerm) {
    return 0;
  }

  let count = 0;
  let position = 0;

  while (true) {
    const foundAt = source.indexOf(
      searchTerm,
      position
    );

    if (foundAt === -1) {
      break;
    }

    count += 1;
    position = foundAt + searchTerm.length;
  }

  return count;
}

function scoreDocument(
  document: KnowledgeDocument,
  options: LoadKnowledgeOptions
): number {
  const filename = document.filename.toLowerCase();
  const relativePath =
    document.relativePath.toLowerCase();
  const category = document.category.toLowerCase();

  const normalizedContent = normalizeText(
    document.content.slice(0, 25_000)
  );

  const searchableText = `${relativePath} ${normalizedContent}`;

  let score = 0;

  /*
   * Foundational company intelligence.
   */
  if (ALWAYS_INCLUDE_FILENAMES.has(filename)) {
    score += 10_000;
  }

  /*
   * Selected employee profile and playbook.
   */
  const employeeFiles =
    EMPLOYEE_FILENAMES[options.employee] ?? [];

  if (
    employeeFiles.some(
      (employeeFile) =>
        filename === employeeFile.toLowerCase()
    )
  ) {
    score += 9_000;
  }

  /*
   * Category-level priorities.
   */
  if (category === "company") {
    score += 500;
  }

  if (category === "leadership") {
    score += 450;
  }

  if (category === "system") {
    score += 350;
  }

  if (category === "memory") {
    score += 100;
  }

  /*
   * Active workspace relevance.
   */
  const workspaceTerms =
    WORKSPACE_TERMS[options.workspace] ?? [];

  for (const term of workspaceTerms) {
    const normalizedTerm = normalizeText(term);

    if (relativePath.includes(normalizedTerm)) {
      score += 700;
    }

    const occurrences = countOccurrences(
      searchableText,
      normalizedTerm
    );

    score += Math.min(occurrences, 5) * 70;
  }

  /*
   * Employee professional expertise relevance.
   */
  const expertiseTerms =
    EMPLOYEE_EXPERTISE_TERMS[options.employee] ?? [];

  for (const term of expertiseTerms) {
    const normalizedTerm = normalizeText(term);

    if (relativePath.includes(normalizedTerm)) {
      score += 500;
    }

    const occurrences = countOccurrences(
      searchableText,
      normalizedTerm
    );

    score += Math.min(occurrences, 5) * 45;
  }

  /*
   * Match the CEO's request against the path and content.
   */
  const queryTokens = tokenize(options.query);

  for (const token of queryTokens) {
    if (filename.includes(token)) {
      score += 350;
    }

    if (relativePath.includes(token)) {
      score += 250;
    }

    const occurrences = countOccurrences(
      searchableText,
      token
    );

    score += Math.min(occurrences, 8) * 35;
  }

  /*
   * Strong phrase matching for meaningful multi-word requests.
   */
  const normalizedQuery = normalizeText(options.query);

  if (
    normalizedQuery.length >= 8 &&
    normalizedContent.includes(normalizedQuery)
  ) {
    score += 1_500;
  }

  return score;
}

function selectRelevantDocuments(
  documents: KnowledgeDocument[],
  options: LoadKnowledgeOptions
): KnowledgeDocument[] {
  const scoredDocuments = documents.map(
    (document) => ({
      document,
      score: scoreDocument(document, options),
    })
  );

  scoredDocuments.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.document.relativePath.localeCompare(
      b.document.relativePath
    );
  });

  const selected: KnowledgeDocument[] = [];
  const selectedPaths = new Set<string>();

  /*
   * First guarantee the foundational documents and
   * selected employee documents.
   */
  for (const item of scoredDocuments) {
    const filename =
      item.document.filename.toLowerCase();

    const isFoundation =
      ALWAYS_INCLUDE_FILENAMES.has(filename);

    const isEmployeeDocument = (
      EMPLOYEE_FILENAMES[options.employee] ?? []
    ).some(
      (employeeFile) =>
        filename === employeeFile.toLowerCase()
    );

    if (!isFoundation && !isEmployeeDocument) {
      continue;
    }

    if (
      !selectedPaths.has(
        item.document.relativePath
      )
    ) {
      selected.push(item.document);
      selectedPaths.add(
        item.document.relativePath
      );
    }
  }

  /*
   * Then fill the remaining positions using relevance.
   */
  for (const item of scoredDocuments) {
    if (
      selected.length >= MAX_SELECTED_DOCUMENTS
    ) {
      break;
    }

    if (
      selectedPaths.has(
        item.document.relativePath
      )
    ) {
      continue;
    }

    /*
     * Ignore documents with virtually no relevance,
     * unless room remains and they have category value.
     */
    if (item.score <= 0) {
      continue;
    }

    selected.push(item.document);
    selectedPaths.add(
      item.document.relativePath
    );
  }

  return selected;
}

function buildKnowledgeText(
  documents: KnowledgeDocument[]
): {
  content: string;
  loadedFiles: string[];
} {
  const sections: string[] = [];
  const loadedFiles: string[] = [];

  let currentLength = 0;

  for (const document of documents) {
    const section = `
==================================================
DOCUMENT PATH: ${document.relativePath}
CATEGORY: ${document.category}
==================================================

${document.content}
`.trim();

    if (
      currentLength + section.length >
      MAX_TOTAL_CHARACTERS
    ) {
      console.warn(
        `RoyalOS knowledge character limit reached after ${loadedFiles.length} selected documents.`
      );
      break;
    }

    sections.push(section);
    loadedFiles.push(document.relativePath);
    currentLength += section.length;
  }

  return {
    content: sections.join("\n\n"),
    loadedFiles,
  };
}

export async function discoverKnowledgeDocuments(): Promise<
  KnowledgeDocument[]
> {
  const exists = await directoryExists(
    KNOWLEDGE_ROOT
  );

  if (!exists) {
    throw new Error(
      `RoyalOS knowledge directory was not found at: ${KNOWLEDGE_ROOT}`
    );
  }

  const markdownFiles =
    await findMarkdownFiles(KNOWLEDGE_ROOT);

  if (markdownFiles.length === 0) {
    throw new Error(
      "RoyalOS found the knowledge directory, but it contains no Markdown files."
    );
  }

  const documents = await Promise.all(
    markdownFiles.map(readKnowledgeDocument)
  );

  return documents.filter(
    (
      document
    ): document is KnowledgeDocument =>
      document !== null
  );
}

export async function loadRoyalOSKnowledge(
  options: LoadKnowledgeOptions
): Promise<KnowledgeBundle> {
  const discoveredDocuments =
    await discoverKnowledgeDocuments();

  const selectedDocuments =
    selectRelevantDocuments(
      discoveredDocuments,
      options
    );

  const { content, loadedFiles } =
    buildKnowledgeText(selectedDocuments);

  if (!content.trim()) {
    throw new Error(
      "RoyalOS discovered knowledge files but could not build a relevant knowledge bundle."
    );
  }

  console.log(
    `RoyalOS Knowledge Router: discovered=${discoveredDocuments.length}, selected=${loadedFiles.length}, employee=${options.employee}, workspace=${options.workspace}`
  );

  console.log(
    "RoyalOS selected knowledge files:",
    loadedFiles
  );

  return {
    employee: options.employee,
    workspace: options.workspace,
    documentsDiscovered:
      discoveredDocuments.length,
    documentsLoaded: loadedFiles.length,
    loadedFiles,
    content,
  };
}