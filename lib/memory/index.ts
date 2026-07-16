import {
  createRoyalOSMemoryEngine,
  type CreateRoyalOSMemoryInput,
  type RoyalOSMemory,
  type RoyalOSMemoryBundle,
  type RoyalOSMemoryEngine,
  type RoyalOSMemoryQuery,
  type UpdateRoyalOSMemoryInput,
} from "./engine";

import {
  createSupabaseMemoryAdapter,
} from "./supabaseAdapter";

import {
  getSupabaseAdminClient,
} from "../supabase/admin";

/**
 * Cached permanent RoyalOS Memory Engine.
 *
 * The engine uses:
 *
 * lib/supabase/admin.ts
 *          ↓
 * lib/memory/supabaseAdapter.ts
 *          ↓
 * lib/memory/engine.ts
 *          ↓
 * public.royalos_memories
 */
let cachedMemoryEngine:
  | RoyalOSMemoryEngine
  | null = null;

export type RoyalOSMemoryHealthResult = {
  connected: boolean;

  table:
    | "royalos_memories";

  memoriesAccessible: number;

  checkedAt: string;

  error?: string;
};

export type SaveMissionMemoryInput = {
  missionId: string;

  workspace: string;

  title: string;

  content: string;

  summary?: string;

  createdBy:
    CreateRoyalOSMemoryInput["createdBy"];

  employee?:
    CreateRoyalOSMemoryInput["employee"];

  tags?: string[];

  approved?: boolean;

  importance?:
    CreateRoyalOSMemoryInput["importance"];

  metadata?:
    CreateRoyalOSMemoryInput["metadata"];
};

export type SaveExecutiveBriefingMemoryInput = {
  missionId: string;

  workspace: string;

  title: string;

  briefing: string;

  leadEmployee:
    NonNullable<
      CreateRoyalOSMemoryInput["employee"]
    >;

  summary?: string;

  tags?: string[];

  approved?: boolean;

  metadata?:
    CreateRoyalOSMemoryInput["metadata"];
};

export type SaveCEOPrivateMemoryInput = {
  title: string;

  content: string;

  summary?: string;

  tags?: string[];

  importance?:
    CreateRoyalOSMemoryInput["importance"];

  metadata?:
    CreateRoyalOSMemoryInput["metadata"];
};

export type SaveIfeoluwaPrivateMemoryInput = {
  title: string;

  content: string;

  summary?: string;

  tags?: string[];

  importance?:
    CreateRoyalOSMemoryInput["importance"];

  metadata?:
    CreateRoyalOSMemoryInput["metadata"];
};

export type RetrieveEmployeeMemoriesInput = {
  query: string;

  requester:
    RoyalOSMemoryQuery["requester"];

  workspace?: string;

  missionId?: string;

  employee?:
    RoyalOSMemoryQuery["employee"];

  limit?: number;

  includePrivate?: boolean;

  tags?: string[];
};

function cleanValue(
  value: string
): string {
  return value.trim();
}

