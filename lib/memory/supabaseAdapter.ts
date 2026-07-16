import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  RoyalOSMemory,
  RoyalOSMemoryImportance,
  RoyalOSMemoryScope,
  RoyalOSMemorySensitivity,
  RoyalOSMemorySourceType,
  RoyalOSMemoryStatus,
  RoyalOSMemoryStorageAdapter,
} from "./engine";

export type CreateSupabaseMemoryAdapterOptions = {
  supabase: SupabaseClient;

  /**
   * Supabase table containing RoyalOS memories.
   */
  tableName?: string;
};

type MemoryEmployee =
  RoyalOSMemory["employee"];

type MemoryCreator =
  RoyalOSMemory["createdBy"];

type MemoryMetadata =
  RoyalOSMemory["metadata"];

type SupabaseMemoryRow = {
  id: string;

  title: string;

  content: string;

  summary: string | null;

  scope: RoyalOSMemoryScope;

  status: RoyalOSMemoryStatus;

  importance: RoyalOSMemoryImportance;

  sensitivity: RoyalOSMemorySensitivity;

  source_type: RoyalOSMemorySourceType;

  workspace: string | null;

  mission_id: string | null;

  employee: MemoryEmployee | null;

  tags: string[] | null;

  allowed_employees: Array<
    NonNullable<MemoryEmployee>
  > | null;

  created_by: MemoryCreator;

  created_at: string;

  updated_at: string;

  verified_at: string | null;

  approved_at: string | null;

  archived_at: string | null;

  supersedes_memory_id: string | null;

  metadata: MemoryMetadata | null;
};

type SupabaseMemoryInsert = {
  id: string;

  title: string;

  content: string;

  summary: string | null;

  scope: RoyalOSMemoryScope;

  status: RoyalOSMemoryStatus;

  importance: RoyalOSMemoryImportance;

  sensitivity: RoyalOSMemorySensitivity;

  source_type: RoyalOSMemorySourceType;

  workspace: string | null;

  mission_id: string | null;

  employee: MemoryEmployee | null;

  tags: string[];

  allowed_employees: Array<
    NonNullable<MemoryEmployee>
  >;

  created_by: MemoryCreator;

  created_at: string;

  updated_at: string;

  verified_at: string | null;

  approved_at: string | null;

  archived_at: string | null;

  supersedes_memory_id: string | null;

  metadata: MemoryMetadata | null;
};

type SupabaseMemoryUpdate =
  Partial<SupabaseMemoryInsert>;

const DEFAULT_TABLE_NAME =
  "royalos_memories";

