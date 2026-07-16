import type {
  RoyalOSEmployee,
} from "../brain";

export type RoyalOSMemoryScope =
  | "company"
  | "workspace"
  | "mission"
  | "employee"
  | "ceo_private"
  | "ifeoluwa_private";

export type RoyalOSMemoryStatus =
  | "proposed"
  | "verified"
  | "approved"
  | "active"
  | "superseded"
  | "archived"
  | "rejected";

export type RoyalOSMemoryImportance =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type RoyalOSMemorySourceType =
  | "ceo_statement"
  | "mission"
  | "employee_report"
  | "executive_briefing"
  | "company_document"
  | "customer_feedback"
  | "system_event"
  | "manual_entry"
  | "ifeoluwa_conversation";

export type RoyalOSMemorySensitivity =
  | "public"
  | "internal"
  | "confidential"
  | "private";

export type RoyalOSMemory = {
  id: string;

  title: string;

  content: string;

  summary?: string;

  scope: RoyalOSMemoryScope;

  status: RoyalOSMemoryStatus;

  importance: RoyalOSMemoryImportance;

  sensitivity: RoyalOSMemorySensitivity;

  sourceType: RoyalOSMemorySourceType;

  workspace?: string;

  missionId?: string;

  employee?: RoyalOSEmployee | "Ifeoluwa";

  tags: string[];

  /**
   * IDs of employees explicitly allowed to access
   * this memory.
   *
   * An empty array means access is determined by
   * the scope and sensitivity rules.
   */
  allowedEmployees: Array<
    RoyalOSEmployee | "Ifeoluwa"
  >;

  createdBy:
    | RoyalOSEmployee
    | "Ifeoluwa"
    | "CEO"
    | "RoyalOS";

  createdAt: string;

  updatedAt: string;

  verifiedAt?: string;

  approvedAt?: string;

  archivedAt?: string;

  supersedesMemoryId?: string;

  metadata?: Record<
    string,
    string | number | boolean | null
  >;
};

export type CreateRoyalOSMemoryInput = {
  title: string;

  content: string;

  summary?: string;

  scope: RoyalOSMemoryScope;

  status?: RoyalOSMemoryStatus;

  importance?: RoyalOSMemoryImportance;

  sensitivity?: RoyalOSMemorySensitivity;

  sourceType: RoyalOSMemorySourceType;

  workspace?: string;

  missionId?: string;

  employee?: RoyalOSEmployee | "Ifeoluwa";

  tags?: string[];

  allowedEmployees?: Array<
    RoyalOSEmployee | "Ifeoluwa"
  >;

  createdBy:
    | RoyalOSEmployee
    | "Ifeoluwa"
    | "CEO"
    | "RoyalOS";

  supersedesMemoryId?: string;

  metadata?: Record<
    string,
    string | number | boolean | null
  >;
};

export type UpdateRoyalOSMemoryInput = {
  title?: string;

  content?: string;

  summary?: string;

  scope?: RoyalOSMemoryScope;

  status?: RoyalOSMemoryStatus;

  importance?: RoyalOSMemoryImportance;

  sensitivity?: RoyalOSMemorySensitivity;

  workspace?: string;

  missionId?: string;

  employee?: RoyalOSEmployee | "Ifeoluwa";

  tags?: string[];

  allowedEmployees?: Array<
    RoyalOSEmployee | "Ifeoluwa"
  >;

  supersedesMemoryId?: string;

  metadata?: Record<
    string,
    string | number | boolean | null
  >;
};

export type RoyalOSMemoryQuery = {
  query: string;

  requester:
    | RoyalOSEmployee
    | "Ifeoluwa"
    | "CEO"
    | "RoyalOS";

  workspace?: string;

  missionId?: string;

  employee?: RoyalOSEmployee | "Ifeoluwa";

  scopes?: RoyalOSMemoryScope[];

  statuses?: RoyalOSMemoryStatus[];

  minimumImportance?: RoyalOSMemoryImportance;

  tags?: string[];

  limit?: number;

  includePrivate?: boolean;
};

export type RoyalOSMemoryMatch = {
  memory: RoyalOSMemory;

  score: number;

  matchedTerms: string[];
};

