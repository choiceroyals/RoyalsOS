import "server-only";

import {
  ROYALOS_TOOL_AUDIT_EVENT_TYPES,
  type RoyalOSToolAuditEvent,
  type RoyalOSToolAuditEventType,
} from "@/lib/tools/types";

import {
  isRoyalOSEmployeeName,
  isRoyalOSWorkspace,
  type RoyalOSEmployeeName,
  type RoyalOSJsonObject,
  type RoyalOSJsonValue,
  type RoyalOSWorkspace,
} from "@/lib/missions/types";

/*
 * ============================================================
 * AUDIT INPUT AND FILTER TYPES
 * ============================================================
 */

export type CreateRoyalOSToolAuditEventInput = {
  eventType:
    RoyalOSToolAuditEventType;

  actionId?: string;

  missionId?: string;

  toolId?: string;

  employee?:
    RoyalOSEmployeeName;

  workspace?:
    RoyalOSWorkspace;

  message:
    string;

  timestamp?: string;

  details?:
    RoyalOSJsonObject;
};

export type RoyalOSToolAuditFilters = {
  eventType?:
    | RoyalOSToolAuditEventType
    | RoyalOSToolAuditEventType[];

  actionId?: string;

  missionId?: string;

  toolId?: string;

  employee?:
    RoyalOSEmployeeName;

  workspace?:
    RoyalOSWorkspace;

  search?: string;

  createdAfter?: string;

  createdBefore?: string;

  order?:
    | "newest"
    | "oldest";

  limit?: number;

  offset?: number;
};

export type RoyalOSToolAuditListResult = {
  events:
    RoyalOSToolAuditEvent[];

  count: number;

  limit: number;

  offset: number;
};

export type RoyalOSToolAuditSummary = {
  totalEvents: number;

  successfulEvents: number;

  failedEvents: number;

  approvalEvents: number;

  eventsByType:
    Partial<
      Record<
        RoyalOSToolAuditEventType,
        number
      >
    >;

  eventsByEmployee:
    Partial<
      Record<
        RoyalOSEmployeeName,
        number
      >
    >;

  eventsByWorkspace:
    Partial<
      Record<
        RoyalOSWorkspace,
        number
      >
    >;
};

/*
 * ============================================================
 * GLOBAL AUDIT STORAGE
 * ============================================================
 *
 * This is temporary server memory storage.
 *
 * Supabase persistence will replace or extend this during
 * the database phase.
 */

declare global {
  var __royalOSToolAuditEvents:
    | RoyalOSToolAuditEvent[]
    | undefined;
}

const auditEvents =
  globalThis
    .__royalOSToolAuditEvents ??
  [];

if (
  process.env.NODE_ENV !==
  "production"
) {
  globalThis
    .__royalOSToolAuditEvents =
    auditEvents;
}

const MAX_MEMORY_AUDIT_EVENTS =
  5_000;

/*
 * ============================================================
 * INTERNAL HELPERS
 * ============================================================
 */

function cleanRequiredText(
  value: unknown,
  fieldName: string
): string {
  const cleaned =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!cleaned) {
    throw new Error(
      `${fieldName} is required for a RoyalOS audit event.`
    );
  }

  return cleaned;
}

function cleanOptionalText(
  value: unknown
): string | undefined {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const cleaned =
    value.trim();

  return cleaned ||
    undefined;
}

