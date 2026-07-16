import {
  POST as executeRoyalOSMission,
} from "../emmy/route";

import {
  completeRoyalOSMission,
  createRoyalOSMission,
  failRoyalOSMission,
  updateRoyalOSMission,
} from "@/lib/missions/service";

import {
  isRoyalOSEmployeeName,
  isRoyalOSMissionMode,
  type RoyalOSEmployeeName,
  type RoyalOSMissionBrainPlan,
  type RoyalOSMissionCollaboration,
  type RoyalOSMissionPerformance,
} from "@/lib/missions/types";
import { ROYALOS_EMPLOYEE_PROFILES } from "@/lib/employees/config";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  300;

type RoyalOSGatewayRequest = {
  idea?: unknown;
  workspace?: unknown;
  employee?: unknown;
  mode?: unknown;
};

type RoyalOSExecutionResponse = {
  draft?: string;
  error?: string;
  details?: string;

  missionId?: string;

  requestedEmployee?: string;
  employee?: string;
  workspace?: string;
  mode?: string;
  model?: string;
  responseId?: string;

  brainPlan?:
    RoyalOSMissionBrainPlan;

  documentsDiscovered?: number;
  documentsLoaded?: number;

  memoryRecall?: {
    memoriesFound?: number;
    memoriesSelected?: number;
  };

  collaboration?: {
    participatingEmployees?: string[];
    completedReports?: number;
    failedReports?: number;
    timedOutReports?: number;
    succeeded?: boolean;
    employeeStatuses?: unknown[];
  };

  executiveQuality?: {
    passed?: boolean;
    score?: number;
    wordCount?: number;
    warnings?: string[];
  };

  memoryPersistence?: {
    attempted?: boolean;
    saved?: boolean;
    recordsSaved?: number;
    memoryIds?: string[];
    errors?: string[];
  };

  performance?:
    RoyalOSMissionPerformance;
};

const royalOSEmployees =
  ROYALOS_EMPLOYEE_PROFILES.map(({ name, title }) => ({
    name,
    role: title,
  }));

const royalOSWorkspaces = [
  "Triple-Hay Concept LLC",
  "ChoiceRoyals",
  "Xena Grace",
  "TD Talk",
] as const;