export type RoyalOSMemoryBundle = {
  requester: RoyalOSMemoryQuery["requester"];

  query: string;

  memoriesFound: number;

  memoriesSelected: number;

  selectedMemoryIds: string[];

  content: string;

  matches: RoyalOSMemoryMatch[];
};

export interface RoyalOSMemoryStorageAdapter {
  create(
    memory: RoyalOSMemory
  ): Promise<RoyalOSMemory>;

  update(
    id: string,
    updates: Partial<RoyalOSMemory>
  ): Promise<RoyalOSMemory>;

  getById(
    id: string
  ): Promise<RoyalOSMemory | null>;

  list(): Promise<RoyalOSMemory[]>;

  delete?(
    id: string
  ): Promise<void>;
}

export type RoyalOSMemoryEngineOptions = {
  storage: RoyalOSMemoryStorageAdapter;

  maxSelectedMemories?: number;

  maxMemoryCharacters?: number;

  /**
   * When false, proposed memories will not be included
   * in normal retrieval unless explicitly requested.
   */
  includeProposedByDefault?: boolean;
};

export type RoyalOSMemoryEngine = {
  createMemory(
    input: CreateRoyalOSMemoryInput
  ): Promise<RoyalOSMemory>;

  updateMemory(
    id: string,
    updates: UpdateRoyalOSMemoryInput
  ): Promise<RoyalOSMemory>;

  approveMemory(
    id: string,
    approvedBy: "CEO" | RoyalOSEmployee
  ): Promise<RoyalOSMemory>;

  archiveMemory(
    id: string
  ): Promise<RoyalOSMemory>;

  supersedeMemory(
    oldMemoryId: string,
    replacement: CreateRoyalOSMemoryInput
  ): Promise<{
    oldMemory: RoyalOSMemory;
    newMemory: RoyalOSMemory;
  }>;

  retrieveMemories(
    query: RoyalOSMemoryQuery
  ): Promise<RoyalOSMemoryBundle>;

  getMemory(
    id: string
  ): Promise<RoyalOSMemory | null>;
};

const DEFAULT_MAX_SELECTED_MEMORIES = 20;
const DEFAULT_MAX_MEMORY_CHARACTERS = 60_000;

const importanceWeight: Record<
  RoyalOSMemoryImportance,
  number
> = {
  low: 10,
  medium: 30,
  high: 60,
  critical: 100,
};

const importanceOrder: Record<
  RoyalOSMemoryImportance,
  number
> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const activeMemoryStatuses =
  new Set<RoyalOSMemoryStatus>([
    "verified",
    "approved",
    "active",
  ]);

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "do",
  "for",
  "from",
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

function createMemoryId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID ===
      "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `memory_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeText(
  value: string
): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(
  value: string
): string[] {
  const normalized =
    normalizeText(value);

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
            !stopWords.has(token)
        )
    )
  );
}

function uniqueStrings(
  values: string[]
): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function uniqueEmployees(
  values: Array<
    RoyalOSEmployee | "Ifeoluwa"
  >
): Array<RoyalOSEmployee | "Ifeoluwa"> {
  return Array.from(
    new Set(values)
  );
}

function clampInteger(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      Math.floor(value)
    )
  );
}

function validateCreateInput(
  input: CreateRoyalOSMemoryInput
): void {
  if (!input.title.trim()) {
    throw new Error(
      "RoyalOS Memory Engine received an empty memory title."
    );
  }

  if (!input.content.trim()) {
    throw new Error(
      "RoyalOS Memory Engine received empty memory content."
    );
  }

  if (
    input.scope === "mission" &&
    !input.missionId?.trim()
  ) {
    throw new Error(
      "Mission-scoped memories require a missionId."
    );
  }

  if (
    input.scope === "employee" &&
    !input.employee
  ) {
    throw new Error(
      "Employee-scoped memories require an employee."
    );
  }

  if (
    input.scope === "ifeoluwa_private" &&
    input.employee &&
    input.employee !== "Ifeoluwa"
  ) {
    throw new Error(
      "Ifeoluwa private memories cannot be assigned to another employee."
    );
  }
}

