import type OpenAI from "openai";
import type {
  RoyalOSBrainPlan,
  RoyalOSEmployee,
} from "../brain";
import { loadRoyalOSKnowledge } from "../knowledge";
import { ROYALOS_EMPLOYEE_ROLES } from "@/lib/employees/config";
import type {
  EmployeeReport,
  MissionOrchestrationResult,
} from "./mission";

export type MergeReportsOptions = {
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
   * Maximum combined size of supporting-employee reports.
   */
  maxReportCharacters?: number;

  /**
   * Optional request-cancellation signal.
   */
  signal?: AbortSignal;
};

export type MergedExecutiveReport = {
  draft: string;
  leadEmployee: RoyalOSEmployee;
  model: string;
  completedEmployeeReports: number;
  failedEmployeeReports: number;
  timedOutEmployeeReports: number;
  documentsDiscovered: number;
  documentsLoaded: number;
  loadedFiles: string[];
  durationMs: number;
  responseId?: string;
};

const DEFAULT_MAX_KNOWLEDGE_CHARACTERS = 100_000;
const DEFAULT_MAX_REPORT_CHARACTERS = 90_000;

const employeeRoles = ROYALOS_EMPLOYEE_ROLES;

function elapsedMilliseconds(startTime: number): number {
  return Math.round(performance.now() - startTime);
}

function clampCharacterLimit(
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
    Math.max(minimum, Math.floor(value))
  );
}

function limitText(
  value: string,
  maximumCharacters: number,
  notice: string
): string {
  if (value.length <= maximumCharacters) {
    return value;
  }

  return `${value.slice(0, maximumCharacters)}

[ROYALOS NOTICE: ${notice}]`;
}

function formatList(
  values: string[],
  emptyValue = "None"
): string {
  if (values.length === 0) {
    return emptyValue;
  }

  return values
    .map((value) => `- ${value}`)
    .join("\n");
}

function formatCompletedReport(
  report: EmployeeReport
): string {
  return `
==================================================
EXECUTIVE
${report.employee}

ROLE
${report.role}

STATUS
Completed

ASSIGNMENT DURATION
${report.durationMs}ms

DEPARTMENTAL REPORT

${report.report}
`.trim();
}

function formatUnsuccessfulReport(
  report: EmployeeReport
): string {
  return `
==================================================
EXECUTIVE
${report.employee}

ROLE
${report.role}

STATUS
${report.status === "timed_out" ? "Timed Out" : "Failed"}

ASSIGNMENT DURATION
${report.durationMs}ms

ERROR
${report.error ?? "No error details were supplied."}

INTEGRATION RULE
Do not invent this employee's findings. Identify the missing contribution
and recommend whether the work should be retried or handled manually.
`.trim();
}

function formatCollaborationReports(
  collaboration: MissionOrchestrationResult,
  maximumCharacters: number
): string {
  if (collaboration.reports.length === 0) {
    return `
ROYALOS EMPLOYEE COLLABORATION

No independent supporting-employee reports were required for this mission.
`.trim();
  }

  const sections = collaboration.reports.map(
    (report) =>
      report.status === "completed"
        ? formatCompletedReport(report)
        : formatUnsuccessfulReport(report)
  );

  const skippedSection =
    collaboration.skippedEmployees.length > 0
      ? `

==================================================
EMPLOYEES NOT RUN BECAUSE OF COLLABORATOR LIMIT

${collaboration.skippedEmployees
  .map((employee) => `- ${employee}`)
  .join("\n")}
`
      : "";

  const combined = `
ROYALOS MULTI-EMPLOYEE COLLABORATION

LEAD EXECUTIVE
${collaboration.leadEmployee}

PARTICIPATING EMPLOYEES
${formatList(
  collaboration.participatingEmployees
)}

COMPLETED REPORTS
${collaboration.completedReports}

FAILED REPORTS
${collaboration.failedReports}

TIMED-OUT REPORTS
${collaboration.timedOutReports}

TOTAL COLLABORATION DURATION
${collaboration.totalDurationMs}ms

COLLABORATION FULLY SUCCESSFUL
${collaboration.collaborationSucceeded ? "Yes" : "No"}

${sections.join("\n\n")}
${skippedSection}
`.trim();

  return limitText(
    combined,
    maximumCharacters,
    "Some supporting-employee report content was omitted because the collaboration bundle reached its configured size limit."
  );
}

