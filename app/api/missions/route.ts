import {
  createRoyalOSMission,
  listRoyalOSMissions,
} from "@/lib/missions/service";

import {
  isRoyalOSEmployeeName,
  isRoyalOSMissionMode,
  isRoyalOSMissionStatus,
  type CreateRoyalOSMissionInput,
  type RoyalOSMissionFilters,
  type RoyalOSMissionStatus,
} from "@/lib/missions/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateMissionRequest = {
  missionId?: unknown;
  title?: unknown;
  objective?: unknown;
  workspace?: unknown;
  mode?: unknown;
  status?: unknown;
  progress?: unknown;
  requestedEmployee?: unknown;
  leadEmployee?: unknown;
  supportingEmployees?: unknown;
  requiresCEOApproval?: unknown;
  deliverables?: unknown;
  risks?: unknown;
  metadata?: unknown;
};

function cleanText(
  value: unknown
): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function parseBoolean(
  value: unknown
): boolean | undefined {
  if (
    typeof value === "boolean"
  ) {
    return value;
  }

  if (
    typeof value !== "string"
  ) {
    return undefined;
  }

  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes"
  ) {
    return true;
  }

  if (
    normalized === "false" ||
    normalized === "0" ||
    normalized === "no"
  ) {
    return false;
  }

  return undefined;
}

function parseInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number(
          cleanText(value)
        );

  if (
    !Number.isFinite(parsed)
  ) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(
      minimum,
      Math.floor(parsed)
    )
  );
}

function parseStringArray(
  value: unknown
): string[] {
  const possibleValues =
    Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",")
        : [];

  return Array.from(
    new Set(
      possibleValues
        .filter(
          (item):
            item is string =>
            typeof item === "string"
        )
        .map((item) =>
          item.trim()
        )
        .filter(Boolean)
    )
  );
}

function parseEmployeeArray(
  value: unknown
) {
  return parseStringArray(
    value
  ).filter(
    isRoyalOSEmployeeName
  );
}

function parseStatusFilters(
  values: string[]
): RoyalOSMissionStatus[] {
  return Array.from(
    new Set(
      values.filter(
        isRoyalOSMissionStatus
      )
    )
  );
}