function validateUpdateInput(
  updates: UpdateRoyalOSMemoryInput
): void {
  if (
    updates.title !== undefined &&
    !updates.title.trim()
  ) {
    throw new Error(
      "RoyalOS Memory Engine cannot update a memory with an empty title."
    );
  }

  if (
    updates.content !== undefined &&
    !updates.content.trim()
  ) {
    throw new Error(
      "RoyalOS Memory Engine cannot update a memory with empty content."
    );
  }
}

function canAccessMemory(
  memory: RoyalOSMemory,
  requester: RoyalOSMemoryQuery["requester"],
  includePrivate: boolean
): boolean {
  if (
    memory.status === "rejected" ||
    memory.status === "archived"
  ) {
    return false;
  }

  if (requester === "CEO") {
    return true;
  }

  if (
    memory.allowedEmployees.length > 0 &&
    !memory.allowedEmployees.includes(
      requester as RoyalOSEmployee | "Ifeoluwa"
    )
  ) {
    return false;
  }

  if (
    memory.scope === "ceo_private"
  ) {
    return false;
  }

  if (
    memory.scope === "ifeoluwa_private"
  ) {
    return (
      requester === "Ifeoluwa" &&
      includePrivate
    );
  }

  if (
    memory.sensitivity === "private"
  ) {
    return (
      includePrivate &&
      (
        memory.employee === requester ||
        memory.allowedEmployees.includes(
          requester as
            | RoyalOSEmployee
            | "Ifeoluwa"
        )
      )
    );
  }

  if (
    memory.scope === "employee" &&
    memory.employee &&
    memory.employee !== requester &&
    memory.allowedEmployees.length === 0
  ) {
    return false;
  }

  return true;
}

function countOccurrences(
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

    if (foundAt === -1) {
      break;
    }

    count += 1;
    position =
      foundAt + term.length;
  }

  return count;
}

function calculateMemoryScore(
  memory: RoyalOSMemory,
  query: RoyalOSMemoryQuery
): RoyalOSMemoryMatch {
  const queryTokens =
    tokenize(query.query);

  const searchableText =
    normalizeText(
      [
        memory.title,
        memory.summary ?? "",
        memory.content,
        memory.workspace ?? "",
        memory.missionId ?? "",
        memory.employee ?? "",
        ...memory.tags,
      ].join(" ")
    );

  const normalizedTitle =
    normalizeText(memory.title);

  const normalizedSummary =
    normalizeText(
      memory.summary ?? ""
    );

  const normalizedTags =
    memory.tags.map(normalizeText);

  let score =
    importanceWeight[
      memory.importance
    ];

  const matchedTerms: string[] = [];

  for (const token of queryTokens) {
    let tokenMatched = false;

    if (
      normalizedTitle.includes(token)
    ) {
      score += 80;
      tokenMatched = true;
    }

    if (
      normalizedSummary.includes(token)
    ) {
      score += 50;
      tokenMatched = true;
    }

    if (
      normalizedTags.some(
        (tag) => tag.includes(token)
      )
    ) {
      score += 70;
      tokenMatched = true;
    }

    const occurrences =
      countOccurrences(
        searchableText,
        token
      );

    if (occurrences > 0) {
      score +=
        Math.min(
          occurrences,
          8
        ) * 15;

      tokenMatched = true;
    }

    if (tokenMatched) {
      matchedTerms.push(token);
    }
  }

  if (
    query.workspace &&
    memory.workspace === query.workspace
  ) {
    score += 80;
  }

  if (
    query.missionId &&
    memory.missionId === query.missionId
  ) {
    score += 150;
  }

  if (
    query.employee &&
    memory.employee === query.employee
  ) {
    score += 100;
  }

  if (
    query.tags?.length
  ) {
    const requestedTags =
      query.tags.map(normalizeText);

    for (
      const requestedTag of requestedTags
    ) {
      if (
        normalizedTags.some(
          (tag) =>
            tag.includes(requestedTag) ||
            requestedTag.includes(tag)
        )
      ) {
        score += 50;
      }
    }
  }

  if (
    memory.status === "active"
  ) {
    score += 40;
  }

  if (
    memory.status === "approved"
  ) {
    score += 30;
  }

  if (
    memory.status === "verified"
  ) {
    score += 20;
  }

  const ageInDays =
    (
      Date.now() -
      new Date(
        memory.updatedAt
      ).getTime()
    ) /
    86_400_000;

  if (
    Number.isFinite(ageInDays)
  ) {
    if (ageInDays <= 7) {
      score += 25;
    } else if (ageInDays <= 30) {
      score += 15;
    } else if (ageInDays <= 90) {
      score += 5;
    }
  }

  return {
    memory,
    score,
    matchedTerms:
      uniqueStrings(matchedTerms),
  };
}

