import type OpenAI from "openai";

import type {
  RoyalOSBrainPlan,
  RoyalOSEmployee,
} from "../brain";

import {
  createRoyalOSEmployeeRunner,
} from "./employeeRunner";

import {
  formatEmployeeReportsForLead,
  runRoyalOSMissionTeam,
  type EmployeeReport,
  type MissionOrchestrationResult,
} from "./mission";

import {
  mergeRoyalOSEmployeeReports,
  type MergedExecutiveReport,
} from "./mergeReports";

export type TeamCoordinatorOptions = {
  client: OpenAI;
  model: string;

  /**
   * Maximum number of supporting executives allowed
   * to work independently on one mission.
   */
  maxCollaborators?: number;

  /**
   * Number of employee requests allowed to run simultaneously.
   */
  concurrency?: number;

  /**
   * Maximum duration allowed for one supporting employee.
   */
  employeeTimeoutMs?: number;

  /**
   * Maximum Company Intelligence sent to each employee.
   */
  employeeKnowledgeCharacters?: number;

  /**
   * Maximum Company Intelligence sent to the lead executive.
   */
  leadKnowledgeCharacters?: number;

  /**
   * Maximum combined size of employee reports sent to the lead.
   */
  reportCharacters?: number;

  /**
   * Reasoning level used by supporting employees.
   */
  employeeReasoningEffort?: "low" | "medium" | "high";

  /**
   * Output length used by supporting employees.
   */
  employeeVerbosity?: "low" | "medium" | "high";
};

export type CoordinateMissionOptions = {
  idea: string;
  workspace: string;
  brainPlan: RoyalOSBrainPlan;

  /**
   * Optional cancellation signal for the complete collaboration.
   */
  signal?: AbortSignal;
};

export type TeamCoordinatorPerformance = {
  employeeCollaborationMs: number;
  executiveSynthesisMs: number;
  totalCoordinatorMs: number;
};

export type TeamCoordinatorResult = {
  objective: string;

  leadEmployee: RoyalOSEmployee;

  requestedSupportingEmployees: RoyalOSEmployee[];

  participatingEmployees: RoyalOSEmployee[];

  skippedEmployees: RoyalOSEmployee[];

  collaborationRequired: boolean;

  collaborationAttempted: boolean;

  collaborationSucceeded: boolean;

  employeeReports: EmployeeReport[];

  completedEmployeeReports: number;

  failedEmployeeReports: number;

  timedOutEmployeeReports: number;

  finalReport: string;

  collaboration: MissionOrchestrationResult;

  synthesis: MergedExecutiveReport;

  performance: TeamCoordinatorPerformance;
};

const DEFAULT_MAX_COLLABORATORS = 8;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_EMPLOYEE_TIMEOUT_MS = 60_000;