function requireValue(
  value: string,
  fieldName: string
): string {
  const normalizedValue =
    cleanValue(value);

  if (!normalizedValue) {
    throw new Error(
      `RoyalOS Memory Service requires ${fieldName}.`
    );
  }

  return normalizedValue;
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

/**
 * Returns the permanent RoyalOS Memory Engine.
 *
 * This function must only be used from server-side code.
 */
export function getRoyalOSMemoryEngine():
  RoyalOSMemoryEngine {
  if (
    typeof window !== "undefined"
  ) {
    throw new Error(
      "The RoyalOS Memory Engine cannot be used in the browser."
    );
  }

  if (cachedMemoryEngine) {
    return cachedMemoryEngine;
  }

  const supabase =
    getSupabaseAdminClient();

  const storage =
    createSupabaseMemoryAdapter({
      supabase,

      tableName:
        "royalos_memories",
    });

  cachedMemoryEngine =
    createRoyalOSMemoryEngine({
      storage,

      maxSelectedMemories: 20,

      maxMemoryCharacters:
        60_000,

      includeProposedByDefault:
        false,
    });

  return cachedMemoryEngine;
}

/**
 * Creates a permanent RoyalOS memory.
 */
export async function createRoyalOSMemory(
  input: CreateRoyalOSMemoryInput
): Promise<RoyalOSMemory> {
  const engine =
    getRoyalOSMemoryEngine();

  return engine.createMemory(
    input
  );
}

/**
 * Updates an existing RoyalOS memory.
 */
export async function updateRoyalOSMemory(
  id: string,
  updates: UpdateRoyalOSMemoryInput
): Promise<RoyalOSMemory> {
  const memoryId =
    requireValue(
      id,
      "a memory ID"
    );

  const engine =
    getRoyalOSMemoryEngine();

  return engine.updateMemory(
    memoryId,
    updates
  );
}

/**
 * Retrieves one memory by its ID.
 */
export async function getRoyalOSMemory(
  id: string
): Promise<RoyalOSMemory | null> {
  const memoryId =
    requireValue(
      id,
      "a memory ID"
    );

  const engine =
    getRoyalOSMemoryEngine();

  return engine.getMemory(
    memoryId
  );
}

/**
 * Approves a proposed or verified memory.
 */
export async function approveRoyalOSMemory(
  id: string,
  approvedBy:
    | "CEO"
    | Exclude<
        CreateRoyalOSMemoryInput["createdBy"],
        "RoyalOS" | "Ifeoluwa"
      >
): Promise<RoyalOSMemory> {
  const memoryId =
    requireValue(
      id,
      "a memory ID"
    );

  const engine =
    getRoyalOSMemoryEngine();

  return engine.approveMemory(
    memoryId,
    approvedBy
  );
}

/**
 * Archives a memory without deleting its history.
 */
export async function archiveRoyalOSMemory(
  id: string
): Promise<RoyalOSMemory> {
  const memoryId =
    requireValue(
      id,
      "a memory ID"
    );

  const engine =
    getRoyalOSMemoryEngine();

  return engine.archiveMemory(
    memoryId
  );
}

/**
 * Replaces an outdated memory while preserving
 * the historical relationship between both records.
 */
export async function supersedeRoyalOSMemory(
  oldMemoryId: string,
  replacement:
    CreateRoyalOSMemoryInput
): Promise<{
  oldMemory: RoyalOSMemory;
  newMemory: RoyalOSMemory;
}> {
  const normalizedOldMemoryId =
    requireValue(
      oldMemoryId,
      "the old memory ID"
    );

  const engine =
    getRoyalOSMemoryEngine();

  return engine.supersedeMemory(
    normalizedOldMemoryId,
    replacement
  );
}

/**
 * Retrieves relevant memories for an employee,
 * mission, workspace, CEO request, or Ifeoluwa
 * private conversation.
 */
export async function retrieveRoyalOSMemories(
  query: RoyalOSMemoryQuery
): Promise<RoyalOSMemoryBundle> {
  const normalizedQuery =
    cleanValue(query.query);

  const engine =
    getRoyalOSMemoryEngine();

  return engine.retrieveMemories({
    ...query,

    query:
      normalizedQuery,
  });
}

/**
 * Convenient retrieval helper used by employees
 * and orchestration systems.
 */
export async function retrieveEmployeeMemories(
  input: RetrieveEmployeeMemoriesInput
): Promise<RoyalOSMemoryBundle> {
  return retrieveRoyalOSMemories({
    query:
      input.query,

    requester:
      input.requester,

    workspace:
      input.workspace,

    missionId:
      input.missionId,

    employee:
      input.employee,

    scopes: [
      "company",
      "workspace",
      "mission",
      "employee",
    ],

    statuses: [
      "verified",
      "approved",
      "active",
    ],

    tags:
      input.tags,

    limit:
      input.limit ?? 12,

    includePrivate:
      input.includePrivate ??
      false,
  });
}

/**
 * Saves a mission event, decision, result, or
 * lesson as permanent organizational memory.
 */
export async function saveMissionMemory(
  input: SaveMissionMemoryInput
): Promise<RoyalOSMemory> {
  const missionId =
    requireValue(
      input.missionId,
      "a mission ID"
    );

  const workspace =
    requireValue(
      input.workspace,
      "a workspace"
    );

  const title =
    requireValue(
      input.title,
      "a memory title"
    );

  const content =
    requireValue(
      input.content,
      "memory content"
    );

  return createRoyalOSMemory({
    title,

    content,

    summary:
      input.summary?.trim() ||
      undefined,

    scope:
      "mission",

    status:
      input.approved
        ? "approved"
        : "proposed",

    importance:
      input.importance ??
      "high",

    sensitivity:
      "internal",

    sourceType:
      "mission",

    workspace,

    missionId,

    employee:
      input.employee,

    tags:
      uniqueStrings([
        "mission",
        workspace,
        ...(input.tags ?? []),
      ]),

    allowedEmployees: [],

    createdBy:
      input.createdBy,

    metadata:
      input.metadata,
  });
}

/**
 * Saves the final executive briefing produced
 * by the lead employee.
 */
export async function saveExecutiveBriefingMemory(
  input:
    SaveExecutiveBriefingMemoryInput
): Promise<RoyalOSMemory> {
  const missionId =
    requireValue(
      input.missionId,
      "a mission ID"
    );

  const workspace =
    requireValue(
      input.workspace,
      "a workspace"
    );

  const title =
    requireValue(
      input.title,
      "an executive briefing title"
    );

  const briefing =
    requireValue(
      input.briefing,
      "an executive briefing"
    );

  return createRoyalOSMemory({
    title,

    content:
      briefing,

    summary:
      input.summary?.trim() ||
      undefined,

    scope:
      "mission",

    status:
      input.approved
        ? "approved"
        : "proposed",

    importance:
      "high",

    sensitivity:
      "confidential",

    sourceType:
      "executive_briefing",

    workspace,

    missionId,

    employee:
      input.leadEmployee,

    tags:
      uniqueStrings([
        "executive briefing",
        "mission result",
        input.leadEmployee,
        workspace,
        ...(input.tags ?? []),
      ]),

    allowedEmployees: [
      input.leadEmployee,
    ],

    createdBy:
      input.leadEmployee,

    metadata:
      input.metadata,
  });
}

/**
 * Saves information that only the CEO should
 * automatically access.
 *
 * Other executives cannot retrieve this scope.
 */
export async function saveCEOPrivateMemory(
  input: SaveCEOPrivateMemoryInput
): Promise<RoyalOSMemory> {
  const title =
    requireValue(
      input.title,
      "a private memory title"
    );

  const content =
    requireValue(
      input.content,
      "private memory content"
    );

  return createRoyalOSMemory({
    title,

    content,

    summary:
      input.summary?.trim() ||
      undefined,

    scope:
      "ceo_private",

    status:
      "active",

    importance:
      input.importance ??
      "high",

    sensitivity:
      "private",

    sourceType:
      "ceo_statement",

    tags:
      uniqueStrings([
        "ceo private",
        ...(input.tags ?? []),
      ]),

    allowedEmployees: [],

    createdBy:
      "CEO",

    metadata:
      input.metadata,
  });
}

/**
 * Saves a private CEO conversation memory for
 * Ifeoluwa.
 *
 * It is accessible to:
 * - the CEO;
 * - Ifeoluwa when private access is enabled.
 *
 * It is not automatically accessible by Adedeji
 * or any other RoyalOS executive.
 */
export async function saveIfeoluwaPrivateMemory(
  input:
    SaveIfeoluwaPrivateMemoryInput
): Promise<RoyalOSMemory> {
  const title =
    requireValue(
      input.title,
      "an Ifeoluwa memory title"
    );

  const content =
    requireValue(
      input.content,
      "Ifeoluwa memory content"
    );

  return createRoyalOSMemory({
    title,

    content,

    summary:
      input.summary?.trim() ||
      undefined,

    scope:
      "ifeoluwa_private",

    status:
      "active",

    importance:
      input.importance ??
      "high",

    sensitivity:
      "private",

    sourceType:
      "ifeoluwa_conversation",

    employee:
      "Ifeoluwa",

    tags:
      uniqueStrings([
        "Ifeoluwa",
        "private counsel",
        ...(input.tags ?? []),
      ]),

    allowedEmployees: [
      "Ifeoluwa",
    ],

    createdBy:
      "Ifeoluwa",

    metadata:
      input.metadata,
  });
}

/**
 * Retrieves memories available to Ifeoluwa.
 *
 * includePrivate must be true for
 * ifeoluwa_private memories to be returned.
 */
export async function retrieveIfeoluwaMemories(
  query: string,
  limit = 15
): Promise<RoyalOSMemoryBundle> {
  return retrieveRoyalOSMemories({
    query,

    requester:
      "Ifeoluwa",

    employee:
      "Ifeoluwa",

    scopes: [
      "ifeoluwa_private",
      "employee",
      "company",
      "workspace",
    ],

    statuses: [
      "verified",
      "approved",
      "active",
    ],

    limit,

    includePrivate:
      true,
  });
}

/**
 * Retrieves CEO-accessible memories, including
 * private CEO and Ifeoluwa memories.
 *
 * This must only be called from an authenticated
 * server route controlled by the CEO.
 */
export async function retrieveCEOPrivateMemories(
  query: string,
  limit = 20
): Promise<RoyalOSMemoryBundle> {
  return retrieveRoyalOSMemories({
    query,

    requester:
      "CEO",

    scopes: [
      "company",
      "workspace",
      "mission",
      "employee",
      "ceo_private",
      "ifeoluwa_private",
    ],

    statuses: [
      "verified",
      "approved",
      "active",
    ],

    limit,

    includePrivate:
      true,
  });
}

/**
 * Tests the permanent memory connection.
 *
 * This does not create or modify a memory.
 */
export async function checkRoyalOSMemoryHealth():
  Promise<RoyalOSMemoryHealthResult> {
  const checkedAt =
    new Date().toISOString();

  try {
    const engine =
      getRoyalOSMemoryEngine();

    const bundle =
      await engine.retrieveMemories({
        query: "",

        requester:
          "RoyalOS",

        scopes: [
          "company",
          "workspace",
          "mission",
          "employee",
        ],

        statuses: [
          "verified",
          "approved",
          "active",
        ],

        limit: 1,

        includePrivate:
          false,
      });

    return {
      connected:
        true,

      table:
        "royalos_memories",

      memoriesAccessible:
        bundle.memoriesFound,

      checkedAt,
    };
  } catch (error) {
    return {
      connected:
        false,

      table:
        "royalos_memories",

      memoriesAccessible:
        0,

      checkedAt,

      error:
        error instanceof Error
          ? error.message
          : "Unknown RoyalOS Memory connection error.",
    };
  }
}

/**
 * Clears the locally cached engine instance.
 *
 * This does not delete stored database memories.
 * It is only useful during isolated tests or
 * environment-variable changes.
 */
export function resetRoyalOSMemoryEngine():
  void {
  cachedMemoryEngine = null;
} 