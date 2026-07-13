   import type {
  RoyalOSBrainPlan,
  RoyalOSEmployee,
} from "../brain";

export type EmployeeReportStatus =
  | "completed"
  | "failed"
  | "timed_out";

export type EmployeeAssignment = {
  employee: RoyalOSEmployee;
  role: string;
  objective: string;
  assignment: string;
  knowledgeFocus: string[];
  expectedDeliverables: string[];
};

export type EmployeeReport = {
  employee: RoyalOSEmployee;
  role: string;
  status: EmployeeReportStatus;
  assignment: string;
  report: string;
  error?: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
};

export type EmployeeRunnerRequest = {
  employee: RoyalOSEmployee;
  workspace: string;
  mission: string;
  assignment: EmployeeAssignment;
  brainPlan: RoyalOSBrainPlan;
  signal: AbortSignal;
};

export type EmployeeRunner = (
  request: EmployeeRunnerRequest
) => Promise<string>;

export type MissionOrchestrationOptions = {
  idea: string;
  workspace: string;
  brainPlan: RoyalOSBrainPlan;
  runEmployee: EmployeeRunner;

  /**
   * Maximum number of supporting employees that may run.
   * RoyalOS currently has eight possible supporting employees.
   */
  maxCollaborators?: number;

  /**
   * Maximum number of employee calls running simultaneously.
   * Lower values reduce the chance of API rate-limit pressure.
   */
  concurrency?: number;

  /**
   * Maximum time allowed for one employee assignment.
   */
  employeeTimeoutMs?: number;
};

export type MissionOrchestrationResult = {
  objective: string;
  leadEmployee: RoyalOSEmployee;
  requestedSupportingEmployees: RoyalOSEmployee[];
  participatingEmployees: RoyalOSEmployee[];
  skippedEmployees: RoyalOSEmployee[];
  reports: EmployeeReport[];
  completedReports: number;
  failedReports: number;
  timedOutReports: number;
  totalDurationMs: number;
  collaborationSucceeded: boolean;
};

const DEFAULT_MAX_COLLABORATORS = 8;
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_EMPLOYEE_TIMEOUT_MS = 60_000;

const employeeRoles: Record<RoyalOSEmployee, string> = {
  Adedeji: "Executive Assistant and Chief of Staff",
  Atlas: "Director of Research and Business Intelligence",
  Emmy: "Director of Marketing and Content Strategy",
  Nova: "Chief Creative Officer",
  Jack: "Chief Media and Video Production Officer",
  Tyson: "Chief Data and Business Intelligence Officer",
  Titan: "Chief Operating Officer",
  Janet: "Chief Customer Experience Officer",
  Orion: "Chief Technology and AI Systems Officer",
};

const employeeAssignmentFocus: Record<
  RoyalOSEmployee,
  string
> = {
  Adedeji:
    "Coordinate the mission, identify decisions, manage dependencies, protect CEO time, and prepare executive recommendations.",

  Atlas:
    "Research the mission using reliable evidence, identify market conditions, verify claims, examine competitors, and clearly separate confirmed facts from assumptions.",

  Emmy:
    "Develop the marketing, positioning, messaging, content, audience-growth, promotion, SEO, email, and communication recommendations relevant to the mission.",

  Nova:
    "Develop the creative direction, brand presentation, visual requirements, design standards, user experience, and accessibility recommendations relevant to the mission.",

  Jack:
    "Develop the media, video, audio, production, script, storyboard, recording, publishing-preparation, and content-repurposing recommendations relevant to the mission.",

  Tyson:
    "Develop the measurement framework, KPIs, analytics requirements, assumptions, reporting structure, forecasting considerations, and performance-evaluation recommendations.",

  Titan:
    "Develop the operational plan, timeline, owners, dependencies, SOP requirements, readiness checks, quality controls, contingency procedures, and execution workflow.",

  Janet:
    "Develop the customer journey, support plan, onboarding, communication, FAQs, feedback, accessibility, retention, follow-up, and customer-experience recommendations.",

  Orion:
    "Develop the technology architecture, software, automation, integrations, APIs, security, infrastructure, testing, reliability, and implementation requirements.",
};

function elapsedMilliseconds(startTime: number): number {
  return Math.round(performance.now() - startTime);
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
    Math.max(minimum, Math.floor(value))
  );
}

function uniqueEmployees(
  employees: RoyalOSEmployee[]
): RoyalOSEmployee[] {
  return Array.from(new Set(employees));
}

