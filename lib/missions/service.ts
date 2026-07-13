import { createClient } from "@supabase/supabase-js";

import type {
  CreateRoyalOSMissionInput,
  UpdateRoyalOSMissionInput,
  RoyalOSMissionDecisionInput,
  RoyalOSMissionFilters,
  RoyalOSMissionListResult,
  RoyalOSMissionRecord,
} from "./types";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TABLE = "royalos_missions";
function buildUpdate(update: UpdateRoyalOSMissionInput) {
  return {
    title: update.title,
    objective: update.objective,
    workspace: update.workspace,
    mode: update.mode,
    status: update.status,
    progress: update.progress,
    requested_employee: update.requestedEmployee,
    lead_employee: update.leadEmployee,
    supporting_employees: update.supportingEmployees,
    participating_employees: update.participatingEmployees,
    brain_plan: update.brainPlan,
    collaboration: update.collaboration,
    executive_briefing: update.executiveBriefing,
    deliverables: update.deliverables,
    risks: update.risks,
    requires_ceo_approval: update.requiresCEOApproval,
    ceo_decision: update.ceoDecision,
    ceo_decision_note: update.ceoDecisionNote,
    approved_at: update.approvedAt,
    completed_at: update.completedAt,
    failed_at: update.failedAt,
    error_message: update.errorMessage,
    model: update.model,
    response_id: update.responseId,
    documents_discovered: update.documentsDiscovered,
    documents_loaded: update.documentsLoaded,
    memories_retrieved: update.memoriesRetrieved,
    memories_saved: update.memoriesSaved,
    memory_ids: update.memoryIds,
    quality_score: update.qualityScore,
    quality_passed: update.qualityPassed,
    performance: update.performance,
    metadata: update.metadata,
  };
}
function removeUndefinedValues<
  T extends Record<string, unknown>,
>(
  value: T
): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) =>
        item !== undefined
    )
  ) as Partial<T>;
}

function cleanRequiredText(
  value: string,
  fieldName: string
): string {
  const cleaned =
    value.trim();

  if (!cleaned) {
    throw new Error(
      `${fieldName} is required to create a RoyalOS mission.`
    );
  }

  return cleaned;
}

export async function createRoyalOSMission(
  input: CreateRoyalOSMissionInput
): Promise<RoyalOSMissionRecord> {
  const missionId =
    cleanRequiredText(
      input.missionId,
      "Mission ID"
    );

  const title =
    cleanRequiredText(
      input.title,
      "Mission title"
    );

  const objective =
    cleanRequiredText(
      input.objective,
      "Mission objective"
    );

  const workspace =
    cleanRequiredText(
      input.workspace,
      "Workspace"
    );

  const record =
    removeUndefinedValues({
      mission_id:
        missionId,

      title,

      objective,

      workspace,

      mode:
        input.mode,

      status:
        input.status ??
        "planning",

      progress:
        input.progress ??
        0,

      requested_employee:
        input.requestedEmployee,

      lead_employee:
        input.leadEmployee,

      supporting_employees:
        input.supportingEmployees ??
        [],

      participating_employees:
        input.participatingEmployees ??
        [],

      brain_plan:
        input.brainPlan ??
        {},

      collaboration:
        input.collaboration ??
        {},

      executive_briefing:
        input.executiveBriefing,

      deliverables:
        input.deliverables ??
        [],

      risks:
        input.risks ??
        [],

      requires_ceo_approval:
        input.requiresCEOApproval ??
        false,

      model:
        input.model,

      response_id:
        input.responseId,

      documents_discovered:
        input.documentsDiscovered ??
        0,

      documents_loaded:
        input.documentsLoaded ??
        0,

      memories_retrieved:
        input.memoriesRetrieved ??
        0,

      memories_saved:
        input.memoriesSaved ??
        0,

      memory_ids:
        input.memoryIds ??
        [],

      quality_score:
        input.qualityScore,

      quality_passed:
        input.qualityPassed,

      performance:
        input.performance ??
        {},

      metadata:
        input.metadata ??
        {},
    });

  const {
    data,
    error,
  } =
    await supabase
      .from(TABLE)
      .insert(record)
      .select("*")
      .single();

  if (error) {
    if (
      error.code ===
      "23505"
    ) {
      throw new Error(
        `A RoyalOS mission with mission ID "${missionId}" already exists.`
      );
    }

    throw new Error(
      `RoyalOS could not create the mission: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      "RoyalOS created the mission but Supabase returned no mission record."
    );
  }

  console.log(
    "RoyalOS mission created:",
    {
      missionId:
        data.mission_id,

      title:
        data.title,

      workspace:
        data.workspace,

      status:
        data.status,
    }
  );

  return data as
    RoyalOSMissionRecord;
}
export async function updateRoyalOSMission(
  missionId: string,
  update: UpdateRoyalOSMissionInput
): Promise<RoyalOSMissionRecord> {
  const cleanedMissionId =
    cleanRequiredText(
      missionId,
      "Mission ID"
    );

  const preparedUpdate =
    removeUndefinedValues(
      buildUpdate(update)
    );

  if (
    Object.keys(
      preparedUpdate
    ).length === 0
  ) {
    throw new Error(
      "RoyalOS received no mission fields to update."
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(TABLE)
      .update(
        preparedUpdate
      )
      .eq(
        "mission_id",
        cleanedMissionId
      )
      .select("*")
      .single();

  if (error) {
    if (
      error.code ===
      "PGRST116"
    ) {
      throw new Error(
        `RoyalOS mission "${cleanedMissionId}" was not found.`
      );
    }

    throw new Error(
      `RoyalOS could not update mission "${cleanedMissionId}": ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      `RoyalOS updated mission "${cleanedMissionId}" but Supabase returned no mission record.`
    );
  }

  console.log(
    "RoyalOS mission updated:",
    {
      missionId:
        data.mission_id,

      status:
        data.status,

      progress:
        data.progress,
    }
  );

  return data as
    RoyalOSMissionRecord;
}
export async function decideRoyalOSMission(
  missionId: string,
  input: RoyalOSMissionDecisionInput
): Promise<RoyalOSMissionRecord> {
  const cleanedMissionId =
    cleanRequiredText(
      missionId,
      "Mission ID"
    );

  const decisionNote =
    input.note?.trim() ||
    null;

  const now =
    new Date().toISOString();

  if (
    input.decision ===
    "approved"
  ) {
    return updateRoyalOSMission(
      cleanedMissionId,
      {
        status:
          "approved",

        progress:
          100,

        ceoDecision:
          "approved",

        ceoDecisionNote:
          decisionNote,

        approvedAt:
          now,

        completedAt:
          now,

        failedAt:
          null,

        errorMessage:
          null,
      }
    );
  }

  if (
    input.decision ===
    "revision_requested"
  ) {
    return updateRoyalOSMission(
      cleanedMissionId,
      {
        status:
          "revision_requested",

        ceoDecision:
          "revision_requested",

        ceoDecisionNote:
          decisionNote,

        approvedAt:
          null,

        completedAt:
          null,
      }
    );
  }

  return updateRoyalOSMission(
    cleanedMissionId,
    {
      status:
        "cancelled",

      ceoDecision:
        "rejected",

      ceoDecisionNote:
        decisionNote,

      approvedAt:
        null,

      completedAt:
        null,
    }
  );
}