function matchesFilters(
  memory: RoyalOSMemory,
  query: RoyalOSMemoryQuery,
  includeProposedByDefault: boolean
): boolean {
  if (
    query.scopes?.length &&
    !query.scopes.includes(
      memory.scope
    )
  ) {
    return false;
  }

  const allowedStatuses =
    query.statuses ??
    (
      includeProposedByDefault
        ? [
            "proposed",
            "verified",
            "approved",
            "active",
          ]
        : [
            "verified",
            "approved",
            "active",
          ]
    );

  if (
    !allowedStatuses.includes(
      memory.status
    )
  ) {
    return false;
  }

  if (
    query.minimumImportance &&
    importanceOrder[
      memory.importance
    ] <
      importanceOrder[
        query.minimumImportance
      ]
  ) {
    return false;
  }

  if (
    query.workspace &&
    memory.workspace &&
    memory.workspace !==
      query.workspace
  ) {
    return false;
  }

  if (
    query.missionId &&
    memory.missionId &&
    memory.missionId !==
      query.missionId
  ) {
    return false;
  }

  return true;
}

function formatMemoryForContext(
  memory: RoyalOSMemory
): string {
  return `
==================================================
MEMORY ID
${memory.id}

TITLE
${memory.title}

SCOPE
${memory.scope}

STATUS
${memory.status}

IMPORTANCE
${memory.importance}

SENSITIVITY
${memory.sensitivity}

WORKSPACE
${memory.workspace ?? "Not specified"}

MISSION ID
${memory.missionId ?? "Not specified"}

EMPLOYEE
${memory.employee ?? "Not specified"}

SOURCE
${memory.sourceType}

UPDATED
${memory.updatedAt}

TAGS
${
  memory.tags.length > 0
    ? memory.tags.join(", ")
    : "None"
}

MEMORY CONTENT

${memory.content}
`.trim();
}

function buildMemoryBundle(
  matches: RoyalOSMemoryMatch[],
  query: RoyalOSMemoryQuery,
  maximumCharacters: number
): RoyalOSMemoryBundle {
  const sections: string[] = [];
  const selectedMatches:
    RoyalOSMemoryMatch[] = [];

  let currentLength = 0;

  for (const match of matches) {
    const section =
      formatMemoryForContext(
        match.memory
      );

    if (
      currentLength +
        section.length >
      maximumCharacters
    ) {
      break;
    }

    sections.push(section);
    selectedMatches.push(match);

    currentLength +=
      section.length;
  }

  return {
    requester: query.requester,

    query: query.query,

    memoriesFound:
      matches.length,

    memoriesSelected:
      selectedMatches.length,

    selectedMemoryIds:
      selectedMatches.map(
        (match) =>
          match.memory.id
      ),

    content:
      sections.join("\n\n"),

    matches:
      selectedMatches,
  };
}

