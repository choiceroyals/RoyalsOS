import type OpenAI from "openai";

import type {
  RoyalOSBrainPlan,
  RoyalOSEmployee,
} from "../brain";

import {
  mergeRoyalOSEmployeeReports,
  type MergedExecutiveReport,
} from "./mergeReports";

import type {
  MissionOrchestrationResult,
} from "./mission";

export type ExecutiveSynthesisOptions = {
  client: OpenAI;

  model: string;

  idea: string;

  workspace: string;

  brainPlan: RoyalOSBrainPlan;

  collaboration: MissionOrchestrationResult;

  /**
   * Maximum Company Intelligence supplied to the lead executive.
   */
  maxKnowledgeCharacters?: number;

  /**
   * Maximum combined supporting-report content supplied
   * to the lead executive.
   */
  maxReportCharacters?: number;

  /**
   * Optional cancellation signal for the synthesis request.
   */
  signal?: AbortSignal;
};

export type ExecutiveBriefingQuality = {
  passed: boolean;

  score: number;

  wordCount: number;

  characterCount: number;

  containsObjective: boolean;

  containsRecommendations: boolean;

  containsResponsibilities: boolean;

  containsRisks: boolean;

  containsSuccessMeasures: boolean;

  containsNextSteps: boolean;

  containsCEOApprovalSection: boolean;

  containsRequiredApprovalStatus: boolean;

  acknowledgesIncompleteReports: boolean;

  warnings: string[];
};

export type ExecutiveSynthesisResult = {
  draft: string;

  leadEmployee: RoyalOSEmployee;

  model: string;

  synthesis: MergedExecutiveReport;

  quality: ExecutiveBriefingQuality;

  completedEmployeeReports: number;

  failedEmployeeReports: number;

  timedOutEmployeeReports: number;

  collaborationFullySuccessful: boolean;

  requiresCEOApproval: boolean;

  documentsDiscovered: number;

  documentsLoaded: number;

  loadedFiles: string[];

  durationMs: number;

  responseId?: string;
};

const MINIMUM_EXECUTIVE_BRIEFING_WORDS = 180;

const sectionPatterns = {
  objective: [
    "objective",
    "mission objective",
    "executive objective",
  ],

  recommendations: [
    "recommendation",
    "recommended action",
    "recommended plan",
    "executive decision summary",
  ],

  responsibilities: [
    "executive responsibilities",
    "executive assignments",
    "responsible owner",
    "owners",
    "assigned responsibilities",
  ],

  risks: [
    "risk",
    "risks and mitigation",
    "key risks",
  ],

  successMeasures: [
    "success measures",
    "measurement",
    "metrics",
    "kpi",
    "measures of success",
  ],

  nextSteps: [
    "next steps",
    "immediate actions",
    "action plan",
    "timeline",
  ],

  approval: [
    "ceo approval",
    "ceo decision",
    "ceo decisions required",
    "approval required",
  ],
};

function elapsedMilliseconds(
  startTime: number
): number {
  return Math.round(
    globalThis.performance.now() - startTime
  );
}

function normalizeText(
  value: string
): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function containsAnyPattern(
  normalizedDraft: string,
  patterns: string[]
): boolean {
  return patterns.some((pattern) =>
    normalizedDraft.includes(pattern)
  );
}

function countWords(
  value: string
): number {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 0;
  }

  return trimmedValue
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function containsApprovalStatus(
  normalizedDraft: string
): boolean {
  return (
    normalizedDraft.includes(
      "status: waiting for boss approval"
    ) ||
    normalizedDraft.includes(
      "waiting for boss approval"
    ) ||
    normalizedDraft.includes(
      "mission status waiting for approval"
    )
  );
}

function acknowledgesIncompleteWork(
  normalizedDraft: string
): boolean {
  const incompleteWorkPatterns = [
    "report failed",
    "report timed out",
    "timed-out report",
    "missing contribution",
    "incomplete departmental work",
    "employee report was unavailable",
    "requires retry",
    "should be retried",
    "could not complete",
    "did not return a usable report",
  ];

  return incompleteWorkPatterns.some(
    (pattern) =>
      normalizedDraft.includes(pattern)
  );
}