function buildLeadRoutingQuery(
  options: MergeReportsOptions
): string {
  const completedReportTopics =
    options.collaboration.reports
      .filter(
        (report) =>
          report.status === "completed"
      )
      .map(
        (report) =>
          `${report.employee} ${report.role} ${report.report.slice(
            0,
            3_000
          )}`
      );

  return [
    options.idea,
    options.brainPlan.objective,
    options.brainPlan.taskType,
    options.brainPlan.primaryEmployee,
    ...options.brainPlan.supportingEmployees,
    ...options.brainPlan.knowledgeFocus,
    ...options.brainPlan.deliverables,
    ...options.brainPlan.risks,
    ...completedReportTopics,
    "executive synthesis",
    "decision support",
    "CEO approval",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildLeadInstructions(
  options: MergeReportsOptions
): string {
  const leadEmployee =
    options.brainPlan.primaryEmployee;

  const leadRole =
    employeeRoles[leadEmployee];

  return `
You are ${leadEmployee}, the ${leadRole} inside RoyalOS.

You are the lead executive responsible for integrating independent
departmental reports into one accurate, practical executive briefing
for the CEO of Triple-Hay Concept LLC.

ACTIVE WORKSPACE
${options.workspace}

CEO MISSION
${options.idea}

MISSION OBJECTIVE
${options.brainPlan.objective}

TASK TYPE
${options.brainPlan.taskType}

COMPLEXITY
${options.brainPlan.complexity}

SUPPORTING EXECUTIVES REQUESTED
${formatList(
  options.brainPlan.supportingEmployees
)}

KNOWLEDGE PRIORITIES
${formatList(
  options.brainPlan.knowledgeFocus
)}

REQUIRED DELIVERABLES
${formatList(
  options.brainPlan.deliverables
)}

INITIAL RISKS
${formatList(
  options.brainPlan.risks
)}

CEO APPROVAL REQUIRED
${options.brainPlan.requiresCEOApproval ? "Yes" : "No"}

EXECUTIVE-SYNTHESIS RULES

1. Produce one unified executive briefing, not a collection of copied reports.

2. Use each completed departmental report as that employee's independent
professional contribution.

3. Reconcile duplication, conflicts, gaps, dependencies, and sequencing.

4. Do not claim an employee completed work when that employee's report
failed, timed out, or was skipped.

5. When employee recommendations conflict:
   - explain the conflict,
   - evaluate the trade-offs,
   - recommend the strongest path,
   - identify any CEO decision required.

6. Never invent:
   - external research,
   - company data,
   - financial results,
   - customer records,
   - approvals,
   - completed real-world actions,
   - technical implementation results.

7. Distinguish clearly among:
   - confirmed Company Intelligence,
   - completed employee analysis,
   - recommendations,
   - assumptions,
   - missing information,
   - external verification still required.

8. Protect the CEO's time. Lead with the decision, recommendation,
priority, or risk that matters most.

9. Convert departmental work into:
   - clear actions,
   - responsible owners,
   - dependencies,
   - timelines,
   - measurable outcomes,
   - approval gates.

10. Avoid repeating the full company profile or reproducing complete
employee reports.

11. Identify incomplete departmental work and recommend whether it should
be retried before approval.

12. Do not claim public publishing, spending, outreach, deployment,
configuration, or other real-world execution occurred unless a connected
tool returned confirmed success.

13. Use readable plain text.

14. Do not use markdown asterisks for headings or emphasis.

15. Use only sections relevant to the mission.

RECOMMENDED FINAL STRUCTURE

Executive Decision Summary
Mission
Objective
Strategic Alignment
Integrated Analysis
Recommended Plan
Executive Assignments
Timeline and Dependencies
Risks and Mitigation
Success Measures
Missing Information
CEO Decisions Required
Knowledge to Capture
Mission Status

When executive approval is required, end with:

Status: Waiting for Boss approval.
`.trim();
}

function buildKnowledgeInstructions(
  knowledge: string
): string {
  return `
ROYALOS LEAD-EXECUTIVE COMPANY INTELLIGENCE

The following internal Company Intelligence was selected for the lead
executive and this mission.

Use it as the primary internal authority.

RULES

- Prefer approved Company Intelligence over generic advice.
- Do not expose the complete knowledge bundle.
- Do not repeat lengthy documents unnecessarily.
- Do not treat planned capabilities as implemented.
- Identify outdated, missing, or externally verifiable information.
- Resolve conflicts according to company authority, ethics, leadership,
and decision standards.

==================================================

${knowledge}
`.trim();
}

export async function mergeRoyalOSEmployeeReports(
  options: MergeReportsOptions
): Promise<MergedExecutiveReport> {
  const startTime = performance.now();

  if (options.signal?.aborted) {
    throw new Error(
      "RoyalOS executive synthesis was cancelled before execution."
    );
  }

  const leadEmployee =
    options.brainPlan.primaryEmployee;

  const knowledgeLimit =
    clampCharacterLimit(
      options.maxKnowledgeCharacters,
      DEFAULT_MAX_KNOWLEDGE_CHARACTERS,
      30_000,
      150_000
    );

  const reportsLimit =
    clampCharacterLimit(
      options.maxReportCharacters,
      DEFAULT_MAX_REPORT_CHARACTERS,
      20_000,
      150_000
    );

  const routingQuery =
    buildLeadRoutingQuery(options);

  const knowledgeBundle =
    await loadRoyalOSKnowledge({
      employee: leadEmployee,
      workspace: options.workspace,
      query: routingQuery,
    });

  if (!knowledgeBundle.content.trim()) {
    throw new Error(
      `RoyalOS found no usable Company Intelligence for lead executive ${leadEmployee}.`
    );
  }

  const preparedKnowledge =
    limitText(
      knowledgeBundle.content,
      knowledgeLimit,
      "Additional lead-executive Company Intelligence was omitted because the configured knowledge limit was reached."
    );

  const collaborationReports =
    formatCollaborationReports(
      options.collaboration,
      reportsLimit
    );

  const leadInstructions =
    buildLeadInstructions(options);

  const knowledgeInstructions =
    buildKnowledgeInstructions(
      preparedKnowledge
    );

  const response =
    await options.client.responses.create(
      {
        model: options.model,

        instructions: `${leadInstructions}

==================================================

${knowledgeInstructions}`,

        input: `
CEO MISSION

${options.idea}

==================================================

INDEPENDENT ROYALOS EMPLOYEE REPORTS

${collaborationReports}

==================================================

Prepare the final integrated executive briefing.
`.trim(),

        reasoning: {
          effort:
            options.brainPlan.complexity ===
            "critical"
              ? "high"
              : "medium",
        },

        text: {
          verbosity: "medium",
        },

        store: false,
      },
      options.signal
        ? {
            signal: options.signal,
          }
        : undefined
    );

  const draft =
    response.output_text?.trim();

  if (!draft) {
    throw new Error(
      `${leadEmployee} returned no usable integrated executive briefing.`
    );
  }

  const durationMs =
    elapsedMilliseconds(startTime);

  console.log(
    `RoyalOS executive synthesis completed: lead=${leadEmployee}, model=${options.model}, employeeReports=${options.collaboration.completedReports}, documents=${knowledgeBundle.documentsLoaded}, durationMs=${durationMs}`
  );

  if (
    process.env.NODE_ENV === "development"
  ) {
    console.log(
      `RoyalOS lead executive ${leadEmployee} selected files:`,
      knowledgeBundle.loadedFiles
    );
  }

  return {
    draft,

    leadEmployee,

    model: options.model,

    completedEmployeeReports:
      options.collaboration.completedReports,

    failedEmployeeReports:
      options.collaboration.failedReports,

    timedOutEmployeeReports:
      options.collaboration.timedOutReports,

    documentsDiscovered:
      knowledgeBundle.documentsDiscovered,

    documentsLoaded:
      knowledgeBundle.documentsLoaded,

    loadedFiles:
      knowledgeBundle.loadedFiles,

    durationMs,

    responseId: response.id,
  };
}