function selectRelevantDeliverables(
  employee: RoyalOSEmployee,
  deliverables: string[]
): string[] {
  if (deliverables.length === 0) {
    return [
      `Produce a professional ${employee} departmental report for the mission.`,
    ];
  }

  const employeeTerms: Record<
    RoyalOSEmployee,
    string[]
  > = {
    Adedeji: [
      "executive",
      "approval",
      "decision",
      "coordination",
      "brief",
      "mission",
    ],

    Atlas: [
      "research",
      "evidence",
      "market",
      "competitor",
      "claims",
      "audience",
      "intelligence",
    ],

    Emmy: [
      "marketing",
      "campaign",
      "promotion",
      "message",
      "email",
      "social",
      "landing",
      "content",
      "audience",
    ],

    Nova: [
      "creative",
      "visual",
      "design",
      "graphic",
      "brand",
      "slide",
      "identity",
      "accessibility",
    ],

    Jack: [
      "video",
      "production",
      "recording",
      "script",
      "media",
      "run-of-show",
      "speaker",
      "storyboard",
    ],

    Tyson: [
      "measurement",
      "analytics",
      "metric",
      "kpi",
      "dashboard",
      "report",
      "performance",
      "conversion",
      "forecast",
    ],

    Titan: [
      "operations",
      "timeline",
      "workflow",
      "milestone",
      "owner",
      "dependency",
      "checklist",
      "sop",
      "readiness",
      "contingency",
    ],

    Janet: [
      "attendee",
      "customer",
      "support",
      "follow-up",
      "feedback",
      "faq",
      "experience",
      "reminder",
      "onboarding",
      "accessibility",
    ],

    Orion: [
      "technology",
      "platform",
      "automation",
      "integration",
      "api",
      "security",
      "registration",
      "technical",
      "access",
      "system",
      "testing",
    ],
  };

  const terms = employeeTerms[employee];

  const matchedDeliverables = deliverables.filter(
    (deliverable) => {
      const normalizedDeliverable =
        deliverable.toLowerCase();

      return terms.some((term) =>
        normalizedDeliverable.includes(term)
      );
    }
  );

  if (matchedDeliverables.length > 0) {
    return matchedDeliverables;
  }

  return deliverables.slice(0, 3);
}