function calculateQualityScore(
  checks: {
    wordCountPassed: boolean;
    containsObjective: boolean;
    containsRecommendations: boolean;
    containsResponsibilities: boolean;
    containsRisks: boolean;
    containsSuccessMeasures: boolean;
    containsNextSteps: boolean;
    approvalRequirementPassed: boolean;
    incompleteReportsHandled: boolean;
  }
): number {
  const weightedChecks = [
    {
      passed: checks.wordCountPassed,
      points: 10,
    },
    {
      passed: checks.containsObjective,
      points: 10,
    },
    {
      passed:
        checks.containsRecommendations,
      points: 15,
    },
    {
      passed:
        checks.containsResponsibilities,
      points: 15,
    },
    {
      passed: checks.containsRisks,
      points: 10,
    },
    {
      passed:
        checks.containsSuccessMeasures,
      points: 10,
    },
    {
      passed: checks.containsNextSteps,
      points: 10,
    },
    {
      passed:
        checks.approvalRequirementPassed,
      points: 15,
    },
    {
      passed:
        checks.incompleteReportsHandled,
      points: 5,
    },
  ];

  return weightedChecks.reduce(
    (total, check) =>
      total +
      (check.passed ? check.points : 0),
    0
  );
}

function evaluateExecutiveBriefing(
  draft: string,
  brainPlan: RoyalOSBrainPlan,
  collaboration: MissionOrchestrationResult
): ExecutiveBriefingQuality {
  const normalizedDraft =
    normalizeText(draft);

  const wordCount =
    countWords(draft);

  const characterCount =
    draft.length;

  const containsObjective =
    containsAnyPattern(
      normalizedDraft,
      sectionPatterns.objective
    );

  const containsRecommendations =
    containsAnyPattern(
      normalizedDraft,
      sectionPatterns.recommendations
    );

  const containsResponsibilities =
    containsAnyPattern(
      normalizedDraft,
      sectionPatterns.responsibilities
    );

  const containsRisks =
    containsAnyPattern(
      normalizedDraft,
      sectionPatterns.risks
    );

  const containsSuccessMeasures =
    containsAnyPattern(
      normalizedDraft,
      sectionPatterns.successMeasures
    );

  const containsNextSteps =
    containsAnyPattern(
      normalizedDraft,
      sectionPatterns.nextSteps
    );

  const containsCEOApprovalSection =
    containsAnyPattern(
      normalizedDraft,
      sectionPatterns.approval
    );

  const containsRequiredApprovalStatus =
    containsApprovalStatus(
      normalizedDraft
    );

  const hasIncompleteReports =
    collaboration.failedReports > 0 ||
    collaboration.timedOutReports > 0 ||
    collaboration.skippedEmployees.length > 0;

  const acknowledgesIncompleteReports =
    !hasIncompleteReports ||
    acknowledgesIncompleteWork(
      normalizedDraft
    );

  const approvalRequirementPassed =
    !brainPlan.requiresCEOApproval ||
    (
      containsCEOApprovalSection &&
      containsRequiredApprovalStatus
    );

  const wordCountPassed =
    wordCount >=
    MINIMUM_EXECUTIVE_BRIEFING_WORDS;

  const warnings: string[] = [];

  if (!wordCountPassed) {
    warnings.push(
      `The executive briefing contains only ${wordCount} words. The configured minimum is ${MINIMUM_EXECUTIVE_BRIEFING_WORDS}.`
    );
  }

  if (!containsObjective) {
    warnings.push(
      "The executive briefing may be missing a clearly labeled objective."
    );
  }

  if (!containsRecommendations) {
    warnings.push(
      "The executive briefing may be missing clear recommendations."
    );
  }

  if (!containsResponsibilities) {
    warnings.push(
      "The executive briefing may be missing employee responsibilities or owners."
    );
  }

  if (!containsRisks) {
    warnings.push(
      "The executive briefing may be missing risks and mitigation."
    );
  }

  if (!containsSuccessMeasures) {
    warnings.push(
      "The executive briefing may be missing measurable success criteria."
    );
  }

  if (!containsNextSteps) {
    warnings.push(
      "The executive briefing may be missing clear next steps or a timeline."
    );
  }

  if (
    brainPlan.requiresCEOApproval &&
    !containsCEOApprovalSection
  ) {
    warnings.push(
      "The Brain requires CEO approval, but the briefing may not contain a CEO approval or decision section."
    );
  }

  if (
    brainPlan.requiresCEOApproval &&
    !containsRequiredApprovalStatus
  ) {
    warnings.push(
      'The Brain requires CEO approval, but the briefing does not end with "Status: Waiting for Boss approval."'
    );
  }

  if (
    hasIncompleteReports &&
    !acknowledgesIncompleteReports
  ) {
    warnings.push(
      "One or more employee reports failed, timed out, or were skipped, but the final briefing may not acknowledge the missing work."
    );
  }

  const score =
    calculateQualityScore({
      wordCountPassed,
      containsObjective,
      containsRecommendations,
      containsResponsibilities,
      containsRisks,
      containsSuccessMeasures,
      containsNextSteps,
      approvalRequirementPassed,
      incompleteReportsHandled:
        acknowledgesIncompleteReports,
    });

  return {
    passed:
      score >= 80 &&
      approvalRequirementPassed &&
      acknowledgesIncompleteReports,

    score,

    wordCount,

    characterCount,

    containsObjective,

    containsRecommendations,

    containsResponsibilities,

    containsRisks,

    containsSuccessMeasures,

    containsNextSteps,

    containsCEOApprovalSection,

    containsRequiredApprovalStatus,

    acknowledgesIncompleteReports,

    warnings,
  };
}