function elapsedMilliseconds(startTime: number): number {
  return Math.round(
    globalThis.performance.now() - startTime
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

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const normalizedMessage =
    error.message.toLowerCase();

  return (
    error.name === "AbortError" ||
    normalizedMessage.includes("aborted") ||
    normalizedMessage.includes("cancelled")
  );
}

function assertNotAborted(
  signal: AbortSignal | undefined,
  stage: string
): void {
  if (!signal?.aborted) {
    return;
  }

  throw new Error(
    `RoyalOS team coordination was cancelled during ${stage}.`
  );
}

function validateMissionInput(
  options: CoordinateMissionOptions
): void {
  if (!options.idea.trim()) {
    throw new Error(
      "RoyalOS Team Coordinator received an empty mission."
    );
  }

  if (!options.workspace.trim()) {
    throw new Error(
      "RoyalOS Team Coordinator received an empty workspace."
    );
  }

  if (!options.brainPlan.objective.trim()) {
    throw new Error(
      "RoyalOS Team Coordinator received a Brain plan without an objective."
    );
  }
}

function logCollaborationSummary(
  result: MissionOrchestrationResult
): void {
  console.log(
    "RoyalOS collaboration summary:",
    {
      leadEmployee:
        result.leadEmployee,

      requestedSupportingEmployees:
        result.requestedSupportingEmployees,

      participatingEmployees:
        result.participatingEmployees,

      skippedEmployees:
        result.skippedEmployees,

      completedReports:
        result.completedReports,

      failedReports:
        result.failedReports,

      timedOutReports:
        result.timedOutReports,

      collaborationSucceeded:
        result.collaborationSucceeded,

      totalDurationMs:
        result.totalDurationMs,
    }
  );
}

function logEmployeeReportStatuses(
  reports: EmployeeReport[]
): void {
  if (reports.length === 0) {
    console.log(
      "RoyalOS collaboration required no independent supporting reports."
    );

    return;
  }

  console.log(
    "RoyalOS employee report statuses:",
    reports.map((report) => ({
      employee: report.employee,
      status: report.status,
      durationMs: report.durationMs,
      error: report.error,
    }))
  );
}

function buildCoordinatorResult(
  collaboration: MissionOrchestrationResult,
  synthesis: MergedExecutiveReport,
  timing: TeamCoordinatorPerformance
): TeamCoordinatorResult {
  return {
    objective:
      collaboration.objective,

    leadEmployee:
      collaboration.leadEmployee,

    requestedSupportingEmployees:
      collaboration.requestedSupportingEmployees,

    participatingEmployees:
      collaboration.participatingEmployees,

    skippedEmployees:
      collaboration.skippedEmployees,

    collaborationRequired:
      collaboration.requestedSupportingEmployees.length > 0,

    collaborationAttempted:
      collaboration.participatingEmployees.length > 0,

    collaborationSucceeded:
      collaboration.collaborationSucceeded,

    employeeReports:
      collaboration.reports,

    completedEmployeeReports:
      collaboration.completedReports,

    failedEmployeeReports:
      collaboration.failedReports,

    timedOutEmployeeReports:
      collaboration.timedOutReports,

    finalReport:
      synthesis.draft,

    collaboration,

    synthesis,

    performance: timing,
  };
}

/**
 * Creates the complete RoyalOS team coordination service.
 *
 * Example:
 *
 * const coordinator = createRoyalOSTeamCoordinator({
 *   client,
 *   model,
 * });
 *
 * const result = await coordinator({
 *   idea,
 *   workspace,
 *   brainPlan,
 * });
 */
export function createRoyalOSTeamCoordinator(
  coordinatorOptions: TeamCoordinatorOptions
): (
  options: CoordinateMissionOptions
) => Promise<TeamCoordinatorResult> {
  const maxCollaborators =
    clampInteger(
      coordinatorOptions.maxCollaborators,
      DEFAULT_MAX_COLLABORATORS,
      1,
      8
    );

  const concurrency =
    clampInteger(
      coordinatorOptions.concurrency,
      DEFAULT_CONCURRENCY,
      1,
      8
    );

  const employeeTimeoutMs =
    clampInteger(
      coordinatorOptions.employeeTimeoutMs,
      DEFAULT_EMPLOYEE_TIMEOUT_MS,
      5_000,
      180_000
    );

  const runEmployee =
    createRoyalOSEmployeeRunner({
      client:
        coordinatorOptions.client,

      model:
        coordinatorOptions.model,

      maxKnowledgeCharacters:
        coordinatorOptions.employeeKnowledgeCharacters,

      reasoningEffort:
        coordinatorOptions.employeeReasoningEffort ??
        "low",

      verbosity:
        coordinatorOptions.employeeVerbosity ??
        "medium",
    });

  return async function coordinateMission(
    options: CoordinateMissionOptions
  ): Promise<TeamCoordinatorResult> {
    validateMissionInput(options);

    assertNotAborted(
      options.signal,
      "mission initialization"
    );

    const totalStartTime =
      globalThis.performance.now();

    console.log(
      "RoyalOS Team Coordinator started:",
      {
        objective:
          options.brainPlan.objective,

        workspace:
          options.workspace,

        leadEmployee:
          options.brainPlan.primaryEmployee,

        supportingEmployees:
          options.brainPlan.supportingEmployees,

        requiresTeam:
          options.brainPlan.requiresTeam,

        maxCollaborators,

        concurrency,

        employeeTimeoutMs,
      }
    );

    const collaborationStartTime =
      globalThis.performance.now();

    let collaboration:
      MissionOrchestrationResult;

    try {
      collaboration =
        await runRoyalOSMissionTeam({
          idea:
            options.idea,

          workspace:
            options.workspace,

          brainPlan:
            options.brainPlan,

          runEmployee,

          maxCollaborators,

          concurrency,

          employeeTimeoutMs,
        });
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error(
          "RoyalOS employee collaboration was cancelled."
        );
      }

      console.error(
        "RoyalOS team collaboration failed before reports could be collected:",
        error
      );

      throw new Error(
        error instanceof Error
          ? `RoyalOS team collaboration failed: ${error.message}`
          : "RoyalOS team collaboration failed for an unknown reason."
      );
    }

    const employeeCollaborationMs =
      elapsedMilliseconds(
        collaborationStartTime
      );

    logCollaborationSummary(
      collaboration
    );

    logEmployeeReportStatuses(
      collaboration.reports
    );

    if (
      process.env.NODE_ENV === "development"
    ) {
      console.log(
        formatEmployeeReportsForLead(
          collaboration
        )
      );
    }

    assertNotAborted(
      options.signal,
      "executive synthesis preparation"
    );

    const synthesisStartTime =
      globalThis.performance.now();

    let synthesis:
      MergedExecutiveReport;

    try {
      synthesis =
        await mergeRoyalOSEmployeeReports({
          client:
            coordinatorOptions.client,

          model:
            coordinatorOptions.model,

          idea:
            options.idea,

          workspace:
            options.workspace,

          brainPlan:
            options.brainPlan,

          collaboration,

          maxKnowledgeCharacters:
            coordinatorOptions.leadKnowledgeCharacters,

          maxReportCharacters:
            coordinatorOptions.reportCharacters,

          signal:
            options.signal,
        });
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error(
          "RoyalOS executive synthesis was cancelled."
        );
      }

      console.error(
        "RoyalOS executive synthesis failed:",
        error
      );

      throw new Error(
        error instanceof Error
          ? `RoyalOS executive synthesis failed: ${error.message}`
          : "RoyalOS executive synthesis failed for an unknown reason."
      );
    }

    const executiveSynthesisMs =
      elapsedMilliseconds(
        synthesisStartTime
      );

    const totalCoordinatorMs =
      elapsedMilliseconds(
        totalStartTime
      );

    const timing:
      TeamCoordinatorPerformance = {
        employeeCollaborationMs,
        executiveSynthesisMs,
        totalCoordinatorMs,
      };

    console.log(
      "RoyalOS Team Coordinator completed:",
      {
        leadEmployee:
          synthesis.leadEmployee,

        completedEmployeeReports:
          synthesis.completedEmployeeReports,

        failedEmployeeReports:
          synthesis.failedEmployeeReports,

        timedOutEmployeeReports:
          synthesis.timedOutEmployeeReports,

        employeeCollaborationMs,

        executiveSynthesisMs,

        totalCoordinatorMs,
      }
    );

    return buildCoordinatorResult(
      collaboration,
      synthesis,
      timing
    );
  };
}