function generateMissionId(): string {
  if (
    typeof globalThis.crypto !==
      "undefined" &&
    typeof globalThis.crypto
      .randomUUID === "function"
  ) {
    return globalThis.crypto
      .randomUUID();
  }

  return `mission_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

/**
 * GET /api/missions
 *
 * Examples:
 *
 * /api/missions
 *
 * /api/missions?status=in_progress
 *
 * /api/missions?status=completed&status=approved
 *
 * /api/missions?workspace=ChoiceRoyals
 *
 * /api/missions?search=cybersecurity
 *
 * /api/missions?requiresCEOApproval=true
 */
export async function GET(
  request: Request
) {
  try {
    const url =
      new URL(request.url);

    const statusValues = [
      ...url.searchParams.getAll(
        "status"
      ),

      ...parseStringArray(
        url.searchParams.get(
          "statuses"
        )
      ),
    ];

    const statuses =
      parseStatusFilters(
        statusValues
      );

    const workspace =
      cleanText(
        url.searchParams.get(
          "workspace"
        )
      );

    const leadEmployeeValue =
      cleanText(
        url.searchParams.get(
          "leadEmployee"
        )
      );

    const requestedEmployeeValue =
      cleanText(
        url.searchParams.get(
          "requestedEmployee"
        )
      );

    const search =
      cleanText(
        url.searchParams.get(
          "search"
        )
      );

    const approvalFilter =
      parseBoolean(
        url.searchParams.get(
          "requiresCEOApproval"
        )
      );

    const limit =
      parseInteger(
        url.searchParams.get(
          "limit"
        ),
        25,
        1,
        100
      );

    const offset =
      parseInteger(
        url.searchParams.get(
          "offset"
        ),
        0,
        0,
        100_000
      );

    const order =
      url.searchParams.get(
        "order"
      ) === "oldest"
        ? "oldest"
        : "newest";

    const filters:
      RoyalOSMissionFilters = {
        limit,
        offset,
        order,
      };

    if (
      statuses.length === 1
    ) {
      filters.status =
        statuses[0];
    } else if (
      statuses.length > 1
    ) {
      filters.status =
        statuses;
    }

    if (workspace) {
      filters.workspace =
        workspace;
    }

    if (
      isRoyalOSEmployeeName(
        leadEmployeeValue
      )
    ) {
      filters.leadEmployee =
        leadEmployeeValue;
    }

    if (
      isRoyalOSEmployeeName(
        requestedEmployeeValue
      )
    ) {
      filters.requestedEmployee =
        requestedEmployeeValue;
    }

    if (search) {
      filters.search =
        search;
    }

    if (
      typeof approvalFilter ===
      "boolean"
    ) {
      filters.requiresCEOApproval =
        approvalFilter;
    }

    const result =
      await listRoyalOSMissions(
        filters
      );

    return Response.json(
      {
        message:
          "RoyalOS missions retrieved successfully.",

        missions:
          result.missions,

        pagination: {
          count:
            result.count,

          limit:
            result.limit,

          offset:
            result.offset,

          returned:
            result.missions
              .length,

          hasMore:
            result.offset +
              result.missions
                .length <
            result.count,
        },

        filters: {
          statuses,

          workspace:
            workspace ||
            null,

          leadEmployee:
            filters.leadEmployee ??
            null,

          requestedEmployee:
            filters.requestedEmployee ??
            null,

          requiresCEOApproval:
            approvalFilter ??
            null,

          search:
            search ||
            null,

          order,
        },
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "RoyalOS Missions GET error:",
      error
    );

    return Response.json(
      {
        error:
          "RoyalOS could not retrieve the missions.",

        details:
          process.env
            .NODE_ENV ===
          "development"
            ? error instanceof Error
              ? error.message
              : "Unknown mission-list error."
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * POST /api/missions
 *
 * Creates a mission record directly.
 *
 * RoyalOS mission execution will later use the
 * same service automatically.
 */
export async function POST(
  request: Request
) {
  try {
    let body:
      CreateMissionRequest;

    try {
      body =
        (await request.json()) as
          CreateMissionRequest;
    } catch {
      return Response.json(
        {
          error:
            "RoyalOS received invalid mission JSON.",
        },
        {
          status: 400,
        }
      );
    }

    const title =
      cleanText(
        body.title
      );

    const objective =
      cleanText(
        body.objective
      );

    const workspace =
      cleanText(
        body.workspace
      ) ||
      "Triple-Hay Concept LLC";

    const mode =
      isRoyalOSMissionMode(
        body.mode
      )
        ? body.mode
        : "Mission";

    const missionId =
      cleanText(
        body.missionId
      ) ||
      generateMissionId();

    if (!title) {
      return Response.json(
        {
          error:
            "Mission title is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!objective) {
      return Response.json(
        {
          error:
            "Mission objective is required.",
        },
        {
          status: 400,
        }
      );
    }

    const input:
      CreateRoyalOSMissionInput = {
        missionId,

        title,

        objective,

        workspace,

        mode,

        status:
          isRoyalOSMissionStatus(
            body.status
          )
            ? body.status
            : "planning",

        progress:
          parseInteger(
            body.progress,
            0,
            0,
            100
          ),

        supportingEmployees:
          parseEmployeeArray(
            body.supportingEmployees
          ),

        requiresCEOApproval:
          parseBoolean(
            body.requiresCEOApproval
          ) ??
          false,

        deliverables:
          parseStringArray(
            body.deliverables
          ),

        risks:
          parseStringArray(
            body.risks
          ),

        metadata:
          body.metadata &&
          typeof body.metadata ===
            "object" &&
          !Array.isArray(
            body.metadata
          )
            ? body.metadata as
                CreateRoyalOSMissionInput["metadata"]
            : {},
      };

    if (
      isRoyalOSEmployeeName(
        body.requestedEmployee
      )
    ) {
      input.requestedEmployee =
        body.requestedEmployee;
    }

    if (
      isRoyalOSEmployeeName(
        body.leadEmployee
      )
    ) {
      input.leadEmployee =
        body.leadEmployee;
    }

    const mission =
      await createRoyalOSMission(
        input
      );

    return Response.json(
      {
        message:
          "RoyalOS mission created successfully.",

        mission,
      },
      {
        status: 201,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "RoyalOS Missions POST error:",
      error
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown mission-creation error.";

    const duplicateMission =
      errorMessage.includes(
        "already exists"
      );

    return Response.json(
      {
        error:
          duplicateMission
            ? errorMessage
            : "RoyalOS could not create the mission.",

        details:
          process.env
            .NODE_ENV ===
          "development"
            ? errorMessage
            : undefined,
      },
      {
        status:
          duplicateMission
            ? 409
            : 500,
      }
    );
  }
}