function createEmployeeAssignment(
  employee: RoyalOSEmployee,
  idea: string,
  brainPlan: RoyalOSBrainPlan
): EmployeeAssignment {
  const expectedDeliverables =
    selectRelevantDeliverables(
      employee,
      brainPlan.deliverables
    );

  return {
    employee,

    role: employeeRoles[employee],

    objective: brainPlan.objective,

    assignment: `
Review the CEO mission from the perspective of your official RoyalOS role.

CEO MISSION
${idea}

YOUR DEPARTMENTAL RESPONSIBILITY
${employeeAssignmentFocus[employee]}

Produce an independent professional report for the lead executive.

Your report must:

1. Focus only on your area of responsibility.
2. Use confirmed Company Intelligence when available.
3. Clearly label assumptions and missing information.
4. Identify risks, dependencies, and approval requirements.
5. Recommend specific actions, owners, timing, and measurable outcomes.
6. Avoid repeating the entire company mission or other departments' work.
7. Never claim that real-world actions were completed.
8. Prepare useful work that the lead executive can incorporate into the final executive briefing.
`.trim(),

    knowledgeFocus: uniqueStrings([
      employee,
      employeeRoles[employee],
      ...brainPlan.knowledgeFocus,
    ]),

    expectedDeliverables,
  };
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

async function runEmployeeWithTimeout(
  employee: RoyalOSEmployee,
  assignment: EmployeeAssignment,
  options: {
    idea: string;
    workspace: string;
    brainPlan: RoyalOSBrainPlan;
    runEmployee: EmployeeRunner;
    timeoutMs: number;
  }
): Promise<EmployeeReport> {
  const startedAt = new Date();
  const startTime = performance.now();
  const controller = new AbortController();

  let timeoutHandle:
    | ReturnType<typeof setTimeout>
    | undefined;

  try {
    const timeoutPromise = new Promise<never>(
      (_, reject) => {
        timeoutHandle = setTimeout(() => {
          controller.abort();

          reject(
            new Error(
              `${employee} exceeded the ${options.timeoutMs}ms collaboration timeout.`
            )
          );
        }, options.timeoutMs);
      }
    );

    const report = await Promise.race([
      options.runEmployee({
        employee,
        workspace: options.workspace,
        mission: options.idea,
        assignment,
        brainPlan: options.brainPlan,
        signal: controller.signal,
      }),
      timeoutPromise,
    ]);

    if (!report.trim()) {
      throw new Error(
        `${employee} returned an empty collaboration report.`
      );
    }

    return {
      employee,
      role: employeeRoles[employee],
      status: "completed",
      assignment: assignment.assignment,
      report: report.trim(),
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: elapsedMilliseconds(startTime),
    };
  } catch (error) {
    const timedOut =
      controller.signal.aborted ||
      (error instanceof Error &&
        error.message
          .toLowerCase()
          .includes("timeout"));

    return {
      employee,
      role: employeeRoles[employee],
      status: timedOut
        ? "timed_out"
        : "failed",
      assignment: assignment.assignment,
      report: "",
      error:
        error instanceof Error
          ? error.message
          : `Unknown ${employee} collaboration error.`,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: elapsedMilliseconds(startTime),
    };
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function runWithConcurrency<TInput, TOutput>(
  inputs: TInput[],
  concurrency: number,
  worker: (
    input: TInput,
    index: number
  ) => Promise<TOutput>
): Promise<TOutput[]> {
  const results = new Array<TOutput>(inputs.length);
  let nextIndex = 0;

  async function processNext(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= inputs.length) {
        return;
      }

      results[currentIndex] = await worker(
        inputs[currentIndex],
        currentIndex
      );
    }
  }

  const workerCount = Math.min(
    concurrency,
    inputs.length
  );

  await Promise.all(
    Array.from(
      { length: workerCount },
      () => processNext()
    )
  );

  return results;
}

export async function runRoyalOSMissionTeam(
  options: MissionOrchestrationOptions
): Promise<MissionOrchestrationResult> {
  const totalStartTime = performance.now();

  const maxCollaborators = clampInteger(
    options.maxCollaborators,
    DEFAULT_MAX_COLLABORATORS,
    1,
    8
  );

  const concurrency = clampInteger(
    options.concurrency,
    DEFAULT_CONCURRENCY,
    1,
    8
  );

  const employeeTimeoutMs = clampInteger(
    options.employeeTimeoutMs,
    DEFAULT_EMPLOYEE_TIMEOUT_MS,
    5_000,
    180_000
  );

  const requestedSupportingEmployees =
    uniqueEmployees(
      options.brainPlan.supportingEmployees
    ).filter(
      (employee) =>
        employee !==
        options.brainPlan.primaryEmployee
    );

  const participatingEmployees =
    requestedSupportingEmployees.slice(
      0,
      maxCollaborators
    );

  const skippedEmployees =
    requestedSupportingEmployees.slice(
      maxCollaborators
    );

  if (
    !options.brainPlan.requiresTeam ||
    participatingEmployees.length === 0
  ) {
    return {
      objective: options.brainPlan.objective,
      leadEmployee:
        options.brainPlan.primaryEmployee,
      requestedSupportingEmployees,
      participatingEmployees: [],
      skippedEmployees,
      reports: [],
      completedReports: 0,
      failedReports: 0,
      timedOutReports: 0,
      totalDurationMs:
        elapsedMilliseconds(totalStartTime),
      collaborationSucceeded: true,
    };
  }

  const assignments =
    participatingEmployees.map((employee) =>
      createEmployeeAssignment(
        employee,
        options.idea,
        options.brainPlan
      )
    );

  const reports = await runWithConcurrency(
    assignments,
    concurrency,
    async (assignment) =>
      runEmployeeWithTimeout(
        assignment.employee,
        assignment,
        {
          idea: options.idea,
          workspace: options.workspace,
          brainPlan: options.brainPlan,
          runEmployee: options.runEmployee,
          timeoutMs: employeeTimeoutMs,
        }
      )
  );

  const completedReports = reports.filter(
    (report) => report.status === "completed"
  ).length;

  const failedReports = reports.filter(
    (report) => report.status === "failed"
  ).length;

  const timedOutReports = reports.filter(
    (report) => report.status === "timed_out"
  ).length;

  const collaborationSucceeded =
    completedReports > 0 &&
    failedReports === 0 &&
    timedOutReports === 0;

  return {
    objective: options.brainPlan.objective,

    leadEmployee:
      options.brainPlan.primaryEmployee,

    requestedSupportingEmployees,

    participatingEmployees,

    skippedEmployees,

    reports,

    completedReports,

    failedReports,

    timedOutReports,

    totalDurationMs:
      elapsedMilliseconds(totalStartTime),

    collaborationSucceeded,
  };
}

export function formatEmployeeReportsForLead(
  result: MissionOrchestrationResult
): string {
  if (result.reports.length === 0) {
    return `
ROYALOS COLLABORATION REPORT

No supporting employee reports were required for this request.
`.trim();
  }

  const reportSections = result.reports.map(
    (report) => {
      if (report.status !== "completed") {
        return `
==================================================
EMPLOYEE: ${report.employee}
ROLE: ${report.role}
STATUS: ${report.status.toUpperCase()}
==================================================

This employee did not return a usable report.

ERROR
${report.error ?? "No error details were provided."}
`.trim();
      }

      return `
==================================================
EMPLOYEE: ${report.employee}
ROLE: ${report.role}
STATUS: COMPLETED
DURATION: ${report.durationMs}ms
==================================================

${report.report}
`.trim();
    }
  );

  const skippedSection =
    result.skippedEmployees.length > 0
      ? `

SKIPPED BECAUSE OF COLLABORATOR LIMIT
${result.skippedEmployees.join(", ")}
`
      : "";

  return `
ROYALOS MULTI-EMPLOYEE COLLABORATION REPORT

LEAD EXECUTIVE
${result.leadEmployee}

COMPLETED REPORTS
${result.completedReports}

FAILED REPORTS
${result.failedReports}

TIMED-OUT REPORTS
${result.timedOutReports}

TOTAL COLLABORATION TIME
${result.totalDurationMs}ms
${skippedSection}

${reportSections.join("\n\n")}
`.trim();
}