"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
} from "react";

/*
 * ============================================================
 * BASIC TYPES
 * ============================================================
 */

type WorkspaceName =
  | "Triple-Hay Concept LLC"
  | "ChoiceRoyals"
  | "Xena Grace"
  | "TD Talk";

type WorkbenchMode =
  | "plan"
  | "inspect"
  | "search";

type DeveloperRiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

type DeveloperRequestStatus =
  | "requested"
  | "validating"
  | "reading"
  | "analyzing"
  | "planning"
  | "awaiting_approval"
  | "approved"
  | "applying"
  | "testing"
  | "succeeded"
  | "failed"
  | "rejected"
  | "cancelled"
  | "rolled_back";

type DeveloperEmployee =
  | "Orion"
  | "Atlas"
  | "Nova"
  | "Titan"
  | "Adedeji";

type DeveloperFileReference = {
  relativePath: string;
  fileName: string;
  extension: string;
  language: string;
  category: string;
  sizeBytes: number;
  lineCount: number | null;
  lastModifiedAt: string | null;
  accessLevel: string;
  readable: boolean;
  writable: boolean;
  blockedReason?: string;
};

type DeveloperFileContent = {
  file: DeveloperFileReference;
  content: string;
  truncated: boolean;
  totalCharacters: number;
  returnedCharacters: number;
  sha256?: string;
  loadedAt: string;
};

type DeveloperProject = {
  name: string;
  rootPath: string;
  workspace: WorkspaceName;
  framework?: string;
  packageManager?:
    | "npm"
    | "pnpm"
    | "yarn"
    | "bun"
    | "unknown";
  readOnly: boolean;
  createdAt: string;
};

type DeveloperInspectionResult = {
  requestId: string;
  status: DeveloperRequestStatus;
  project: DeveloperProject;
  files: DeveloperFileReference[];
  contents: DeveloperFileContent[];
  blockedPaths: Array<{
    path: string;
    reason: string;
  }>;
  summary: string;
  warnings: string[];
  inspectedAt: string;
  durationMs: number;
};

type DeveloperSearchMatch = {
  relativePath: string;
  lineNumber: number;
  columnNumber: number;
  line: string;
  before: string[];
  after: string[];
  match: string;
  language: string;
};

type DeveloperSearchResult = {
  requestId: string;
  query: string;
  status: DeveloperRequestStatus;
  matches: DeveloperSearchMatch[];
  searchedFiles: number;
  skippedFiles: number;
  truncated: boolean;
  warnings: string[];
  searchedAt: string;
  durationMs: number;
};

type DeveloperPlanStep = {
  stepNumber: number;
  title: string;
  description: string;
  employee: DeveloperEmployee;
  affectedPaths: string[];
  riskLevel: DeveloperRiskLevel;
  requiresCEOApproval: boolean;
  validationCommands: string[];
  rollbackInstructions?: string;
  dependencies?: number[];
};

type DeveloperPlan = {
  planId: string;
  requestId: string;
  title: string;
  objective: string;
  summary: string;
  primaryEmployee: DeveloperEmployee;
  supportingEmployees: DeveloperEmployee[];
  workspace: WorkspaceName;
  status: DeveloperRequestStatus;
  riskLevel: DeveloperRiskLevel;
  requiresCEOApproval: boolean;
  affectedPaths: string[];
  steps: DeveloperPlanStep[];
  assumptions: string[];
  risks: string[];
  validationCommands: string[];
  rollbackPlan: string[];
  createdAt: string;
};

type DeveloperPlanResponse = {
  message?: string;
  stage?: string;
  plan?: DeveloperPlan;
  inspection?: DeveloperInspectionResult;
  searches?: DeveloperSearchResult[];
  groundedPaths?: string[];
  warnings?: string[];
  error?: string;
  details?: string;
};

type DeveloperInspectionResponse = {
  message?: string;
  stage?: string;
  inspection?: DeveloperInspectionResult;
  error?: string;
  details?: string;
};

type DeveloperSearchResponse = {
  message?: string;
  stage?: string;
  search?: DeveloperSearchResult;
  error?: string;
  details?: string;
};

/*
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const WORKSPACES: WorkspaceName[] = [
  "Triple-Hay Concept LLC",
  "ChoiceRoyals",
  "Xena Grace",
  "TD Talk",
];

const QUICK_REQUESTS = [
  {
    label: "Explain dashboard",
    mode: "plan" as const,
    instruction:
      "Inspect and explain how the RoyalOS dashboard navigation and module rendering currently work. Do not change any project files.",
    paths:
      "app/page.tsx\napp/page.module.css",
    searches:
      "activeSection\nNAVIGATION\nrenderDashboard",
  },
  {
    label: "Debug a problem",
    mode: "plan" as const,
    instruction:
      "Inspect the RoyalOS project, identify the likely cause of the current problem, and prepare a safe code-fix plan. Do not apply any changes.",
    paths:
      "app/page.tsx",
    searches:
      "error\nfailed\ncatch",
  },
  {
    label: "Find API routes",
    mode: "search" as const,
    instruction:
      "export async function",
    paths:
      "app/api",
    searches:
      "",
  },
  {
    label: "Inspect missions",
    mode: "inspect" as const,
    instruction:
      "Inspect and explain the RoyalOS mission system without changing any files.",
    paths:
      "lib/orchestrator\napp/api/royalos\napp/api/emmy",
    searches:
      "",
  },
];

/*
 * ============================================================
 * STYLE HELPERS
 * ============================================================
 */

const cardStyle: CSSProperties = {
  background:
    "linear-gradient(145deg, rgba(19,25,38,0.98), rgba(12,17,27,0.98))",
  border:
    "1px solid rgba(255,255,255,0.08)",
  borderRadius: 22,
  boxShadow:
    "0 22px 60px rgba(0,0,0,0.24)",
};

const inputStyle: CSSProperties = {
  width: "100%",
  borderRadius: 13,
  border:
    "1px solid rgba(255,255,255,0.1)",
  background:
    "rgba(255,255,255,0.045)",
  color: "#ffffff",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  color: "rgba(255,255,255,0.82)",
  fontSize: 13,
  fontWeight: 650,
};

const mutedTextStyle: CSSProperties = {
  color:
    "rgba(255,255,255,0.64)",
};

function getRiskColor(
  riskLevel:
    DeveloperRiskLevel
): string {
  if (
    riskLevel ===
    "critical"
  ) {
    return "#ff6b7a";
  }

  if (
    riskLevel ===
    "high"
  ) {
    return "#ff9b61";
  }

  if (
    riskLevel ===
    "medium"
  ) {
    return "#f6ca62";
  }

  return "#70ddb0";
}

function getStatusColor(
  status:
    DeveloperRequestStatus
): string {
  if (
    status ===
      "failed" ||
    status ===
      "rejected" ||
    status ===
      "cancelled"
  ) {
    return "#ff7c88";
  }

  if (
    status ===
      "awaiting_approval" ||
    status ===
      "testing" ||
    status ===
      "planning"
  ) {
    return "#f6ca62";
  }

  return "#70ddb0";
}