export function createRoyalOSMemoryEngine(
  options: RoyalOSMemoryEngineOptions
): RoyalOSMemoryEngine {
  const maxSelectedMemories =
    clampInteger(
      options.maxSelectedMemories,
      DEFAULT_MAX_SELECTED_MEMORIES,
      1,
      100
    );

  const maxMemoryCharacters =
    clampInteger(
      options.maxMemoryCharacters,
      DEFAULT_MAX_MEMORY_CHARACTERS,
      5_000,
      200_000
    );

  const includeProposedByDefault =
    options.includeProposedByDefault ??
    false;

  async function getRequiredMemory(
    id: string
  ): Promise<RoyalOSMemory> {
    const memory =
      await options.storage.getById(id);

    if (!memory) {
      throw new Error(
        `RoyalOS memory was not found: ${id}`
      );
    }

    return memory;
  }

  return {
    async createMemory(
      input
    ): Promise<RoyalOSMemory> {
      validateCreateInput(input);

      const timestamp =
        nowIso();

      const memory:
        RoyalOSMemory = {
          id: createMemoryId(),

          title:
            input.title.trim(),

          content:
            input.content.trim(),

          summary:
            input.summary?.trim() ||
            undefined,

          scope:
            input.scope,

          status:
            input.status ??
            "proposed",

          importance:
            input.importance ??
            "medium",

          sensitivity:
            input.sensitivity ??
            (
              input.scope ===
                "ceo_private" ||
              input.scope ===
                "ifeoluwa_private"
                ? "private"
                : "internal"
            ),

          sourceType:
            input.sourceType,

          workspace:
            input.workspace?.trim() ||
            undefined,

          missionId:
            input.missionId?.trim() ||
            undefined,

          employee:
            input.scope ===
              "ifeoluwa_private"
              ? "Ifeoluwa"
              : input.employee,

          tags:
            uniqueStrings(
              input.tags ?? []
            ),

          allowedEmployees:
            uniqueEmployees(
              input.allowedEmployees ??
              []
            ),

          createdBy:
            input.createdBy,

          createdAt:
            timestamp,

          updatedAt:
            timestamp,

          supersedesMemoryId:
            input.supersedesMemoryId,

          metadata:
            input.metadata,
        };

      return options.storage.create(
        memory
      );
    },

    async updateMemory(
      id,
      updates
    ): Promise<RoyalOSMemory> {
      validateUpdateInput(updates);

      await getRequiredMemory(id);

      const normalizedUpdates:
        Partial<RoyalOSMemory> = {
          ...updates,

          updatedAt:
            nowIso(),
        };

      if (
        updates.title !== undefined
      ) {
        normalizedUpdates.title =
          updates.title.trim();
      }

      if (
        updates.content !== undefined
      ) {
        normalizedUpdates.content =
          updates.content.trim();
      }

      if (
        updates.summary !== undefined
      ) {
        normalizedUpdates.summary =
          updates.summary.trim() ||
          undefined;
      }

      if (
        updates.tags !== undefined
      ) {
        normalizedUpdates.tags =
          uniqueStrings(
            updates.tags
          );
      }

      if (
        updates.allowedEmployees !==
        undefined
      ) {
        normalizedUpdates
          .allowedEmployees =
          uniqueEmployees(
            updates.allowedEmployees
          );
      }

      if (
        updates.workspace !== undefined
      ) {
        normalizedUpdates.workspace =
          updates.workspace.trim() ||
          undefined;
      }

      if (
        updates.missionId !== undefined
      ) {
        normalizedUpdates.missionId =
          updates.missionId.trim() ||
          undefined;
      }

      return options.storage.update(
        id,
        normalizedUpdates
      );
    },

    async approveMemory(
      id,
      approvedBy
    ): Promise<RoyalOSMemory> {
      const memory =
        await getRequiredMemory(id);

      if (
        memory.status === "rejected" ||
        memory.status === "archived"
      ) {
        throw new Error(
          `RoyalOS cannot approve a ${memory.status} memory.`
        );
      }

      return options.storage.update(
        id,
        {
          status: "approved",
          approvedAt: nowIso(),
          updatedAt: nowIso(),
          metadata: {
            ...(memory.metadata ?? {}),
            approvedBy,
          },
        }
      );
    },

    async archiveMemory(
      id
    ): Promise<RoyalOSMemory> {
      await getRequiredMemory(id);

      const timestamp =
        nowIso();

      return options.storage.update(
        id,
        {
          status: "archived",
          archivedAt: timestamp,
          updatedAt: timestamp,
        }
      );
    },

    async supersedeMemory(
      oldMemoryId,
      replacement
    ): Promise<{
      oldMemory: RoyalOSMemory;
      newMemory: RoyalOSMemory;
    }> {
      const oldMemory =
        await getRequiredMemory(
          oldMemoryId
        );

      const newMemory =
        await this.createMemory({
          ...replacement,

          supersedesMemoryId:
            oldMemory.id,
        });

      const updatedOldMemory =
        await options.storage.update(
          oldMemory.id,
          {
            status: "superseded",
            updatedAt: nowIso(),
            metadata: {
              ...(oldMemory.metadata ??
                {}),
              replacedByMemoryId:
                newMemory.id,
            },
          }
        );

      return {
        oldMemory:
          updatedOldMemory,

        newMemory,
      };
    },

    async retrieveMemories(
      query
    ): Promise<RoyalOSMemoryBundle> {
      const memories =
        await options.storage.list();

      const limit =
        clampInteger(
          query.limit,
          maxSelectedMemories,
          1,
          maxSelectedMemories
        );

      const accessibleMatches =
        memories
          .filter((memory) =>
            canAccessMemory(
              memory,
              query.requester,
              query.includePrivate ??
                false
            )
          )
          .filter((memory) =>
            matchesFilters(
              memory,
              query,
              includeProposedByDefault
            )
          )
          .map((memory) =>
            calculateMemoryScore(
              memory,
              query
            )
          )
          .filter((match) => {
            const queryHasTerms =
              tokenize(
                query.query
              ).length > 0;

            return (
              !queryHasTerms ||
              match.matchedTerms
                .length > 0 ||
              match.score >= 100
            );
          })
          .sort((a, b) => {
            if (
              b.score !== a.score
            ) {
              return (
                b.score - a.score
              );
            }

            return (
              new Date(
                b.memory.updatedAt
              ).getTime() -
              new Date(
                a.memory.updatedAt
              ).getTime()
            );
          })
          .slice(0, limit);

      const bundle =
        buildMemoryBundle(
          accessibleMatches,
          query,
          maxMemoryCharacters
        );

      console.log(
        "RoyalOS Memory Engine retrieval:",
        {
          requester:
            query.requester,

          workspace:
            query.workspace,

          missionId:
            query.missionId,

          memoriesFound:
            bundle.memoriesFound,

          memoriesSelected:
            bundle.memoriesSelected,

          selectedMemoryIds:
            bundle.selectedMemoryIds,
        }
      );

      return bundle;
    },

    async getMemory(
      id
    ): Promise<RoyalOSMemory | null> {
      return options.storage.getById(
        id
      );
    },
  };
}