function createAuditEventId():
  string {
  if (
    typeof globalThis.crypto !==
      "undefined" &&
    typeof globalThis.crypto
      .randomUUID ===
      "function"
  ) {
    return globalThis.crypto
      .randomUUID();
  }

  return `audit_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function isRoyalOSToolAuditEventType(
  value: unknown
): value is RoyalOSToolAuditEventType {
  return (
    typeof value ===
      "string" &&
    ROYALOS_TOOL_AUDIT_EVENT_TYPES.includes(
      value as
        RoyalOSToolAuditEventType
    )
  );
}

function normalizeDate(
  value: unknown,
  fallback?: string
): string {
  if (
    typeof value ===
      "string" &&
    value.trim()
  ) {
    const parsed =
      new Date(value);

    if (
      !Number.isNaN(
        parsed.getTime()
      )
    ) {
      return parsed
        .toISOString();
    }
  }

  if (fallback) {
    return fallback;
  }

  return new Date()
    .toISOString();
}

function cloneJsonValue(
  value:
    RoyalOSJsonValue |
    undefined
):
  | RoyalOSJsonValue
  | undefined {
  if (
    value === null ||
    typeof value ===
      "string" ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean" ||
    value === undefined
  ) {
    return value;
  }

 if (
  Array.isArray(value)
) {
  return value.map(
    (item) =>
      cloneJsonValue(
        item
      ) ?? null
  );
}

  const result:
    RoyalOSJsonObject = {};

  for (
    const [
      key,
      item,
    ] of Object.entries(
      value
    )
  ) {
    result[key] =
      cloneJsonValue(
        item
      );
  }

  return result;
}

function cloneAuditEvent(
  event:
    RoyalOSToolAuditEvent
): RoyalOSToolAuditEvent {
  return {
    ...event,

    details:
      event.details
        ? cloneJsonValue(
            event.details
          ) as
            RoyalOSJsonObject
        : undefined,
  };
}

/*
 * Never store secrets inside audit logs.
 */

const sensitiveKeyFragments = [
  "password",
  "secret",
  "token",
  "apikey",
  "api_key",
  "authorization",
  "cookie",
  "privatekey",
  "private_key",
  "service_role",
];

function isSensitiveKey(
  key: string
): boolean {
  const normalized =
    key
      .toLowerCase()
      .replace(
        /[\s-]/g,
        "_"
      );

  return sensitiveKeyFragments
    .some(
      (fragment) =>
        normalized.includes(
          fragment
        )
    );
}

function redactAuditValue(
  value:
    RoyalOSJsonValue |
    undefined
):
  | RoyalOSJsonValue
  | undefined {
  if (
    value === null ||
    typeof value ===
      "string" ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean" ||
    value === undefined
  ) {
    return value;
  }

  if (
  Array.isArray(value)
) {
  return value.map(
    (item) =>
      redactAuditValue(
        item
      ) ?? null
  );
}
  const redacted:
    RoyalOSJsonObject = {};

  for (
    const [
      key,
      item,
    ] of Object.entries(
      value
    )
  ) {
    redacted[key] =
      isSensitiveKey(key)
        ? "[REDACTED]"
        : redactAuditValue(
            item
          );
  }

  return redacted;
}

function normalizeLimit(
  value: number | undefined
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return 50;
  }

  return Math.min(
    500,
    Math.max(
      1,
      Math.floor(value)
    )
  );
}

function normalizeOffset(
  value: number | undefined
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(value)
  );
}

/*
 * ============================================================
 * CREATE AUDIT EVENT
 * ============================================================
 */

export function recordRoyalOSToolAuditEvent(
  input:
    CreateRoyalOSToolAuditEventInput
): RoyalOSToolAuditEvent {
  if (
    !isRoyalOSToolAuditEventType(
      input.eventType
    )
  ) {
    throw new Error(
      "RoyalOS received an invalid tool audit event type."
    );
  }

  if (
    input.employee !==
      undefined &&
    !isRoyalOSEmployeeName(
      input.employee
    )
  ) {
    throw new Error(
      "RoyalOS received an invalid employee for the tool audit event."
    );
  }

  if (
    input.workspace !==
      undefined &&
    !isRoyalOSWorkspace(
      input.workspace
    )
  ) {
    throw new Error(
      "RoyalOS received an invalid workspace for the tool audit event."
    );
  }

  const message =
    cleanRequiredText(
      input.message,
      "Audit message"
    );

  const details =
    input.details
      ? redactAuditValue(
          input.details
        ) as
          RoyalOSJsonObject
      : undefined;

  const event:
    RoyalOSToolAuditEvent = {
      eventId:
        createAuditEventId(),

      eventType:
        input.eventType,

      message,

      timestamp:
        normalizeDate(
          input.timestamp
        ),
  };

  const actionId =
    cleanOptionalText(
      input.actionId
    );

  const missionId =
    cleanOptionalText(
      input.missionId
    );

  const toolId =
    cleanOptionalText(
      input.toolId
    );

  if (actionId) {
    event.actionId =
      actionId;
  }

  if (missionId) {
    event.missionId =
      missionId;
  }

  if (toolId) {
    event.toolId =
      toolId;
  }

  if (input.employee) {
    event.employee =
      input.employee;
  }

  if (input.workspace) {
    event.workspace =
      input.workspace;
  }

  if (details) {
    event.details =
      details;
  }

  auditEvents.push(
    event
  );

  /*
   * Prevent unlimited server-memory growth.
   */

  if (
    auditEvents.length >
    MAX_MEMORY_AUDIT_EVENTS
  ) {
    auditEvents.splice(
      0,
      auditEvents.length -
        MAX_MEMORY_AUDIT_EVENTS
    );
  }

  console.log(
    "RoyalOS tool audit:",
    {
      eventId:
        event.eventId,

      eventType:
        event.eventType,

      actionId:
        event.actionId ??
        null,

      toolId:
        event.toolId ??
        null,

      employee:
        event.employee ??
        null,

      message:
        event.message,
    }
  );

  return cloneAuditEvent(
    event
  );
}

/*
 * ============================================================
 * CONVENIENCE AUDIT FUNCTIONS
 * ============================================================
 */

export function auditRoyalOSToolRequested(
  input: Omit<
    CreateRoyalOSToolAuditEventInput,
    "eventType"
  >
): RoyalOSToolAuditEvent {
  return recordRoyalOSToolAuditEvent({
    ...input,

    eventType:
      "tool_requested",
  });
}

export function auditRoyalOSToolStarted(
  input: Omit<
    CreateRoyalOSToolAuditEventInput,
    "eventType"
  >
): RoyalOSToolAuditEvent {
  return recordRoyalOSToolAuditEvent({
    ...input,

    eventType:
      "tool_started",
  });
}

export function auditRoyalOSToolSucceeded(
  input: Omit<
    CreateRoyalOSToolAuditEventInput,
    "eventType"
  >
): RoyalOSToolAuditEvent {
  return recordRoyalOSToolAuditEvent({
    ...input,

    eventType:
      "tool_succeeded",
  });
}

export function auditRoyalOSToolFailed(
  input: Omit<
    CreateRoyalOSToolAuditEventInput,
    "eventType"
  >
): RoyalOSToolAuditEvent {
  return recordRoyalOSToolAuditEvent({
    ...input,

    eventType:
      "tool_failed",
  });
}

export function auditRoyalOSToolApprovalRequested(
  input: Omit<
    CreateRoyalOSToolAuditEventInput,
    "eventType"
  >
): RoyalOSToolAuditEvent {
  return recordRoyalOSToolAuditEvent({
    ...input,

    eventType:
      "approval_requested",
  });
}

/*
 * ============================================================
 * READ ONE AUDIT EVENT
 * ============================================================
 */

export function getRoyalOSToolAuditEvent(
  eventId: string
): RoyalOSToolAuditEvent | null {
  const cleanedEventId =
    cleanRequiredText(
      eventId,
      "Audit event ID"
    );

  const event =
    auditEvents.find(
      (item) =>
        item.eventId ===
        cleanedEventId
    );

  return event
    ? cloneAuditEvent(
        event
      )
    : null;
}

/*
 * ============================================================
 * LIST AND FILTER AUDIT EVENTS
 * ============================================================
 */

export function listRoyalOSToolAuditEvents(
  filters:
    RoyalOSToolAuditFilters = {}
): RoyalOSToolAuditListResult {
  const limit =
    normalizeLimit(
      filters.limit
    );

  const offset =
    normalizeOffset(
      filters.offset
    );

  const eventTypes =
    filters.eventType
      ? Array.isArray(
          filters.eventType
        )
        ? filters.eventType
        : [
            filters.eventType,
          ]
      : [];

  const search =
    filters.search
      ?.trim()
      .toLowerCase();

  const createdAfter =
    filters.createdAfter
      ? new Date(
          filters.createdAfter
        ).getTime()
      : undefined;

  const createdBefore =
    filters.createdBefore
      ? new Date(
          filters.createdBefore
        ).getTime()
      : undefined;

  const filtered =
    auditEvents
      .filter(
        (event) => {
          if (
            eventTypes.length >
              0 &&
            !eventTypes.includes(
              event.eventType
            )
          ) {
            return false;
          }

          if (
            filters.actionId &&
            event.actionId !==
              filters.actionId
          ) {
            return false;
          }

          if (
            filters.missionId &&
            event.missionId !==
              filters.missionId
          ) {
            return false;
          }

          if (
            filters.toolId &&
            event.toolId !==
              filters.toolId
          ) {
            return false;
          }

          if (
            filters.employee &&
            event.employee !==
              filters.employee
          ) {
            return false;
          }

          if (
            filters.workspace &&
            event.workspace !==
              filters.workspace
          ) {
            return false;
          }

          const timestamp =
            new Date(
              event.timestamp
            ).getTime();

          if (
            createdAfter !==
              undefined &&
            !Number.isNaN(
              createdAfter
            ) &&
            timestamp <
              createdAfter
          ) {
            return false;
          }

          if (
            createdBefore !==
              undefined &&
            !Number.isNaN(
              createdBefore
            ) &&
            timestamp >
              createdBefore
          ) {
            return false;
          }

          if (search) {
            const searchable =
              [
                event.message,
                event.eventType,
                event.actionId ??
                  "",
                event.missionId ??
                  "",
                event.toolId ??
                  "",
                event.employee ??
                  "",
                event.workspace ??
                  "",
              ]
                .join(" ")
                .toLowerCase();

            if (
              !searchable.includes(
                search
              )
            ) {
              return false;
            }
          }

          return true;
        }
      )
      .sort(
        (
          first,
          second
        ) => {
          const firstTime =
            new Date(
              first.timestamp
            ).getTime();

          const secondTime =
            new Date(
              second.timestamp
            ).getTime();

          return filters.order ===
            "oldest"
            ? firstTime -
                secondTime
            : secondTime -
                firstTime;
        }
      );

  return {
    events:
      filtered
        .slice(
          offset,
          offset + limit
        )
        .map(
          cloneAuditEvent
        ),

    count:
      filtered.length,

    limit,

    offset,
  };
}

/*
 * ============================================================
 * ACTION TIMELINE
 * ============================================================
 */

export function getRoyalOSToolActionTimeline(
  actionId: string
): RoyalOSToolAuditEvent[] {
  const cleanedActionId =
    cleanRequiredText(
      actionId,
      "Action ID"
    );

  return listRoyalOSToolAuditEvents({
    actionId:
      cleanedActionId,

    order:
      "oldest",

    limit:
      500,
  }).events;
}

/*
 * ============================================================
 * AUDIT SUMMARY
 * ============================================================
 */

export function getRoyalOSToolAuditSummary(
  filters: Omit<
    RoyalOSToolAuditFilters,
    | "limit"
    | "offset"
    | "order"
  > = {}
): RoyalOSToolAuditSummary {
  const events =
    listRoyalOSToolAuditEvents({
      ...filters,

      limit:
        500,

      offset:
        0,
    }).events;

  const summary:
    RoyalOSToolAuditSummary = {
      totalEvents:
        events.length,

      successfulEvents:
        0,

      failedEvents:
        0,

      approvalEvents:
        0,

      eventsByType:
        {},

      eventsByEmployee:
        {},

      eventsByWorkspace:
        {},
    };

  for (
    const event of events
  ) {
    summary.eventsByType[
      event.eventType
    ] =
      (
        summary
          .eventsByType[
          event.eventType
        ] ??
        0
      ) + 1;

    if (
      event.eventType ===
      "tool_succeeded"
    ) {
      summary.successfulEvents +=
        1;
    }

    if (
      event.eventType ===
      "tool_failed"
    ) {
      summary.failedEvents +=
        1;
    }

    if (
      event.eventType ===
        "approval_requested" ||
      event.eventType ===
        "approval_granted" ||
      event.eventType ===
        "approval_rejected"
    ) {
      summary.approvalEvents +=
        1;
    }

    if (event.employee) {
      summary.eventsByEmployee[
        event.employee
      ] =
        (
          summary
            .eventsByEmployee[
            event.employee
          ] ??
          0
        ) + 1;
    }

    if (event.workspace) {
      summary.eventsByWorkspace[
        event.workspace
      ] =
        (
          summary
            .eventsByWorkspace[
            event.workspace
          ] ??
          0
        ) + 1;
    }
  }

  return summary;
}

/*
 * ============================================================
 * DEVELOPMENT RESET
 * ============================================================
 */

export function clearRoyalOSToolAuditEvents():
  void {
  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    throw new Error(
      "RoyalOS cannot clear all tool audit events in production."
    );
  }

  auditEvents.length =
    0;
}