export async function approveRoyalOSMission(
  missionId: string,
  note?: string
): Promise<RoyalOSMissionRecord> {
  return decideRoyalOSMission(
    missionId,
    {
      decision:
        "approved",

      note,
    }
  );
}

export async function requestRoyalOSMissionRevision(
  missionId: string,
  note?: string
): Promise<RoyalOSMissionRecord> {
  return decideRoyalOSMission(
    missionId,
    {
      decision:
        "revision_requested",

      note,
    }
  );
}

export async function rejectRoyalOSMission(
  missionId: string,
  note?: string
): Promise<RoyalOSMissionRecord> {
  return decideRoyalOSMission(
    missionId,
    {
      decision:
        "rejected",

      note,
    }
  );
}

export async function completeRoyalOSMission(
  missionId: string,
  update: Omit<
    UpdateRoyalOSMissionInput,
    | "status"
    | "progress"
    | "completedAt"
    | "failedAt"
    | "errorMessage"
  > = {}
): Promise<RoyalOSMissionRecord> {
  return updateRoyalOSMission(
    missionId,
    {
      ...update,

      status:
        update.requiresCEOApproval
          ? "waiting_for_approval"
          : "completed",

      progress:
        100,

      completedAt:
        new Date().toISOString(),

      failedAt:
        null,

      errorMessage:
        null,
    }
  );
}

export async function failRoyalOSMission(
  missionId: string,
  errorMessage: string,
  update: Omit<
    UpdateRoyalOSMissionInput,
    | "status"
    | "failedAt"
    | "errorMessage"
  > = {}
): Promise<RoyalOSMissionRecord> {
  const cleanedError =
    cleanRequiredText(
      errorMessage,
      "Mission error message"
    );

  return updateRoyalOSMission(
    missionId,
    {
      ...update,

      status:
        "failed",

      failedAt:
        new Date().toISOString(),

      completedAt:
        null,

      errorMessage:
        cleanedError,
    }
  );
}

export async function archiveRoyalOSMission(
  missionId: string
): Promise<RoyalOSMissionRecord> {
  return updateRoyalOSMission(
    missionId,
    {
      status:
        "archived",
    }
  );
}