function describeSupabaseError(
  operation: string,
  error: {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  }
): Error {
  const information = [
    error.message,
    error.details,
    error.hint,
    error.code
      ? `Code: ${error.code}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" | ");

  return new Error(
    `RoyalOS Supabase memory ${operation} failed${
      information
        ? `: ${information}`
        : "."
    }`
  );
}

function rowToMemory(
  row: SupabaseMemoryRow
): RoyalOSMemory {
  return {
    id:
      row.id,

    title:
      row.title,

    content:
      row.content,

    summary:
      row.summary ?? undefined,

    scope:
      row.scope,

    status:
      row.status,

    importance:
      row.importance,

    sensitivity:
      row.sensitivity,

    sourceType:
      row.source_type,

    workspace:
      row.workspace ?? undefined,

    missionId:
      row.mission_id ?? undefined,

    employee:
      row.employee ?? undefined,

    tags:
      Array.isArray(row.tags)
        ? row.tags
        : [],

    allowedEmployees:
      Array.isArray(
        row.allowed_employees
      )
        ? row.allowed_employees
        : [],

    createdBy:
      row.created_by,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,

    verifiedAt:
      row.verified_at ?? undefined,

    approvedAt:
      row.approved_at ?? undefined,

    archivedAt:
      row.archived_at ?? undefined,

    supersedesMemoryId:
      row.supersedes_memory_id ??
      undefined,

    metadata:
      row.metadata ?? undefined,
  };
}

function memoryToInsert(
  memory: RoyalOSMemory
): SupabaseMemoryInsert {
  return {
    id:
      memory.id,

    title:
      memory.title,

    content:
      memory.content,

    summary:
      memory.summary ?? null,

    scope:
      memory.scope,

    status:
      memory.status,

    importance:
      memory.importance,

    sensitivity:
      memory.sensitivity,

    source_type:
      memory.sourceType,

    workspace:
      memory.workspace ?? null,

    mission_id:
      memory.missionId ?? null,

    employee:
      memory.employee ?? null,

    tags:
      [...memory.tags],

    allowed_employees:
      [...memory.allowedEmployees],

    created_by:
      memory.createdBy,

    created_at:
      memory.createdAt,

    updated_at:
      memory.updatedAt,

    verified_at:
      memory.verifiedAt ?? null,

    approved_at:
      memory.approvedAt ?? null,

    archived_at:
      memory.archivedAt ?? null,

    supersedes_memory_id:
      memory.supersedesMemoryId ??
      null,

    metadata:
      memory.metadata ?? null,
  };
}

function memoryUpdatesToRow(
  updates: Partial<RoyalOSMemory>
): SupabaseMemoryUpdate {
  const row: SupabaseMemoryUpdate = {};

  if (updates.id !== undefined) {
    row.id = updates.id;
  }

  if (updates.title !== undefined) {
    row.title = updates.title;
  }

  if (updates.content !== undefined) {
    row.content = updates.content;
  }

  if (updates.summary !== undefined) {
    row.summary =
      updates.summary ?? null;
  }

  if (updates.scope !== undefined) {
    row.scope = updates.scope;
  }

  if (updates.status !== undefined) {
    row.status = updates.status;
  }

  if (
    updates.importance !== undefined
  ) {
    row.importance =
      updates.importance;
  }

  if (
    updates.sensitivity !== undefined
  ) {
    row.sensitivity =
      updates.sensitivity;
  }

  if (
    updates.sourceType !== undefined
  ) {
    row.source_type =
      updates.sourceType;
  }

  if (updates.workspace !== undefined) {
    row.workspace =
      updates.workspace ?? null;
  }

  if (updates.missionId !== undefined) {
    row.mission_id =
      updates.missionId ?? null;
  }

  if (updates.employee !== undefined) {
    row.employee =
      updates.employee ?? null;
  }

  if (updates.tags !== undefined) {
    row.tags = [...updates.tags];
  }

  if (
    updates.allowedEmployees !==
    undefined
  ) {
    row.allowed_employees = [
      ...updates.allowedEmployees,
    ];
  }

  if (
    updates.createdBy !== undefined
  ) {
    row.created_by =
      updates.createdBy;
  }

  if (
    updates.createdAt !== undefined
  ) {
    row.created_at =
      updates.createdAt;
  }

  if (
    updates.updatedAt !== undefined
  ) {
    row.updated_at =
      updates.updatedAt;
  }

  if (
    updates.verifiedAt !== undefined
  ) {
    row.verified_at =
      updates.verifiedAt ?? null;
  }

  if (
    updates.approvedAt !== undefined
  ) {
    row.approved_at =
      updates.approvedAt ?? null;
  }

  if (
    updates.archivedAt !== undefined
  ) {
    row.archived_at =
      updates.archivedAt ?? null;
  }

  if (
    updates.supersedesMemoryId !==
    undefined
  ) {
    row.supersedes_memory_id =
      updates.supersedesMemoryId ??
      null;
  }

  if (updates.metadata !== undefined) {
    row.metadata =
      updates.metadata ?? null;
  }

  return row;
}

function assertMemoryRow(
  value: unknown,
  operation: string
): SupabaseMemoryRow {
  if (
    !value ||
    typeof value !== "object"
  ) {
    throw new Error(
      `RoyalOS Supabase memory ${operation} returned no usable record.`
    );
  }

  return value as SupabaseMemoryRow;
}

function assertMemoryRows(
  value: unknown,
  operation: string
): SupabaseMemoryRow[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `RoyalOS Supabase memory ${operation} returned an invalid record list.`
    );
  }

  return value as SupabaseMemoryRow[];
}

/**
 * Creates a permanent Supabase-backed storage adapter
 * for the RoyalOS Memory Engine.
 *
 * The adapter does not decide who may access a memory.
 * Access rules remain centralized inside engine.ts.
 *
 * Supabase Row Level Security must also be enabled
 * as a second database-level protection layer.
 */
export function createSupabaseMemoryAdapter(
  options: CreateSupabaseMemoryAdapterOptions
): RoyalOSMemoryStorageAdapter {
  const tableName =
    options.tableName?.trim() ||
    DEFAULT_TABLE_NAME;

  return {
    async create(
      memory
    ): Promise<RoyalOSMemory> {
      const insert =
        memoryToInsert(memory);

      const {
        data,
        error,
      } = await options.supabase
        .from(tableName)
        .insert(insert)
        .select("*")
        .single();

      if (error) {
        throw describeSupabaseError(
          "creation",
          error
        );
      }

      return rowToMemory(
        assertMemoryRow(
          data,
          "creation"
        )
      );
    },

    async update(
      id,
      updates
    ): Promise<RoyalOSMemory> {
      const normalizedId =
        id.trim();

      if (!normalizedId) {
        throw new Error(
          "RoyalOS cannot update a memory without an ID."
        );
      }

      const rowUpdates =
        memoryUpdatesToRow(updates);

      if (
        Object.keys(rowUpdates).length ===
        0
      ) {
        const existing =
          await this.getById(
            normalizedId
          );

        if (!existing) {
          throw new Error(
            `RoyalOS memory was not found: ${normalizedId}`
          );
        }

        return existing;
      }

      const {
        data,
        error,
      } = await options.supabase
        .from(tableName)
        .update(rowUpdates)
        .eq("id", normalizedId)
        .select("*")
        .single();

      if (error) {
        throw describeSupabaseError(
          "update",
          error
        );
      }

      return rowToMemory(
        assertMemoryRow(
          data,
          "update"
        )
      );
    },

    async getById(
      id
    ): Promise<RoyalOSMemory | null> {
      const normalizedId =
        id.trim();

      if (!normalizedId) {
        return null;
      }

      const {
        data,
        error,
      } = await options.supabase
        .from(tableName)
        .select("*")
        .eq("id", normalizedId)
        .maybeSingle();

      if (error) {
        throw describeSupabaseError(
          "lookup",
          error
        );
      }

      if (!data) {
        return null;
      }

      return rowToMemory(
        assertMemoryRow(
          data,
          "lookup"
        )
      );
    },

    async list(): Promise<
      RoyalOSMemory[]
    > {
      const {
        data,
        error,
      } = await options.supabase
        .from(tableName)
        .select("*")
        .order(
          "updated_at",
          {
            ascending: false,
          }
        );

      if (error) {
        throw describeSupabaseError(
          "listing",
          error
        );
      }

      const rows =
        assertMemoryRows(
          data ?? [],
          "listing"
        );

      return rows.map(
        rowToMemory
      );
    },

    async delete(
      id
    ): Promise<void> {
      const normalizedId =
        id.trim();

      if (!normalizedId) {
        throw new Error(
          "RoyalOS cannot delete a memory without an ID."
        );
      }

      const {
        error,
      } = await options.supabase
        .from(tableName)
        .delete()
        .eq("id", normalizedId);

      if (error) {
        throw describeSupabaseError(
          "deletion",
          error
        );
      }
    },
  };
}