/**
 * Simple temporary in-memory storage adapter.
 *
 * This is useful for local development and tests.
 * Memories disappear when the server restarts.
 *
 * The next storage adapter will connect this engine
 * to Supabase for permanent memory.
 */
export function createInMemoryStorageAdapter(
  initialMemories: RoyalOSMemory[] = []
): RoyalOSMemoryStorageAdapter {
  const memories =
    new Map<string, RoyalOSMemory>(
      initialMemories.map(
        (memory) => [
          memory.id,
          {
            ...memory,
            tags: [...memory.tags],
            allowedEmployees: [
              ...memory.allowedEmployees,
            ],
          },
        ]
      )
    );

  return {
    async create(
      memory
    ): Promise<RoyalOSMemory> {
      if (
        memories.has(memory.id)
      ) {
        throw new Error(
          `RoyalOS memory already exists: ${memory.id}`
        );
      }

      memories.set(
        memory.id,
        memory
      );

      return memory;
    },

    async update(
      id,
      updates
    ): Promise<RoyalOSMemory> {
      const existing =
        memories.get(id);

      if (!existing) {
        throw new Error(
          `RoyalOS memory was not found: ${id}`
        );
      }

      const updatedMemory:
        RoyalOSMemory = {
          ...existing,
          ...updates,

          tags:
            updates.tags
              ? [...updates.tags]
              : [...existing.tags],

          allowedEmployees:
            updates.allowedEmployees
              ? [
                  ...updates.allowedEmployees,
                ]
              : [
                  ...existing.allowedEmployees,
                ],
        };

      memories.set(
        id,
        updatedMemory
      );

      return updatedMemory;
    },

    async getById(
      id
    ): Promise<RoyalOSMemory | null> {
      return memories.get(id) ??
        null;
    },

    async list(): Promise<
      RoyalOSMemory[]
    > {
      return Array.from(
        memories.values()
      );
    },

    async delete(
      id
    ): Promise<void> {
      memories.delete(id);
    },
  };
}