export async function getRoyalOSMission(
  missionId: string
): Promise<RoyalOSMissionRecord | null> {
  const cleanedMissionId =
    cleanRequiredText(
      missionId,
      "Mission ID"
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(TABLE)
      .select("*")
      .eq(
        "mission_id",
        cleanedMissionId
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `RoyalOS could not retrieve mission "${cleanedMissionId}": ${error.message}`
    );
  }

  if (!data) {
    return null;
  }

  return data as
    RoyalOSMissionRecord;
}

export async function requireRoyalOSMission(
  missionId: string
): Promise<RoyalOSMissionRecord> {
  const mission =
    await getRoyalOSMission(
      missionId
    );

  if (!mission) {
    throw new Error(
      `RoyalOS mission "${missionId}" was not found.`
    );
  }

  return mission;
}

export async function listRoyalOSMissions(
  filters: RoyalOSMissionFilters = {}
): Promise<RoyalOSMissionListResult> {
  const limit =
    Math.min(
      100,
      Math.max(
        1,
        Math.floor(
          filters.limit ??
          25
        )
      )
    );

  const offset =
    Math.max(
      0,
      Math.floor(
        filters.offset ??
        0
      )
    );

  let query =
    supabase
      .from(TABLE)
      .select(
        "*",
        {
          count:
            "exact",
        }
      );

  if (
    filters.status
  ) {
    const statuses =
      Array.isArray(
        filters.status
      )
        ? filters.status
        : [
            filters.status,
          ];

    if (
      statuses.length ===
      1
    ) {
      query =
        query.eq(
          "status",
          statuses[0]
        );
    } else if (
      statuses.length > 1
    ) {
      query =
        query.in(
          "status",
          statuses
        );
    }
  }

  if (
    filters.workspace?.trim()
  ) {
    query =
      query.eq(
        "workspace",
        filters.workspace.trim()
      );
  }

  if (
    filters.leadEmployee
  ) {
    query =
      query.eq(
        "lead_employee",
        filters.leadEmployee
      );
  }

  if (
    filters.requestedEmployee
  ) {
    query =
      query.eq(
        "requested_employee",
        filters.requestedEmployee
      );
  }

  if (
    typeof filters
      .requiresCEOApproval ===
    "boolean"
  ) {
    query =
      query.eq(
        "requires_ceo_approval",
        filters
          .requiresCEOApproval
      );
  }

  if (
    filters.ceoDecision ===
    null
  ) {
    query =
      query.is(
        "ceo_decision",
        null
      );
  } else if (
    filters.ceoDecision
  ) {
    query =
      query.eq(
        "ceo_decision",
        filters.ceoDecision
      );
  }

  const search =
    filters.search?.trim();

  if (search) {
    const safeSearch =
      search
        .replace(
          /[%_,()]/g,
          " "
        )
        .replace(
          /\s+/g,
          " "
        )
        .trim();

    if (safeSearch) {
      query =
        query.or(
          [
            `title.ilike.%${safeSearch}%`,
            `objective.ilike.%${safeSearch}%`,
            `workspace.ilike.%${safeSearch}%`,
            `executive_briefing.ilike.%${safeSearch}%`,
          ].join(",")
        );
    }
  }

  const ascending =
    filters.order ===
    "oldest";

  const {
    data,
    error,
    count,
  } =
    await query
      .order(
        "created_at",
        {
          ascending,
        }
      )
      .range(
        offset,
        offset +
          limit -
          1
      );

  if (error) {
    throw new Error(
      `RoyalOS could not list missions: ${error.message}`
    );
  }

  return {
    missions:
      (
        data ??
        []
      ) as RoyalOSMissionRecord[],

    count:
      count ??
      0,

    limit,

    offset,
  };
}

export async function listRoyalOSApprovalMissions(
  limit = 25
): Promise<RoyalOSMissionListResult> {
  return listRoyalOSMissions({
    status: [
      "waiting_for_approval",
      "revision_requested",
    ],

    requiresCEOApproval:
      true,

    limit,

    order:
      "newest",
  });
}

export async function deleteRoyalOSMission(
  missionId: string
): Promise<{
  deleted: boolean;
  missionId: string;
}> {
  const cleanedMissionId =
    cleanRequiredText(
      missionId,
      "Mission ID"
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(TABLE)
      .delete()
      .eq(
        "mission_id",
        cleanedMissionId
      )
      .select(
        "mission_id"
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `RoyalOS could not delete mission "${cleanedMissionId}": ${error.message}`
    );
  }

  if (!data) {
    return {
      deleted:
        false,

      missionId:
        cleanedMissionId,
    };
  }

  console.log(
    "RoyalOS mission deleted:",
    {
      missionId:
        cleanedMissionId,
    }
  );

  return {
    deleted:
      true,

    missionId:
      cleanedMissionId,
  };
}