function validateSynthesisInput(
  options: ExecutiveSynthesisOptions
): void {
  if (!options.idea.trim()) {
    throw new Error(
      "The RoyalOS Executive Synthesizer received an empty CEO mission."
    );
  }

  if (!options.workspace.trim()) {
    throw new Error(
      "The RoyalOS Executive Synthesizer received an empty workspace."
    );
  }

  if (
    !options.brainPlan.objective.trim()
  ) {
    throw new Error(
      "The RoyalOS Executive Synthesizer received a Brain plan without an objective."
    );
  }

  if (
    options.collaboration.leadEmployee !==
    options.brainPlan.primaryEmployee
  ) {
    throw new Error(
      "The collaboration lead does not match the Brain-selected lead executive."
    );
  }
}

/**
 * Produces and validates the final CEO-ready RoyalOS briefing.
 *
 * This function does not add another model request.
 * It uses mergeReports.ts for the lead-executive model call,
 * then performs deterministic quality checks locally.
 */
export async function synthesizeRoyalOSExecutiveBriefing(
  options: ExecutiveSynthesisOptions
): Promise<ExecutiveSynthesisResult> {
  const startTime =
    globalThis.performance.now();

  validateSynthesisInput(options);

  if (options.signal?.aborted) {
    throw new Error(
      "RoyalOS executive synthesis was cancelled before execution."
    );
  }

  const synthesis =
    await mergeRoyalOSEmployeeReports({
      client:
        options.client,

      model:
        options.model,

      idea:
        options.idea,

      workspace:
        options.workspace,

      brainPlan:
        options.brainPlan,

      collaboration:
        options.collaboration,

      maxKnowledgeCharacters:
        options.maxKnowledgeCharacters,

      maxReportCharacters:
        options.maxReportCharacters,

      signal:
        options.signal,
    });

  if (!synthesis.draft.trim()) {
    throw new Error(
      `${synthesis.leadEmployee} returned an empty executive briefing.`
    );
  }

  const quality =
    evaluateExecutiveBriefing(
      synthesis.draft,
      options.brainPlan,
      options.collaboration
    );

  const durationMs =
    elapsedMilliseconds(startTime);

  console.log(
    "RoyalOS Executive Synthesizer completed:",
    {
      leadEmployee:
        synthesis.leadEmployee,

      model:
        synthesis.model,

      qualityPassed:
        quality.passed,

      qualityScore:
        quality.score,

      wordCount:
        quality.wordCount,

      completedEmployeeReports:
        synthesis.completedEmployeeReports,

      failedEmployeeReports:
        synthesis.failedEmployeeReports,

      timedOutEmployeeReports:
        synthesis.timedOutEmployeeReports,

      durationMs,
    }
  );

  if (quality.warnings.length > 0) {
    console.warn(
      "RoyalOS Executive Briefing quality warnings:",
      quality.warnings
    );
  }

  return {
    draft:
      synthesis.draft,

    leadEmployee:
      synthesis.leadEmployee,

    model:
      synthesis.model,

    synthesis,

    quality,

    completedEmployeeReports:
      synthesis.completedEmployeeReports,

    failedEmployeeReports:
      synthesis.failedEmployeeReports,

    timedOutEmployeeReports:
      synthesis.timedOutEmployeeReports,

    collaborationFullySuccessful:
      options.collaboration
        .collaborationSucceeded,

    requiresCEOApproval:
      options.brainPlan
        .requiresCEOApproval,

    documentsDiscovered:
      synthesis.documentsDiscovered,

    documentsLoaded:
      synthesis.documentsLoaded,

    loadedFiles:
      synthesis.loadedFiles,

    durationMs,

    responseId:
      synthesis.responseId,
  };
}