function cleanText(
  value: unknown
): string {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function generateMissionId(): string {
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

  return `mission_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function createMissionTitle(
  idea: string
): string {
  const compact =
    idea
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  if (
    compact.length <= 90
  ) {
    return compact;
  }

  return `${compact.slice(
    0,
    87
  )}...`;
}

function configurationStatus() {
  return {
    openAIConfigured:
      Boolean(
        process.env
          .OPENAI_API_KEY
          ?.trim()
      ),

    modelConfigured:
      Boolean(
        process.env
          .OPENAI_MODEL
          ?.trim()
      ),

    supabaseConfigured:
      Boolean(
        process.env
          .SUPABASE_URL
          ?.trim() &&
          process.env
            .SUPABASE_SERVICE_ROLE_KEY
            ?.trim()
      ),
  };
}

function validEmployeeArray(
  values:
    | string[]
    | undefined
): RoyalOSEmployeeName[] {
  if (!values) {
    return [];
  }

  return values.filter(
    isRoyalOSEmployeeName
  );
}

function buildCollaboration(
  data: RoyalOSExecutionResponse
): RoyalOSMissionCollaboration {
  const collaboration =
    data.collaboration;

  if (!collaboration) {
    return {};
  }

  return {
    participatingEmployees:
      validEmployeeArray(
        collaboration
          .participatingEmployees
      ),

    completedReports:
      collaboration
        .completedReports ??
      0,

    failedReports:
      collaboration
        .failedReports ??
      0,

    timedOutReports:
      collaboration
        .timedOutReports ??
      0,

    collaborationSucceeded:
      collaboration
        .succeeded ??
      false,
  };
}

export async function GET() {
  return Response.json(
    {
      message:
        "RoyalOS Integrated API is online.",

      status:
        "ready",

      company:
        "Triple-Hay Concept LLC",

      api: {
        endpoint:
          "/api/royalos",

        supportedMethods: [
          "GET",
          "POST",
        ],

        runtime:
          "nodejs",

        maximumExecutionSeconds:
          maxDuration,
      },

      capabilities: {
        brainPlanning:
          true,

        knowledgeRouting:
          true,

        knowledgeIndex:
          true,

        permanentMemoryRecall:
          true,

        independentEmployeeExecution:
          true,

        teamCoordination:
          true,

        executiveSynthesis:
          true,

        missionMemoryPersistence:
          true,

        missionDatabasePersistence:
          true,

        safeFallbackExecution:
          true,
      },

      configuration:
        configurationStatus(),

      employees:
        royalOSEmployees,

      workspaces:
        royalOSWorkspaces,

      timestamp:
        new Date()
          .toISOString(),
    },
    {
      status: 200,

      headers: {
        "Cache-Control":
          "no-store, max-age=0",

        "X-RoyalOS-API":
          "online",
      },
    }
  );
}

export async function POST(
  request: Request
) {
  let missionId:
    string | undefined;

  try {
    let body:
      RoyalOSGatewayRequest;

    try {
      body =
        (await request.json()) as
          RoyalOSGatewayRequest;
    } catch {
      return Response.json(
        {
          error:
            "RoyalOS received invalid JSON.",
        },
        {
          status: 400,
        }
      );
    }

    const idea =
      cleanText(
        body.idea
      );

    const workspace =
      cleanText(
        body.workspace
      ) ||
      "Triple-Hay Concept LLC";

    const requestedEmployeeValue =
      cleanText(
        body.employee
      );

    const requestedEmployee:
      RoyalOSEmployeeName =
        isRoyalOSEmployeeName(
          requestedEmployeeValue
        )
          ? requestedEmployeeValue
          : "Adedeji";

    const mode =
      isRoyalOSMissionMode(
        body.mode
      )
        ? body.mode
        : "Mission";

    if (!idea) {
      return Response.json(
        {
          error:
            "Please provide a conversation message, task, or mission.",
        },
        {
          status: 400,
        }
      );
    }

    missionId =
      generateMissionId();

    await createRoyalOSMission({
      missionId,

      title:
        createMissionTitle(
          idea
        ),

      objective:
        idea,

      workspace,

      mode,

      status:
        "queued",

      progress:
        5,

      requestedEmployee,

      leadEmployee:
        requestedEmployee,

      requiresCEOApproval:
        mode ===
        "Mission",

      metadata: {
        source:
          "RoyalOS API",

        endpoint:
          "/api/royalos",
      },
    });

    await updateRoyalOSMission(
      missionId,
      {
        status:
          "in_progress",

        progress:
          15,
      }
    );

    const forwardedRequest =
      new Request(
        request.url,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              idea,
              workspace,
              employee:
                requestedEmployee,
              mode,
              missionId,
            }),
        }
      );

    const executionResponse =
      await executeRoyalOSMission(
        forwardedRequest
      );

    const data =
      (await executionResponse
        .json()) as
        RoyalOSExecutionResponse;

    if (
      !executionResponse.ok
    ) {
      await failRoyalOSMission(
        missionId,
        data.error ||
          data.details ||
          "RoyalOS mission execution failed."
      );

      return Response.json(
        {
          ...data,
          missionId,
        },
        {
          status:
            executionResponse
              .status,
        }
      );
    }

    const brainPlan =
      data.brainPlan ??
      {};

    const leadEmployee =
      isRoyalOSEmployeeName(
        data.employee
      )
        ? data.employee
        : requestedEmployee;

    const supportingEmployees =
      validEmployeeArray(
        brainPlan
          .supportingEmployees
      );

    const participatingEmployees =
      validEmployeeArray(
        data.collaboration
          ?.participatingEmployees
      );

    const requiresCEOApproval =
      brainPlan
        .requiresCEOApproval ??
      mode === "Mission";

    await completeRoyalOSMission(
      missionId,
      {
        title:
          createMissionTitle(
            idea
          ),

        objective:
          brainPlan
            .objective ??
          idea,

        workspace,

        mode,

        requestedEmployee,

        leadEmployee,

        supportingEmployees,

        participatingEmployees,

        brainPlan,

        collaboration:
          buildCollaboration(
            data
          ),

        executiveBriefing:
          data.draft ??
          null,

        deliverables:
          brainPlan
            .deliverables ??
          [],

        risks:
          brainPlan.risks ??
          [],

        requiresCEOApproval,

        model:
          data.model ??
          null,

        responseId:
          data.responseId ??
          null,

        documentsDiscovered:
          data.documentsDiscovered ??
          0,

        documentsLoaded:
          data.documentsLoaded ??
          0,

        memoriesRetrieved:
          data.memoryRecall
            ?.memoriesSelected ??
          0,

        memoriesSaved:
          data.memoryPersistence
            ?.recordsSaved ??
          0,

        memoryIds:
          data.memoryPersistence
            ?.memoryIds ??
          [],

        qualityScore:
          data.executiveQuality
            ?.score ??
          null,

        qualityPassed:
          data.executiveQuality
            ?.passed ??
          null,

        performance:
          data.performance ??
          {},

        metadata: {
          source:
            "RoyalOS API",

          completedThrough:
            "/api/royalos",

          memorySaved:
            data.memoryPersistence
              ?.saved ??
            false,
        },
      }
    );

    return Response.json(
      {
        ...data,

        missionId,

        missionDatabaseSaved:
          true,
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
      "RoyalOS gateway error:",
      error
    );

    if (missionId) {
      try {
        await failRoyalOSMission(
          missionId,
          error instanceof Error
            ? error.message
            : "Unknown RoyalOS gateway error."
        );
      } catch (
        missionFailureError
      ) {
        console.error(
          "RoyalOS could not mark the mission as failed:",
          missionFailureError
        );
      }
    }

    return Response.json(
      {
        error:
          "RoyalOS could not complete the mission.",

        missionId,

        details:
          process.env
            .NODE_ENV ===
          "development"
            ? error instanceof Error
              ? error.message
              : "Unknown RoyalOS gateway error."
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}