function formatStatus(
  value: string
): string {
  return value
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatBytes(
  bytes: number
): string {
  if (
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
    return "0 B";
  }

  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function splitTextLines(
  value: string
): string[] {
  return Array.from(
    new Set(
      value
        .split(
          /\r\n|\r|\n|,/
        )
        .map(
          (item) =>
            item.trim()
        )
        .filter(Boolean)
    )
  );
}

function getErrorMessage(
  value: unknown
): string {
  return value instanceof Error
    ? value.message
    : "Orion could not complete the request.";
}

async function parseJsonResponse<
  TValue,
>(
  response: Response
): Promise<TValue> {
  const text =
    await response.text();

  if (!text) {
    return {} as TValue;
  }

  try {
    return JSON.parse(
      text
    ) as TValue;
  } catch {
    throw new Error(
      "RoyalOS received an invalid response from the Developer Workbench."
    );
  }
}

/*
 * ============================================================
 * SMALL UI COMPONENTS
 * ============================================================
 */

function Badge({
  children,
  color,
}: {
  children:
    React.ReactNode;
  color: string;
}) {
  return (
    <span
      style={{
        display:
          "inline-flex",
        alignItems:
          "center",
        gap: 6,
        padding:
          "7px 10px",
        borderRadius:
          999,
        border:
          `1px solid ${color}55`,
        background:
          `${color}16`,
        color,
        fontSize:
          12,
        fontWeight:
          750,
        lineHeight:
          1,
      }}
    >
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value:
    string | number;
  detail?: string;
}) {
  return (
    <article
      style={{
        ...cardStyle,
        padding:
          18,
      }}
    >
      <div
        style={{
          color:
            "rgba(255,255,255,0.6)",
          fontSize:
            12,
          fontWeight:
            700,
          textTransform:
            "uppercase",
          letterSpacing:
            "0.08em",
        }}
      >
        {label}
      </div>

      <strong
        style={{
          display:
            "block",
          marginTop:
            8,
          color:
            "#ffffff",
          fontSize:
            24,
        }}
      >
        {value}
      </strong>

      {detail ? (
        <small
          style={{
            display:
              "block",
            marginTop:
              5,
            color:
              "rgba(255,255,255,0.55)",
          }}
        >
          {detail}
        </small>
      ) : null}
    </article>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div
      style={{
        marginBottom:
          16,
      }}
    >
      <h3
        style={{
          margin:
            0,
          color:
            "#ffffff",
          fontSize:
            18,
        }}
      >
        {title}
      </h3>

      {description ? (
        <p
          style={{
            margin:
              "6px 0 0",
            color:
              "rgba(255,255,255,0.58)",
            fontSize:
              13,
            lineHeight:
              1.55,
          }}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

/*
 * ============================================================
 * MAIN COMPONENT
 * ============================================================
 */

export default function OrionDeveloperWorkbench() {
  const [
    activeMode,
    setActiveMode,
  ] =
    useState<WorkbenchMode>(
      "plan"
    );

  const [
    instruction,
    setInstruction,
  ] =
    useState(
      "Inspect the RoyalOS project and prepare a safe development plan. Do not change any files."
    );

  const [
    workspace,
    setWorkspace,
  ] =
    useState<WorkspaceName>(
      "Triple-Hay Concept LLC"
    );

  const [
    pathsText,
    setPathsText,
  ] =
    useState("");

  const [
    searchQueriesText,
    setSearchQueriesText,
  ] =
    useState("");

  const [
    extensionText,
    setExtensionText,
  ] =
    useState(
      ".ts, .tsx, .js, .jsx, .css"
    );

  const [
    includeContents,
    setIncludeContents,
  ] =
    useState(false);

  const [
    caseSensitive,
    setCaseSensitive,
  ] =
    useState(false);

  const [
    useRegularExpression,
    setUseRegularExpression,
  ] =
    useState(false);

  const [
    maximumFiles,
    setMaximumFiles,
  ] =
    useState(30);

  const [
    contextLines,
    setContextLines,
  ] =
    useState(2);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    notice,
    setNotice,
  ] =
    useState("");

  const [
    planResponse,
    setPlanResponse,
  ] =
    useState<DeveloperPlanResponse | null>(
      null
    );

  const [
    inspectionResponse,
    setInspectionResponse,
  ] =
    useState<DeveloperInspectionResponse | null>(
      null
    );

  const [
    searchResponse,
    setSearchResponse,
  ] =
    useState<DeveloperSearchResponse | null>(
      null
    );

  const paths =
    useMemo(
      () =>
        splitTextLines(
          pathsText
        ),
      [
        pathsText,
      ]
    );

  const searchQueries =
    useMemo(
      () =>
        splitTextLines(
          searchQueriesText
        ),
      [
        searchQueriesText,
      ]
    );

  const extensions =
    useMemo(
      () =>
        splitTextLines(
          extensionText
        ),
      [
        extensionText,
      ]
    );

  function resetResults() {
    setPlanResponse(
      null
    );

    setInspectionResponse(
      null
    );

    setSearchResponse(
      null
    );

    setError("");
    setNotice("");
  }

  function applyQuickRequest(
    request:
      (typeof QUICK_REQUESTS)[number]
  ) {
    setActiveMode(
      request.mode
    );

    setInstruction(
      request.instruction
    );

    setPathsText(
      request.paths
    );

    setSearchQueriesText(
      request.searches
    );

    resetResults();
  }

  async function createPlan() {
    const preparedInstruction =
      instruction.trim();

    if (
      !preparedInstruction
    ) {
      setError(
        "Describe what you want Orion to inspect, explain, debug, or plan."
      );

      return;
    }

    setLoading(true);
    resetResults();

    try {
      const response =
        await fetch(
          "/api/developer/plan",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                instruction:
                  preparedInstruction,

                employee:
                  "Orion",

                workspace,

                paths:
                  paths.length >
                  0
                    ? paths
                    : undefined,

                searchQueries:
                  searchQueries.length >
                  0
                    ? searchQueries
                    : undefined,

                includeContents,

                maximumFiles,

                metadata: {
                  source:
                    "Orion Developer Workbench Dashboard",

                  requestedBy:
                    "Ayobami",
                },
              }),
          }
        );

      const data =
        await parseJsonResponse<DeveloperPlanResponse>(
          response
        );

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            data.details ||
            "Orion could not create the development plan."
        );
      }

      setPlanResponse(
        data
      );

      setNotice(
        data.message ||
          "Orion completed the development analysis."
      );
    } catch (
      requestError
    ) {
      setError(
        getErrorMessage(
          requestError
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function inspectProject() {
    const preparedInstruction =
      instruction.trim();

    if (
      !preparedInstruction
    ) {
      setError(
        "Tell Orion what part of the project to inspect."
      );

      return;
    }

    setLoading(true);
    resetResults();

    try {
      const response =
        await fetch(
          "/api/developer/inspect",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                instruction:
                  preparedInstruction,

                employee:
                  "Orion",

                workspace,

                paths:
                  paths.length >
                  0
                    ? paths
                    : undefined,

                includeTree:
                  true,

                includeContents,

                maximumDepth:
                  paths.length >
                  0
                    ? 6
                    : 3,

                maximumFiles,

                metadata: {
                  source:
                    "Orion Developer Workbench Dashboard",

                  requestedBy:
                    "Ayobami",
                },
              }),
          }
        );

      const data =
        await parseJsonResponse<DeveloperInspectionResponse>(
          response
        );

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            data.details ||
            "Orion could not inspect the project."
        );
      }

      setInspectionResponse(
        data
      );

      setNotice(
        data.message ||
          "Orion completed the read-only inspection."
      );
    } catch (
      requestError
    ) {
      setError(
        getErrorMessage(
          requestError
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function searchProject() {
    const query =
      instruction.trim();

    if (!query) {
      setError(
        "Enter a code symbol, phrase, import, route, or regular expression to search for."
      );

      return;
    }

    setLoading(true);
    resetResults();

    try {
      const response =
        await fetch(
          "/api/developer/search",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                query,

                employee:
                  "Orion",

                workspace,

                paths:
                  paths.length >
                  0
                    ? paths
                    : undefined,

                extensions:
                  extensions.length >
                  0
                    ? extensions
                    : undefined,

                caseSensitive,

                useRegularExpression,

                maximumResults:
                  150,

                contextLines,

                maximumFiles,

                maximumCharactersPerFile:
                  200_000,

                metadata: {
                  source:
                    "Orion Developer Workbench Dashboard",

                  requestedBy:
                    "Ayobami",
                },
              }),
          }
        );

      const data =
        await parseJsonResponse<DeveloperSearchResponse>(
          response
        );

      if (
        !response.ok
      ) {
        throw new Error(
          data.error ||
            data.details ||
            "Orion could not search the project."
        );
      }

      setSearchResponse(
        data
      );

      setNotice(
        data.message ||
          "Orion completed the read-only code search."
      );
    } catch (
      requestError
    ) {
      setError(
        getErrorMessage(
          requestError
        )
      );
    } finally {
      setLoading(false);
    }
  }

  async function runSelectedAction() {
    if (
      activeMode ===
      "inspect"
    ) {
      await inspectProject();
      return;
    }

    if (
      activeMode ===
      "search"
    ) {
      await searchProject();
      return;
    }

    await createPlan();
  }

  function renderPlanResult() {
    const plan =
      planResponse?.plan;

    if (!plan) {
      return null;
    }

    const inspection =
      planResponse
        .inspection;

    const topWarnings =
      planResponse.warnings ||
      [];

    return (
      <div
        style={{
          display:
            "grid",
          gap: 18,
        }}
      >
        <section
          style={{
            ...cardStyle,
            padding:
              22,
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "flex-start",
              justifyContent:
                "space-between",
              gap: 16,
              flexWrap:
                "wrap",
            }}
          >
            <div
              style={{
                maxWidth:
                  820,
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  gap: 8,
                  flexWrap:
                    "wrap",
                  marginBottom:
                    12,
                }}
              >
                <Badge
                  color={getStatusColor(
                    plan.status
                  )}
                >
                  {formatStatus(
                    plan.status
                  )}
                </Badge>

                <Badge
                  color={getRiskColor(
                    plan.riskLevel
                  )}
                >
                  {formatStatus(
                    plan.riskLevel
                  )}{" "}
                  risk
                </Badge>

                <Badge
                  color={
                    plan.requiresCEOApproval
                      ? "#f6ca62"
                      : "#70ddb0"
                  }
                >
                  {plan.requiresCEOApproval
                    ? "CEO approval required"
                    : "Read-only"}
                </Badge>
              </div>

              <h2
                style={{
                  margin:
                    0,
                  color:
                    "#ffffff",
                  fontSize:
                    24,
                  lineHeight:
                    1.25,
                }}
              >
                {plan.title}
              </h2>

              <p
                style={{
                  margin:
                    "12px 0 0",
                  color:
                    "rgba(255,255,255,0.72)",
                  lineHeight:
                    1.65,
                }}
              >
                {plan.summary}
              </p>
            </div>

            <div
              style={{
                minWidth:
                  180,
                padding:
                  14,
                borderRadius:
                  15,
                border:
                  "1px solid rgba(255,255,255,0.08)",
                background:
                  "rgba(255,255,255,0.035)",
              }}
            >
              <div
                style={{
                  color:
                    "rgba(255,255,255,0.55)",
                  fontSize:
                    12,
                }}
              >
                Primary developer
              </div>

              <strong
                style={{
                  display:
                    "block",
                  marginTop:
                    5,
                  color:
                    "#f6ca62",
                  fontSize:
                    18,
                }}
              >
                {plan.primaryEmployee}
              </strong>

              <small
                style={{
                  display:
                    "block",
                  marginTop:
                    5,
                  color:
                    "rgba(255,255,255,0.55)",
                }}
              >
                {plan.workspace}
              </small>
            </div>
          </div>
        </section>

        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          <MetricCard
            label="Plan steps"
            value={
              plan.steps
                .length
            }
            detail="Controlled workflow"
          />

          <MetricCard
            label="Affected paths"
            value={
              plan.affectedPaths
                .length
            }
            detail="Initial grounded scope"
          />

          <MetricCard
            label="Supporting team"
            value={
              plan.supportingEmployees
                .length
            }
            detail={
              plan.supportingEmployees
                .join(", ") ||
              "Orion only"
            }
          />

          <MetricCard
            label="Files inspected"
            value={
              inspection?.files
                .length ??
              0
            }
            detail="Read-only"
          />
        </section>

        <section
          style={{
            ...cardStyle,
            padding:
              22,
          }}
        >
          <SectionHeading
            title="Development objective"
            description="The outcome Orion is planning toward."
          />

          <p
            style={{
              margin:
                0,
              color:
                "rgba(255,255,255,0.78)",
              lineHeight:
                1.7,
            }}
          >
            {plan.objective}
          </p>
        </section>

        <section
          style={{
            ...cardStyle,
            padding:
              22,
          }}
        >
          <SectionHeading
            title="Controlled implementation plan"
            description="Nothing below has been written to the project. This is planning only."
          />

          <div
            style={{
              display:
                "grid",
              gap: 12,
            }}
          >
            {plan.steps.map(
              (
                step
              ) => (
                <article
                  key={
                    step.stepNumber
                  }
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "44px minmax(0, 1fr)",
                    gap: 14,
                    padding:
                      16,
                    borderRadius:
                      16,
                    border:
                      "1px solid rgba(255,255,255,0.07)",
                    background:
                      "rgba(255,255,255,0.028)",
                  }}
                >
                  <div
                    style={{
                      width:
                        38,
                      height:
                        38,
                      display:
                        "grid",
                      placeItems:
                        "center",
                      borderRadius:
                        12,
                      background:
                        "rgba(246,202,98,0.12)",
                      border:
                        "1px solid rgba(246,202,98,0.24)",
                      color:
                        "#f6ca62",
                      fontWeight:
                        800,
                    }}
                  >
                    {
                      step.stepNumber
                    }
                  </div>

                  <div>
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "space-between",
                        gap: 10,
                        flexWrap:
                          "wrap",
                      }}
                    >
                      <strong
                        style={{
                          color:
                            "#ffffff",
                          fontSize:
                            15,
                        }}
                      >
                        {step.title}
                      </strong>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: 7,
                          flexWrap:
                            "wrap",
                        }}
                      >
                        <Badge
                          color="#74b9ff"
                        >
                          {step.employee}
                        </Badge>

                        <Badge
                          color={getRiskColor(
                            step.riskLevel
                          )}
                        >
                          {step.riskLevel}
                        </Badge>

                        {step.requiresCEOApproval ? (
                          <Badge
                            color="#f6ca62"
                          >
                            Approval
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <p
                      style={{
                        margin:
                          "9px 0 0",
                        color:
                          "rgba(255,255,255,0.67)",
                        lineHeight:
                          1.6,
                        fontSize:
                          13,
                      }}
                    >
                      {step.description}
                    </p>

                    {step.affectedPaths
                      .length >
                    0 ? (
                      <div
                        style={{
                          marginTop:
                            10,
                          display:
                            "flex",
                          gap: 6,
                          flexWrap:
                            "wrap",
                        }}
                      >
                        {step.affectedPaths
                          .slice(
                            0,
                            8
                          )
                          .map(
                            (
                              pathValue
                            ) => (
                              <code
                                key={
                                  pathValue
                                }
                                style={{
                                  padding:
                                    "5px 7px",
                                  borderRadius:
                                    7,
                                  background:
                                    "rgba(0,0,0,0.24)",
                                  color:
                                    "#a8c7ff",
                                  fontSize:
                                    11,
                                }}
                              >
                                {
                                  pathValue
                                }
                              </code>
                            )
                          )}
                      </div>
                    ) : null}
                  </div>
                </article>
              )
            )}
          </div>
        </section>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(290px, 1fr))",
            gap: 16,
          }}
        >
          <section
            style={{
              ...cardStyle,
              padding:
                22,
            }}
          >
            <SectionHeading
              title="Affected project paths"
              description="Orion must remain inside this approved scope."
            />

            {plan.affectedPaths
              .length >
            0 ? (
              <div
                style={{
                  display:
                    "grid",
                  gap: 8,
                }}
              >
                {plan.affectedPaths.map(
                  (
                    pathValue
                  ) => (
                    <code
                      key={
                        pathValue
                      }
                      style={{
                        display:
                          "block",
                        padding:
                          "9px 10px",
                        borderRadius:
                          10,
                        background:
                          "rgba(0,0,0,0.23)",
                        color:
                          "#a8c7ff",
                        fontSize:
                          12,
                        overflowWrap:
                          "anywhere",
                      }}
                    >
                      {
                        pathValue
                      }
                    </code>
                  )
                )}
              </div>
            ) : (
              <p
                style={
                  mutedTextStyle
                }
              >
                No exact project
                paths were grounded
                yet.
              </p>
            )}
          </section>

          <section
            style={{
              ...cardStyle,
              padding:
                22,
            }}
          >
            <SectionHeading
              title="Risk review"
              description="Reasons RoyalOS assigned this risk level."
            />

            <div
              style={{
                display:
                  "grid",
                gap: 9,
              }}
            >
              {plan.risks.map(
                (
                  risk,
                  index
                ) => (
                  <div
                    key={`${risk}-${index}`}
                    style={{
                      padding:
                        "10px 12px",
                      borderRadius:
                        11,
                      border:
                        `1px solid ${getRiskColor(
                          plan.riskLevel
                        )}30`,
                      background:
                        `${getRiskColor(
                          plan.riskLevel
                        )}0d`,
                      color:
                        "rgba(255,255,255,0.76)",
                      fontSize:
                        13,
                      lineHeight:
                        1.55,
                    }}
                  >
                    {risk}
                  </div>
                )
              )}
            </div>
          </section>
        </div>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(290px, 1fr))",
            gap: 16,
          }}
        >
          <section
            style={{
              ...cardStyle,
              padding:
                22,
            }}
          >
            <SectionHeading
              title="Validation commands"
              description="These are planned commands only. Orion cannot run them during the read-only stage."
            />

            {plan.validationCommands
              .length >
            0 ? (
              <div
                style={{
                  display:
                    "grid",
                  gap: 8,
                }}
              >
                {plan.validationCommands.map(
                  (
                    command
                  ) => (
                    <code
                      key={
                        command
                      }
                      style={{
                        padding:
                          "11px 12px",
                        borderRadius:
                          10,
                        background:
                          "#080d16",
                        color:
                          "#79e6b5",
                        fontSize:
                          13,
                        overflowX:
                          "auto",
                      }}
                    >
                      {
                        command
                      }
                    </code>
                  )
                )}
              </div>
            ) : (
              <p
                style={
                  mutedTextStyle
                }
              >
                No validation
                command is needed
                for this read-only
                request.
              </p>
            )}
          </section>

          <section
            style={{
              ...cardStyle,
              padding:
                22,
            }}
          >
            <SectionHeading
              title="Rollback plan"
              description="How RoyalOS will recover after write access is enabled."
            />

            <ol
              style={{
                margin:
                  0,
                paddingLeft:
                  20,
                color:
                  "rgba(255,255,255,0.72)",
                lineHeight:
                  1.7,
                fontSize:
                  13,
              }}
            >
              {plan.rollbackPlan.map(
                (
                  item,
                  index
                ) => (
                  <li
                    key={`${item}-${index}`}
                  >
                    {item}
                  </li>
                )
              )}
            </ol>
          </section>
        </div>

        {topWarnings.length >
        0 ? (
          <section
            style={{
              ...cardStyle,
              padding:
                22,
              border:
                "1px solid rgba(246,202,98,0.22)",
            }}
          >
            <SectionHeading
              title="Workbench warnings"
            />

            <div
              style={{
                display:
                  "grid",
                gap: 8,
              }}
            >
              {topWarnings.map(
                (
                  warning,
                  index
                ) => (
                  <div
                    key={`${warning}-${index}`}
                    style={{
                      padding:
                        "10px 12px",
                      borderRadius:
                        10,
                      color:
                        "#f6d47d",
                      background:
                        "rgba(246,202,98,0.07)",
                      fontSize:
                        13,
                      lineHeight:
                        1.55,
                    }}
                  >
                    {warning}
                  </div>
                )
              )}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  function renderInspectionResult() {
    const inspection =
      inspectionResponse
        ?.inspection;

    if (!inspection) {
      return null;
    }

    return (
      <div
        style={{
          display:
            "grid",
          gap: 16,
        }}
      >
        <section
          style={{
            ...cardStyle,
            padding:
              22,
          }}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
              gap: 14,
              flexWrap:
                "wrap",
            }}
          >
            <div>
              <Badge
                color={getStatusColor(
                  inspection.status
                )}
              >
                {formatStatus(
                  inspection.status
                )}
              </Badge>

              <h2
                style={{
                  margin:
                    "13px 0 0",
                  color:
                    "#ffffff",
                  fontSize:
                    23,
                }}
              >
                Project inspection
                completed
              </h2>

              <p
                style={{
                  margin:
                    "10px 0 0",
                  color:
                    "rgba(255,255,255,0.7)",
                  lineHeight:
                    1.65,
                }}
              >
                {inspection.summary}
              </p>
            </div>

            <Badge
              color="#70ddb0"
            >
              Read-only
            </Badge>
          </div>
        </section>

        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 12,
          }}
        >
          <MetricCard
            label="Files found"
            value={
              inspection.files
                .length
            }
          />

          <MetricCard
            label="Contents loaded"
            value={
              inspection.contents
                .length
            }
          />

          <MetricCard
            label="Blocked paths"
            value={
              inspection.blockedPaths
                .length
            }
          />

          <MetricCard
            label="Duration"
            value={`${inspection.durationMs} ms`}
          />
        </section>

        <section
          style={{
            ...cardStyle,
            padding:
              22,
          }}
        >
          <SectionHeading
            title="Project information"
          />

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 12,
            }}
          >
            {[
              [
                "Project",
                inspection.project
                  .name,
              ],
              [
                "Framework",
                inspection.project
                  .framework ||
                  "Unknown",
              ],
              [
                "Package manager",
                inspection.project
                  .packageManager ||
                  "Unknown",
              ],
              [
                "Mode",
                inspection.project
                  .readOnly
                  ? "Read-only"
                  : "Write enabled",
              ],
            ].map(
              (
                [
                  label,
                  value,
                ]
              ) => (
                <div
                  key={
                    label
                  }
                  style={{
                    padding:
                      14,
                    borderRadius:
                      13,
                    background:
                      "rgba(255,255,255,0.035)",
                    border:
                      "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <small
                    style={{
                      color:
                        "rgba(255,255,255,0.54)",
                    }}
                  >
                    {label}
                  </small>

                  <strong
                    style={{
                      display:
                        "block",
                      marginTop:
                        5,
                      color:
                        "#ffffff",
                      overflowWrap:
                        "anywhere",
                    }}
                  >
                    {value}
                  </strong>
                </div>
              )
            )}
          </div>

          <div
            style={{
              marginTop:
                12,
              padding:
                12,
              borderRadius:
                12,
              background:
                "rgba(0,0,0,0.24)",
              color:
                "#a8c7ff",
              fontFamily:
                "monospace",
              fontSize:
                12,
              overflowWrap:
                "anywhere",
            }}
          >
            {
              inspection.project
                .rootPath
            }
          </div>
        </section>

        <section
          style={{
            ...cardStyle,
            padding:
              22,
          }}
        >
          <SectionHeading
            title="Approved project files"
            description={`Showing ${Math.min(
              inspection.files
                .length,
              40
            )} of ${
              inspection.files
                .length
            } files.`}
          />

          <div
            style={{
              display:
                "grid",
              gap: 8,
            }}
          >
            {inspection.files
              .slice(
                0,
                40
              )
              .map(
                (
                  file
                ) => (
                  <article
                    key={
                      file.relativePath
                    }
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "minmax(0, 1fr) auto",
                      gap: 12,
                      alignItems:
                        "center",
                      padding:
                        "11px 12px",
                      borderRadius:
                        11,
                      border:
                        "1px solid rgba(255,255,255,0.06)",
                      background:
                        "rgba(255,255,255,0.025)",
                    }}
                  >
                    <div
                      style={{
                        minWidth:
                          0,
                      }}
                    >
                      <code
                        style={{
                          color:
                            "#a8c7ff",
                          fontSize:
                            12,
                          overflowWrap:
                            "anywhere",
                        }}
                      >
                        {
                          file.relativePath
                        }
                      </code>

                      <div
                        style={{
                          marginTop:
                            5,
                          color:
                            "rgba(255,255,255,0.5)",
                          fontSize:
                            11,
                        }}
                      >
                        {
                          file.language
                        }{" "}
                        ·{" "}
                        {
                          file.category
                        }
                      </div>
                    </div>

                    <small
                      style={{
                        color:
                          "rgba(255,255,255,0.55)",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {formatBytes(
                        file.sizeBytes
                      )}
                    </small>
                  </article>
                )
              )}
          </div>
        </section>

        {inspection.blockedPaths
          .length >
        0 ? (
          <section
            style={{
              ...cardStyle,
              padding:
                22,
              border:
                "1px solid rgba(255,124,136,0.2)",
            }}
          >
            <SectionHeading
              title="Protected or unavailable paths"
              description="RoyalOS correctly refused these paths."
            />

            <div
              style={{
                display:
                  "grid",
                gap: 8,
              }}
            >
              {inspection.blockedPaths.map(
                (
                  blocked,
                  index
                ) => (
                  <div
                    key={`${blocked.path}-${index}`}
                    style={{
                      padding:
                        12,
                      borderRadius:
                        11,
                      background:
                        "rgba(255,124,136,0.055)",
                      color:
                        "rgba(255,255,255,0.72)",
                      fontSize:
                        12,
                      lineHeight:
                        1.55,
                    }}
                  >
                    <code
                      style={{
                        color:
                          "#ff9ba5",
                      }}
                    >
                      {
                        blocked.path
                      }
                    </code>

                    <div
                      style={{
                        marginTop:
                          4,
                      }}
                    >
                      {
                        blocked.reason
                      }
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  function renderSearchResult() {
    const search =
      searchResponse?.search;

    if (!search) {
      return null;
    }

    return (
      <div
        style={{
          display:
            "grid",
          gap: 16,
        }}
      >
        <section
          style={{
            ...cardStyle,
            padding:
              22,
          }}
        >
          <Badge
            color={getStatusColor(
              search.status
            )}
          >
            {formatStatus(
              search.status
            )}
          </Badge>

          <h2
            style={{
              margin:
                "13px 0 0",
              color:
                "#ffffff",
              fontSize:
                23,
            }}
          >
            Code-search results
          </h2>

          <p
            style={{
              margin:
                "10px 0 0",
              color:
                "rgba(255,255,255,0.68)",
            }}
          >
            Query:{" "}
            <code
              style={{
                color:
                  "#f6ca62",
              }}
            >
              {search.query}
            </code>
          </p>
        </section>

        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 12,
          }}
        >
          <MetricCard
            label="Matches"
            value={
              search.matches
                .length
            }
          />

          <MetricCard
            label="Files searched"
            value={
              search.searchedFiles
            }
          />

          <MetricCard
            label="Files skipped"
            value={
              search.skippedFiles
            }
          />

          <MetricCard
            label="Duration"
            value={`${search.durationMs} ms`}
          />
        </section>

        <section
          style={{
            ...cardStyle,
            padding:
              22,
          }}
        >
          <SectionHeading
            title="Matching code"
            description={
              search.truncated
                ? "The result limit was reached. Narrow the folders or query for a more precise result."
                : "Exact project locations found by Orion."
            }
          />

          {search.matches
            .length >
          0 ? (
            <div
              style={{
                display:
                  "grid",
                gap: 14,
              }}
            >
              {search.matches.map(
                (
                  match,
                  index
                ) => (
                  <article
                    key={`${match.relativePath}-${match.lineNumber}-${index}`}
                    style={{
                      borderRadius:
                        15,
                      overflow:
                        "hidden",
                      border:
                        "1px solid rgba(255,255,255,0.07)",
                      background:
                        "#080d16",
                    }}
                  >
                    <header
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap: 10,
                        flexWrap:
                          "wrap",
                        padding:
                          "11px 13px",
                        background:
                          "rgba(255,255,255,0.04)",
                        borderBottom:
                          "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <code
                        style={{
                          color:
                            "#a8c7ff",
                          fontSize:
                            12,
                          overflowWrap:
                            "anywhere",
                        }}
                      >
                        {
                          match.relativePath
                        }
                      </code>

                      <span
                        style={{
                          color:
                            "#f6ca62",
                          fontSize:
                            12,
                        }}
                      >
                        Line{" "}
                        {
                          match.lineNumber
                        }
                        , column{" "}
                        {
                          match.columnNumber
                        }
                      </span>
                    </header>

                    <pre
                      style={{
                        margin:
                          0,
                        padding:
                          14,
                        color:
                          "#dce7f7",
                        fontSize:
                          12,
                        lineHeight:
                          1.65,
                        overflowX:
                          "auto",
                        whiteSpace:
                          "pre-wrap",
                        overflowWrap:
                          "anywhere",
                      }}
                    >
                      {[
                        ...match.before,
                        match.line,
                        ...match.after,
                      ].join(
                        "\n"
                      )}
                    </pre>
                  </article>
                )
              )}
            </div>
          ) : (
            <div
              style={{
                padding:
                  26,
                textAlign:
                  "center",
                color:
                  "rgba(255,255,255,0.58)",
                borderRadius:
                  14,
                border:
                  "1px dashed rgba(255,255,255,0.1)",
              }}
            >
              Orion did not find
              this query in the
              approved project
              files.
            </div>
          )}
        </section>

        {search.warnings
          .length >
        0 ? (
          <section
            style={{
              ...cardStyle,
              padding:
                22,
            }}
          >
            <SectionHeading
              title="Search warnings"
            />

            {search.warnings.map(
              (
                warning,
                index
              ) => (
                <p
                  key={`${warning}-${index}`}
                  style={{
                    margin:
                      "7px 0",
                    color:
                      "#f6d47d",
                    fontSize:
                      13,
                    lineHeight:
                      1.55,
                  }}
                >
                  {warning}
                </p>
              )
            )}
          </section>
        ) : null}
      </div>
    );
  }

  const modeDescription =
    activeMode ===
    "plan"
      ? "Orion inspects the project, identifies relevant files, calculates risk, routes supporting employees, and prepares a controlled development plan."
      : activeMode ===
          "inspect"
        ? "Orion lists and reads only approved project files without making changes."
        : "Orion searches approved source files and returns exact file, line, and column locations.";

  const actionLabel =
    loading
      ? activeMode ===
        "plan"
        ? "Orion is planning…"
        : activeMode ===
            "inspect"
          ? "Orion is inspecting…"
          : "Orion is searching…"
      : activeMode ===
          "plan"
        ? "Create development plan"
        : activeMode ===
            "inspect"
          ? "Inspect project"
          : "Search code";

  return (
    <div
      style={{
        display:
          "grid",
        gap: 20,
      }}
    >
      <section
        style={{
          ...cardStyle,
          padding:
            24,
          overflow:
            "hidden",
          position:
            "relative",
        }}
      >
        <div
          style={{
            position:
              "absolute",
            width:
              280,
            height:
              280,
            right:
              -90,
            top:
              -140,
            borderRadius:
              "50%",
            background:
              "radial-gradient(circle, rgba(72,147,255,0.18), transparent 68%)",
            pointerEvents:
              "none",
          }}
        />

        <div
          style={{
            position:
              "relative",
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-start",
            gap: 18,
            flexWrap:
              "wrap",
          }}
        >
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: 15,
            }}
          >
            <div
              style={{
                width:
                  68,
                height:
                  68,
                borderRadius:
                  18,
                padding:
                  3,
                background:
                  "linear-gradient(145deg, #f6ca62, #458dff)",
                boxShadow:
                  "0 12px 32px rgba(0,0,0,0.3)",
                boxSizing:
                  "border-box",
              }}
            >
              <img
                src="/avatars/orion.jpg"
                alt="Orion"
                style={{
                  width:
                    "100%",
                  height:
                    "100%",
                  objectFit:
                    "cover",
                  borderRadius:
                    15,
                  display:
                    "block",
                  background:
                    "#111827",
                }}
              />
            </div>

            <div>
              <p
                style={{
                  margin:
                    0,
                  color:
                    "#f6ca62",
                  fontSize:
                    12,
                  fontWeight:
                    800,
                  letterSpacing:
                    "0.12em",
                }}
              >
                ROYALOS DEVELOPER
              </p>

              <h1
                style={{
                  margin:
                    "5px 0 0",
                  color:
                    "#ffffff",
                  fontSize:
                    28,
                  lineHeight:
                    1.15,
                }}
              >
                Orion Developer
                Workbench
              </h1>

              <p
                style={{
                  margin:
                    "8px 0 0",
                  color:
                    "rgba(255,255,255,0.64)",
                  lineHeight:
                    1.55,
                }}
              >
                Inspect, search,
                understand, and plan
                RoyalOS development
                work safely.
              </p>
            </div>
          </div>

          <div
            style={{
              display:
                "flex",
              gap: 8,
              flexWrap:
                "wrap",
              justifyContent:
                "flex-end",
            }}
          >
            <Badge
              color="#70ddb0"
            >
              ● Backend online
            </Badge>

            <Badge
              color="#f6ca62"
            >
              Read-only stage
            </Badge>

            <Badge
              color="#74b9ff"
            >
              Secrets protected
            </Badge>
          </div>
        </div>
      </section>

      <section
        style={{
          ...cardStyle,
          padding:
            22,
        }}
      >
        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: 8,
            marginBottom:
              18,
          }}
        >
          {(
            [
              [
                "plan",
                "Development Plan",
                "⌘",
              ],
              [
                "inspect",
                "Project Inspector",
                "◫",
              ],
              [
                "search",
                "Code Search",
                "⌕",
              ],
            ] as Array<
              [
                WorkbenchMode,
                string,
                string,
              ]
            >
          ).map(
            ([
              mode,
              label,
              icon,
            ]) => {
              const active =
                activeMode ===
                mode;

              return (
                <button
                  key={
                    mode
                  }
                  type="button"
                  onClick={() => {
                    setActiveMode(
                      mode
                    );

                    resetResults();
                  }}
                  style={{
                    borderRadius:
                      13,
                    border:
                      active
                        ? "1px solid rgba(246,202,98,0.45)"
                        : "1px solid rgba(255,255,255,0.07)",
                    padding:
                      "12px 10px",
                    background:
                      active
                        ? "rgba(246,202,98,0.12)"
                        : "rgba(255,255,255,0.025)",
                    color:
                      active
                        ? "#f6ca62"
                        : "rgba(255,255,255,0.66)",
                    fontWeight:
                      750,
                    cursor:
                      "pointer",
                  }}
                >
                  <span
                    style={{
                      marginRight:
                        7,
                    }}
                  >
                    {icon}
                  </span>

                  {label}
                </button>
              );
            }
          )}
        </div>

        <div
          style={{
            marginBottom:
              18,
            padding:
              "12px 14px",
            borderRadius:
              13,
            background:
              "rgba(72,147,255,0.07)",
            border:
              "1px solid rgba(72,147,255,0.14)",
            color:
              "rgba(255,255,255,0.68)",
            fontSize:
              13,
            lineHeight:
              1.6,
          }}
        >
          {modeDescription}
        </div>

        <div
          style={{
            display:
              "flex",
            gap: 8,
            flexWrap:
              "wrap",
            marginBottom:
              18,
          }}
        >
          {QUICK_REQUESTS.map(
            (
              request
            ) => (
              <button
                type="button"
                key={
                  request.label
                }
                onClick={() =>
                  applyQuickRequest(
                    request
                  )
                }
                style={{
                  padding:
                    "8px 11px",
                  borderRadius:
                    999,
                  border:
                    "1px solid rgba(255,255,255,0.09)",
                  background:
                    "rgba(255,255,255,0.035)",
                  color:
                    "rgba(255,255,255,0.72)",
                  fontSize:
                    12,
                  cursor:
                    "pointer",
                }}
              >
                {request.label}
              </button>
            )
          )}
        </div>

        <div
          style={{
            display:
              "grid",
            gap: 15,
          }}
        >
          <label
            style={
              labelStyle
            }
          >
            <span>
              {activeMode ===
              "search"
                ? "Code search query"
                : "Instruction for Orion"}
            </span>

            <textarea
              value={
                instruction
              }
              onChange={(
                event
              ) =>
                setInstruction(
                  event.target
                    .value
                )
              }
              rows={
                activeMode ===
                "search"
                  ? 3
                  : 7
              }
              placeholder={
                activeMode ===
                "search"
                  ? "Example: sendIfeoluwaMessage"
                  : "Describe what Orion should inspect, explain, debug, or plan..."
              }
              style={{
                ...inputStyle,
                padding:
                  "14px 15px",
                resize:
                  "vertical",
                lineHeight:
                  1.6,
              }}
            />
          </label>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 13,
            }}
          >
            <label
              style={
                labelStyle
              }
            >
              <span>
                Workspace
              </span>

              <select
                value={
                  workspace
                }
                onChange={(
                  event
                ) =>
                  setWorkspace(
                    event.target
                      .value as
                      WorkspaceName
                  )
                }
                style={{
                  ...inputStyle,
                  padding:
                    "12px 13px",
                }}
              >
                {WORKSPACES.map(
                  (
                    item
                  ) => (
                    <option
                      key={
                        item
                      }
                      value={
                        item
                      }
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </label>

            <label
              style={
                labelStyle
              }
            >
              <span>
                Maximum files
              </span>

              <input
                type="number"
                min={
                  1
                }
                max={
                  50
                }
                value={
                  maximumFiles
                }
                onChange={(
                  event
                ) =>
                  setMaximumFiles(
                    Math.min(
                      50,
                      Math.max(
                        1,
                        Number(
                          event
                            .target
                            .value
                        ) ||
                          1
                      )
                    )
                  )
                }
                style={{
                  ...inputStyle,
                  padding:
                    "12px 13px",
                }}
              />
            </label>
          </div>

          <label
            style={
              labelStyle
            }
          >
            <span>
              Approved paths
              <small
                style={{
                  marginLeft:
                    7,
                  color:
                    "rgba(255,255,255,0.42)",
                  fontWeight:
                    500,
                }}
              >
                One per line,
                optional
              </small>
            </span>

            <textarea
              value={
                pathsText
              }
              onChange={(
                event
              ) =>
                setPathsText(
                  event.target
                    .value
                )
              }
              rows={
                4
              }
              placeholder={
                "app/page.tsx\napp/api/ifeoluwa/chat/route.ts\nlib/orchestrator"
              }
              style={{
                ...inputStyle,
                padding:
                  "13px 14px",
                resize:
                  "vertical",
                fontFamily:
                  "monospace",
                fontSize:
                  13,
              }}
            />
          </label>

          {activeMode ===
          "plan" ? (
            <label
              style={
                labelStyle
              }
            >
              <span>
                Supporting code
                searches
                <small
                  style={{
                    marginLeft:
                      7,
                    color:
                      "rgba(255,255,255,0.42)",
                    fontWeight:
                      500,
                  }}
                >
                  One query per
                  line
                </small>
              </span>

              <textarea
                value={
                  searchQueriesText
                }
                onChange={(
                  event
                ) =>
                  setSearchQueriesText(
                    event.target
                      .value
                  )
                }
                rows={
                  4
                }
                placeholder={
                  "sendIfeoluwaMessage\nrenderChatPanel\n/api/ifeoluwa/chat"
                }
                style={{
                  ...inputStyle,
                  padding:
                    "13px 14px",
                  resize:
                    "vertical",
                  fontFamily:
                    "monospace",
                  fontSize:
                    13,
                }}
              />
            </label>
          ) : null}

          {activeMode ===
          "search" ? (
            <>
              <label
                style={
                  labelStyle
                }
              >
                <span>
                  File extensions
                </span>

                <input
                  value={
                    extensionText
                  }
                  onChange={(
                    event
                  ) =>
                    setExtensionText(
                      event.target
                        .value
                    )
                  }
                  placeholder=".ts, .tsx, .js"
                  style={{
                    ...inputStyle,
                    padding:
                      "12px 13px",
                    fontFamily:
                      "monospace",
                  }}
                />
              </label>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 12,
                }}
              >
                <label
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 9,
                    padding:
                      "12px 13px",
                    borderRadius:
                      12,
                    border:
                      "1px solid rgba(255,255,255,0.07)",
                    background:
                      "rgba(255,255,255,0.025)",
                    color:
                      "rgba(255,255,255,0.72)",
                    fontSize:
                      13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      caseSensitive
                    }
                    onChange={(
                      event
                    ) =>
                      setCaseSensitive(
                        event.target
                          .checked
                      )
                    }
                  />

                  Case-sensitive
                </label>

                <label
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 9,
                    padding:
                      "12px 13px",
                    borderRadius:
                      12,
                    border:
                      "1px solid rgba(255,255,255,0.07)",
                    background:
                      "rgba(255,255,255,0.025)",
                    color:
                      "rgba(255,255,255,0.72)",
                    fontSize:
                      13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      useRegularExpression
                    }
                    onChange={(
                      event
                    ) =>
                      setUseRegularExpression(
                        event.target
                          .checked
                      )
                    }
                  />

                  Regular
                  expression
                </label>

                <label
                  style={{
                    ...labelStyle,
                    padding:
                      "8px 12px",
                    borderRadius:
                      12,
                    border:
                      "1px solid rgba(255,255,255,0.07)",
                    background:
                      "rgba(255,255,255,0.025)",
                  }}
                >
                  <span>
                    Context lines
                  </span>

                  <input
                    type="number"
                    min={
                      0
                    }
                    max={
                      10
                    }
                    value={
                      contextLines
                    }
                    onChange={(
                      event
                    ) =>
                      setContextLines(
                        Math.min(
                          10,
                          Math.max(
                            0,
                            Number(
                              event
                                .target
                                .value
                            ) ||
                              0
                          )
                        )
                      )
                    }
                    style={{
                      ...inputStyle,
                      padding:
                        "8px 10px",
                    }}
                  />
                </label>
              </div>
            </>
          ) : (
            <label
              style={{
                display:
                  "flex",
                alignItems:
                  "center",
                gap: 9,
                padding:
                  "12px 13px",
                borderRadius:
                  12,
                border:
                  "1px solid rgba(255,255,255,0.07)",
                background:
                  "rgba(255,255,255,0.025)",
                color:
                  "rgba(255,255,255,0.72)",
                fontSize:
                  13,
              }}
            >
              <input
                type="checkbox"
                checked={
                  includeContents
                }
                onChange={(
                  event
                ) =>
                  setIncludeContents(
                    event.target
                      .checked
                  )
                }
              />

              Load approved file
              contents for deeper
              inspection
            </label>
          )}

          <div
            style={{
              display:
                "flex",
              gap: 10,
              flexWrap:
                "wrap",
              alignItems:
                "center",
            }}
          >
            <button
              type="button"
              onClick={() =>
                void runSelectedAction()
              }
              disabled={
                loading
              }
              style={{
                padding:
                  "13px 19px",
                borderRadius:
                  13,
                border:
                  "none",
                background:
                  loading
                    ? "rgba(246,202,98,0.5)"
                    : "linear-gradient(135deg, #f6ca62, #e5a93f)",
                color:
                  "#15110a",
                fontWeight:
                  850,
                cursor:
                  loading
                    ? "wait"
                    : "pointer",
                boxShadow:
                  "0 10px 24px rgba(229,169,63,0.17)",
              }}
            >
              {actionLabel}
            </button>

            <button
              type="button"
              onClick={() => {
                setInstruction(
                  ""
                );

                setPathsText(
                  ""
                );

                setSearchQueriesText(
                  ""
                );

                resetResults();
              }}
              disabled={
                loading
              }
              style={{
                padding:
                  "13px 16px",
                borderRadius:
                  13,
                border:
                  "1px solid rgba(255,255,255,0.09)",
                background:
                  "rgba(255,255,255,0.03)",
                color:
                  "rgba(255,255,255,0.72)",
                cursor:
                  "pointer",
              }}
            >
              Clear
            </button>

            <span
              style={{
                marginLeft:
                  "auto",
                color:
                  "rgba(255,255,255,0.43)",
                fontSize:
                  12,
              }}
            >
              No files can be
              edited during this
              stage.
            </span>
          </div>

          {error ? (
            <div
              style={{
                padding:
                  "12px 14px",
                borderRadius:
                  12,
                background:
                  "rgba(255,107,122,0.08)",
                border:
                  "1px solid rgba(255,107,122,0.2)",
                color:
                  "#ff9aa4",
                fontSize:
                  13,
                lineHeight:
                  1.55,
              }}
            >
              {error}
            </div>
          ) : null}

          {notice ? (
            <div
              style={{
                padding:
                  "12px 14px",
                borderRadius:
                  12,
                background:
                  "rgba(112,221,176,0.07)",
                border:
                  "1px solid rgba(112,221,176,0.17)",
                color:
                  "#8fe5bf",
                fontSize:
                  13,
                lineHeight:
                  1.55,
              }}
            >
              {notice}
            </div>
          ) : null}
        </div>
      </section>

      {loading ? (
        <section
          style={{
            ...cardStyle,
            padding:
              32,
            display:
              "grid",
            placeItems:
              "center",
            minHeight:
              180,
          }}
        >
          <div
            style={{
              textAlign:
                "center",
            }}
          >
            <div
              style={{
                width:
                  42,
                height:
                  42,
                margin:
                  "0 auto",
                borderRadius:
                  "50%",
                border:
                  "3px solid rgba(255,255,255,0.09)",
                borderTopColor:
                  "#f6ca62",
                animation:
                  "royalosOrionSpin 0.9s linear infinite",
              }}
            />

            <strong
              style={{
                display:
                  "block",
                marginTop:
                  15,
                color:
                  "#ffffff",
              }}
            >
              Orion is working
            </strong>

            <p
              style={{
                margin:
                  "7px 0 0",
                color:
                  "rgba(255,255,255,0.56)",
                fontSize:
                  13,
              }}
            >
              Reading only approved
              project information.
            </p>
          </div>

          <style>
            {`
              @keyframes royalosOrionSpin {
                to {
                  transform: rotate(360deg);
                }
              }
            `}
          </style>
        </section>
      ) : null}

      {!loading
        ? renderPlanResult()
        : null}

      {!loading
        ? renderInspectionResult()
        : null}

      {!loading
        ? renderSearchResult()
        : null}

      {!loading &&
      !planResponse &&
      !inspectionResponse &&
      !searchResponse ? (
        <section
          style={{
            ...cardStyle,
            padding:
              28,
            textAlign:
              "center",
          }}
        >
          <div
            style={{
              width:
                58,
              height:
                58,
              margin:
                "0 auto",
              display:
                "grid",
              placeItems:
                "center",
              borderRadius:
                18,
              background:
                "rgba(72,147,255,0.08)",
              border:
                "1px solid rgba(72,147,255,0.15)",
              color:
                "#74b9ff",
              fontSize:
                25,
            }}
          >
            {"</>"}
          </div>

          <h3
            style={{
              margin:
                "15px 0 0",
              color:
                "#ffffff",
            }}
          >
            Orion is ready
          </h3>

          <p
            style={{
              margin:
                "8px auto 0",
              maxWidth:
                580,
              color:
                "rgba(255,255,255,0.56)",
              lineHeight:
                1.65,
              fontSize:
                13,
            }}
          >
            Give Orion a project
            question, code-search
            query, bug report, or
            feature request. He will
            inspect and plan without
            changing your files.
          </p>
        </section>
      ) : null}
    </div>
  );
}