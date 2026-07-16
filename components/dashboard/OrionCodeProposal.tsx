"use client";

import {
  useMemo,
  useState,
  type CSSProperties,
} from "react";

type WorkspaceName =
  | "Triple-Hay Concept LLC"
  | "ChoiceRoyals"
  | "Xena Grace"
  | "TD Talk";

type DeveloperRiskLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

type DeveloperChangeType =
  | "create"
  | "replace"
  | "modify"
  | "rename"
  | "delete";

type DeveloperPlan = {
  planId: string;
  requestId: string;
  title: string;
  objective: string;
  summary: string;
  primaryEmployee: string;
  supportingEmployees: string[];
  workspace: WorkspaceName;
  status: string;
  riskLevel: DeveloperRiskLevel;
  requiresCEOApproval: boolean;
  affectedPaths: string[];
  validationCommands: string[];
  rollbackPlan: string[];
  createdAt: string;
};

type DeveloperProposedChange = {
  changeId: string;
  planId: string;
  relativePath: string;
  changeType: DeveloperChangeType;
  riskLevel: DeveloperRiskLevel;
  requiresCEOApproval: boolean;
  summary: string;
  reason: string;
  originalContent?: string;
  proposedContent?: string;
  originalSha256?: string;
  backupRequired: boolean;
  validationCommands: string[];
  rollbackInstructions: string[];
};

type DeveloperAnalyzedFile = {
  file: {
    relativePath: string;
    fileName: string;
    language: string;
    category: string;
    sizeBytes: number;
  };
  truncated: boolean;
  totalCharacters: number;
  returnedCharacters: number;
  sha256?: string;
};

type DeveloperProposal = {
  requestId: string;
  proposalId: string;
  plan: DeveloperPlan;
  changes: DeveloperProposedChange[];
  analyzedFiles: DeveloperAnalyzedFile[];
  blockedPaths: Array<{
    path: string;
    reason: string;
  }>;
  warnings: string[];
  model: string;
  createdAt: string;
  durationMs: number;
};

type DeveloperProposalResponse = {
  message?: string;
  stage?: string;
  proposal?: DeveloperProposal;
  approval?: {
    required?: boolean;
    status?: string;
    approved?: boolean;
    applied?: boolean;
    approvalId?: string;
    approvalToken?: string;
    expiresAt?: string;
  };
  error?: string;
  details?: string;
};

type CodeView = "proposed" | "original";

type DeveloperValidationResult = {
  command: string;
  status: "passed" | "failed" | "timed_out" | "blocked";
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
};

type DeveloperTransaction = {
  transactionId: string;
  proposalId: string;
  status: "applying" | "succeeded" | "failed" | "rolled_back" | "validation_failed";
  affectedPaths: string[];
  appliedChanges: string[];
  failedChanges: string[];
  validations: DeveloperValidationResult[];
  rollbackPerformed: boolean;
  error?: string;
  durationMs?: number;
};

type DeveloperApplyResponse = {
  message?: string;
  transaction?: DeveloperTransaction;
  error?: string;
};

const WORKSPACES: WorkspaceName[] = [
  "Triple-Hay Concept LLC",
  "ChoiceRoyals",
  "Xena Grace",
  "TD Talk",
];

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

function splitLines(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/\r\n|\r|\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Orion could not generate the proposal.";
}

async function parseJsonResponse<T>(
  response: Response
): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      "RoyalOS received an invalid response from the proposal API."
    );
  }
}

function riskColor(
  risk: DeveloperRiskLevel
): string {
  if (risk === "critical") return "#ff6b7a";
  if (risk === "high") return "#ff9b61";
  if (risk === "medium") return "#f6ca62";
  return "#70ddb0";
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function fileNameFromPath(
  relativePath: string
): string {
  const parts = relativePath
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);

  return parts[parts.length - 1] || "royalos-proposal.txt";
}

async function copyText(
  value: string
): Promise<void> {
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard
  ) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const area =
    document.createElement("textarea");

  area.value = value;
  area.style.position = "fixed";
  area.style.opacity = "0";

  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

function downloadTextFile(
  fileName: string,
  content: string
): void {
  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(
    () => URL.revokeObjectURL(url),
    1_000
  );
}

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "7px 10px",
        borderRadius: 999,
        border: `1px solid ${color}55`,
        background: `${color}16`,
        color,
        fontSize: 12,
        fontWeight: 750,
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <article
      style={{
        ...cardStyle,
        padding: 18,
      }}
    >
      <div
        style={{
          color: "rgba(255,255,255,0.55)",
          fontSize: 11,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>

      <strong
        style={{
          display: "block",
          marginTop: 8,
          color: "#ffffff",
          fontSize: 22,
        }}
      >
        {value}
      </strong>

      {detail ? (
        <small
          style={{
            display: "block",
            marginTop: 5,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {detail}
        </small>
      ) : null}
    </article>
  );
}

export default function OrionCodeProposal() {
  const [instruction, setInstruction] = useState("");
  const [workspace, setWorkspace] =
    useState<WorkspaceName>(
      "Triple-Hay Concept LLC"
    );
  const [pathsText, setPathsText] = useState("");
  const [
    searchQueriesText,
    setSearchQueriesText,
  ] = useState("");
  const [maximumFiles, setMaximumFiles] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [response, setResponse] =
    useState<DeveloperProposalResponse | null>(null);
  const [
    selectedChangeId,
    setSelectedChangeId,
  ] = useState("");
  const [codeView, setCodeView] =
    useState<CodeView>("proposed");
  const [copied, setCopied] = useState(false);
  const [approvalText, setApprovalText] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyResponse, setApplyResponse] =
    useState<DeveloperApplyResponse | null>(null);
  const [rollbackText, setRollbackText] = useState("");
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [autoRollback, setAutoRollback] = useState(true);
  const [validationCommands, setValidationCommands] = useState([
    "npx tsc --noEmit",
    "npm run lint",
    "npm run build",
  ]);

  const paths = useMemo(
    () => splitLines(pathsText),
    [pathsText]
  );

  const searchQueries = useMemo(
    () => splitLines(searchQueriesText),
    [searchQueriesText]
  );

  const proposal = response?.proposal;

  const selectedChange = useMemo(() => {
    if (!proposal?.changes.length) {
      return undefined;
    }

    return (
      proposal.changes.find(
        (change) =>
          change.changeId === selectedChangeId
      ) || proposal.changes[0]
    );
  }, [proposal, selectedChangeId]);

  function clearResults() {
    setResponse(null);
    setSelectedChangeId("");
    setCodeView("proposed");
    setCopied(false);
    setApprovalText("");
    setApprovalNote("");
    setApplyResponse(null);
    setRollbackText("");
    setError("");
    setNotice("");
  }

  function applyQuickRequest(value: string) {
    setInstruction(value);
    clearResults();
  }

  async function generateProposal() {
    const cleanedInstruction = instruction.trim();

    if (!cleanedInstruction) {
      setError(
        "Describe the feature, correction, or code change Orion should propose."
      );
      return;
    }

    if (paths.length === 0) {
      setError(
        "Add at least one approved project file or folder so Orion knows the exact scope."
      );
      return;
    }

    setLoading(true);
    clearResults();

    try {
      const apiResponse = await fetch(
        "/api/developer/propose",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            instruction: cleanedInstruction,
            employee: "Orion",
            workspace,
            paths,
            searchQueries:
              searchQueries.length > 0
                ? searchQueries
                : undefined,
            maximumFiles,
            metadata: {
              source:
                "Orion Code Proposal Dashboard",
              requestedBy: "Ayobami",
            },
          }),
        }
      );

      const data =
        await parseJsonResponse<DeveloperProposalResponse>(
          apiResponse
        );

      if (!apiResponse.ok) {
        throw new Error(
          data.error ||
            data.details ||
            "Orion could not generate the proposal."
        );
      }

      setResponse(data);

      const firstChange =
        data.proposal?.changes?.[0];

      if (firstChange) {
        setSelectedChangeId(
          firstChange.changeId
        );
      }

      setNotice(
        data.message ||
          "Orion prepared the code proposal. No files were changed."
      );
    } catch (requestError) {
      setError(
        getErrorMessage(requestError)
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    const content =
      codeView === "proposed"
        ? selectedChange?.proposedContent
        : selectedChange?.originalContent;

    if (!content) return;

    try {
      await copyText(content);
      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        2_000
      );
    } catch {
      setError(
        "RoyalOS could not copy the code to the clipboard."
      );
    }
  }

  function handleDownload() {
    const content =
      codeView === "proposed"
        ? selectedChange?.proposedContent
        : selectedChange?.originalContent;

    if (!selectedChange || !content) return;

    const originalName =
      fileNameFromPath(
        selectedChange.relativePath
      );

    const downloadName =
      codeView === "proposed"
        ? originalName
        : `original-${originalName}`;

    downloadTextFile(
      downloadName,
      content
    );
  }

  async function applyApprovedProposal() {
    if (!proposal || !response?.approval?.approvalToken) {
      setError("Generate a fresh Orion proposal before applying changes.");
      return;
    }

    if (approvalText.trim().toUpperCase() !== "APPROVE") {
      setError('Type "APPROVE" exactly to authorize the code changes.');
      return;
    }

    setApplyLoading(true);
    setError("");
    setNotice("");

    try {
      const apiResponse = await fetch("/api/developer/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal.proposalId,
          approvalToken: response.approval.approvalToken,
          approvalText,
          approvedBy: "Ayobami",
          approvalNote,
          validationCommands,
          autoRollbackOnValidationFailure: autoRollback,
        }),
      });
      const data = await parseJsonResponse<DeveloperApplyResponse>(apiResponse);
      if (!apiResponse.ok && !data.transaction) {
        throw new Error(data.error || "Orion could not apply the proposal.");
      }
      setApplyResponse(data);
      setNotice(data.message || "Orion completed the approved execution workflow.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setApplyLoading(false);
    }
  }

  async function rollbackTransaction() {
    const transactionId = applyResponse?.transaction?.transactionId;
    if (!transactionId) return;
    if (rollbackText.trim().toUpperCase() !== "ROLLBACK") {
      setError('Type "ROLLBACK" exactly to restore the backup.');
      return;
    }

    setRollbackLoading(true);
    setError("");
    try {
      const apiResponse = await fetch("/api/developer/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, approvalText: rollbackText, approvedBy: "Ayobami" }),
      });
      const data = await parseJsonResponse<DeveloperApplyResponse>(apiResponse);
      if (!apiResponse.ok) throw new Error(data.error || "Orion could not restore the backup.");
      setApplyResponse(data);
      setNotice(data.message || "Orion restored the project backup.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setRollbackLoading(false);
    }
  }

  function toggleValidationCommand(command: string) {
    setValidationCommands((current) =>
      current.includes(command)
        ? current.filter((item) => item !== command)
        : [...current, command],
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 20,
      }}
    >
      <section
        style={{
          ...cardStyle,
          padding: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 300,
            height: 300,
            right: -100,
            top: -170,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(246,202,98,0.18), transparent 68%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                color: "#f6ca62",
                fontSize: 12,
                fontWeight: 850,
                letterSpacing: "0.12em",
              }}
            >
              STAGE 2
            </div>

            <h2
              style={{
                margin: "7px 0 0",
                color: "#ffffff",
                fontSize: 26,
              }}
            >
              Orion Code Proposal
            </h2>

            <p
              style={{
                margin: "9px 0 0",
                color: "rgba(255,255,255,0.64)",
                lineHeight: 1.6,
                maxWidth: 760,
              }}
            >
              Orion reads only the files you approve, prepares complete
              replacement code, and can apply approved changes locally with
              backups, validation, audit history, and one-click rollback.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Badge color="#70ddb0">
              API online
            </Badge>
            <Badge color="#f6ca62">
              CEO approval required
            </Badge>
            <Badge color="#74b9ff">
              Protected local writes
            </Badge>
          </div>
        </div>
      </section>

      <section
        style={{
          ...cardStyle,
          padding: 22,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          {[
            "Fix a bug in the selected file while preserving all working behavior. Return complete final file content.",
            "Add the requested feature to the selected file with the smallest safe change. Return complete final file content.",
            "Improve the selected interface for clarity, responsiveness, and accessibility without removing existing functionality.",
            "Refactor the selected code for maintainability without changing its public behavior.",
          ].map((value, index) => (
            <button
              type="button"
              key={value}
              onClick={() =>
                applyQuickRequest(value)
              }
              style={{
                padding: "8px 11px",
                borderRadius: 999,
                border:
                  "1px solid rgba(255,255,255,0.09)",
                background:
                  "rgba(255,255,255,0.035)",
                color:
                  "rgba(255,255,255,0.72)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {index === 0
                ? "Fix bug"
                : index === 1
                  ? "Add feature"
                  : index === 2
                    ? "Improve UI"
                    : "Refactor safely"}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gap: 15,
          }}
        >
          <label
            style={{
              display: "grid",
              gap: 8,
              color: "rgba(255,255,255,0.82)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span>
              Code request for Orion
            </span>

            <textarea
              value={instruction}
              onChange={(event) =>
                setInstruction(
                  event.target.value
                )
              }
              rows={7}
              placeholder="Example: Add a Delete Asset button to the Asset Gallery, but require confirmation before deletion. Preserve all upload, search, open, and download behavior."
              style={{
                ...inputStyle,
                padding: "14px 15px",
                resize: "vertical",
                lineHeight: 1.6,
              }}
            />
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 13,
            }}
          >
            <label
              style={{
                display: "grid",
                gap: 8,
                color: "rgba(255,255,255,0.82)",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <span>Workspace</span>

              <select
                value={workspace}
                onChange={(event) =>
                  setWorkspace(
                    event.target.value as WorkspaceName
                  )
                }
                style={{
                  ...inputStyle,
                  padding: "12px 13px",
                }}
              >
                {WORKSPACES.map((item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label
              style={{
                display: "grid",
                gap: 8,
                color: "rgba(255,255,255,0.82)",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <span>
                Maximum proposal files
              </span>

              <input
                type="number"
                min={1}
                max={8}
                value={maximumFiles}
                onChange={(event) =>
                  setMaximumFiles(
                    Math.min(
                      8,
                      Math.max(
                        1,
                        Number(
                          event.target.value
                        ) || 1
                      )
                    )
                  )
                }
                style={{
                  ...inputStyle,
                  padding: "12px 13px",
                }}
              />
            </label>
          </div>

          <label
            style={{
              display: "grid",
              gap: 8,
              color: "rgba(255,255,255,0.82)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span>
              Approved project paths
              <small
                style={{
                  marginLeft: 7,
                  color: "rgba(255,255,255,0.42)",
                  fontWeight: 500,
                }}
              >
                One per line, required
              </small>
            </span>

            <textarea
              value={pathsText}
              onChange={(event) =>
                setPathsText(
                  event.target.value
                )
              }
              rows={5}
              placeholder={
                "components/dashboard/RoyalOSAssetGallery.tsx\napp/api/tools/assets/upload/route.ts"
              }
              style={{
                ...inputStyle,
                padding: "13px 14px",
                resize: "vertical",
                fontFamily: "monospace",
                fontSize: 13,
              }}
            />
          </label>

          <label
            style={{
              display: "grid",
              gap: 8,
              color: "rgba(255,255,255,0.82)",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            <span>
              Supporting code searches
              <small
                style={{
                  marginLeft: 7,
                  color: "rgba(255,255,255,0.42)",
                  fontWeight: 500,
                }}
              >
                Optional, one per line
              </small>
            </span>

            <textarea
              value={searchQueriesText}
              onChange={(event) =>
                setSearchQueriesText(
                  event.target.value
                )
              }
              rows={4}
              placeholder={
                "handleUpload\nAsset Gallery\n/api/tools/assets"
              }
              style={{
                ...inputStyle,
                padding: "13px 14px",
                resize: "vertical",
                fontFamily: "monospace",
                fontSize: 13,
              }}
            />
          </label>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() =>
                void generateProposal()
              }
              disabled={loading}
              style={{
                padding: "13px 19px",
                borderRadius: 13,
                border: "none",
                background:
                  loading
                    ? "rgba(246,202,98,0.5)"
                    : "linear-gradient(135deg, #f6ca62, #e5a93f)",
                color: "#15110a",
                fontWeight: 850,
                cursor:
                  loading
                    ? "wait"
                    : "pointer",
              }}
            >
              {loading
                ? "Orion is generating code…"
                : "Generate code proposal"}
            </button>

            <button
              type="button"
              onClick={() => {
                setInstruction("");
                setPathsText("");
                setSearchQueriesText("");
                clearResults();
              }}
              disabled={loading}
              style={{
                padding: "13px 16px",
                borderRadius: 13,
                border:
                  "1px solid rgba(255,255,255,0.09)",
                background:
                  "rgba(255,255,255,0.03)",
                color:
                  "rgba(255,255,255,0.72)",
                cursor: "pointer",
              }}
            >
              Clear
            </button>

            <span
              style={{
                marginLeft: "auto",
                color: "rgba(255,255,255,0.43)",
                fontSize: 12,
              }}
            >
              Proposal only. No project file will be changed.
            </span>
          </div>

          {error ? (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background:
                  "rgba(255,107,122,0.08)",
                border:
                  "1px solid rgba(255,107,122,0.2)",
                color: "#ff9aa4",
                fontSize: 13,
                lineHeight: 1.55,
              }}
            >
              {error}
            </div>
          ) : null}

          {notice ? (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background:
                  "rgba(112,221,176,0.07)",
                border:
                  "1px solid rgba(112,221,176,0.17)",
                color: "#8fe5bf",
                fontSize: 13,
                lineHeight: 1.55,
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
            minHeight: 190,
            display: "grid",
            placeItems: "center",
            padding: 30,
            textAlign: "center",
          }}
        >
          <div>
            <div
              style={{
                width: 44,
                height: 44,
                margin: "0 auto",
                borderRadius: "50%",
                border:
                  "3px solid rgba(255,255,255,0.09)",
                borderTopColor: "#f6ca62",
                animation:
                  "royalosProposalSpin 0.9s linear infinite",
              }}
            />

            <strong
              style={{
                display: "block",
                marginTop: 15,
                color: "#ffffff",
              }}
            >
              Orion is preparing the complete code
            </strong>

            <p
              style={{
                margin: "7px 0 0",
                color: "rgba(255,255,255,0.54)",
                fontSize: 13,
              }}
            >
              Reading only approved files. Nothing is being applied.
            </p>

            <style>
              {`
                @keyframes royalosProposalSpin {
                  to {
                    transform: rotate(360deg);
                  }
                }
              `}
            </style>
          </div>
        </section>
      ) : null}

      {!loading && proposal ? (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 12,
            }}
          >
            <Metric
              label="Proposed files"
              value={proposal.changes.length}
              detail="Awaiting review"
            />
            <Metric
              label="Analyzed files"
              value={proposal.analyzedFiles.length}
              detail="Read-only"
            />
            <Metric
              label="Risk"
              value={formatLabel(
                proposal.plan.riskLevel
              )}
              detail="Plan classification"
            />
            <Metric
              label="Duration"
              value={`${proposal.durationMs} ms`}
              detail={proposal.model}
            />
          </section>

          <section
            style={{
              ...cardStyle,
              padding: 22,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div style={{ maxWidth: 850 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 12,
                  }}
                >
                  <Badge
                    color={riskColor(
                      proposal.plan.riskLevel
                    )}
                  >
                    {formatLabel(
                      proposal.plan.riskLevel
                    )}{" "}
                    risk
                  </Badge>

                  <Badge color="#f6ca62">
                    Awaiting CEO review
                  </Badge>

                  <Badge color="#70ddb0">
                    0 files changed
                  </Badge>
                </div>

                <h2
                  style={{
                    margin: 0,
                    color: "#ffffff",
                    fontSize: 24,
                  }}
                >
                  {proposal.plan.title}
                </h2>

                <p
                  style={{
                    margin: "11px 0 0",
                    color: "rgba(255,255,255,0.7)",
                    lineHeight: 1.65,
                  }}
                >
                  {proposal.plan.summary}
                </p>
              </div>

              <div
                style={{
                  padding: 13,
                  borderRadius: 13,
                  background:
                    "rgba(255,255,255,0.035)",
                  border:
                    "1px solid rgba(255,255,255,0.07)",
                  minWidth: 180,
                }}
              >
                <small
                  style={{
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  Proposal ID
                </small>

                <code
                  style={{
                    display: "block",
                    marginTop: 5,
                    color: "#a8c7ff",
                    fontSize: 11,
                    overflowWrap: "anywhere",
                  }}
                >
                  {proposal.proposalId}
                </code>
              </div>
            </div>
          </section>

          <section
            style={{
              ...cardStyle,
              padding: 22,
            }}
          >
            <h3
              style={{
                margin: "0 0 14px",
                color: "#ffffff",
                fontSize: 18,
              }}
            >
              Proposed file changes
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(220px, 0.34fr) minmax(0, 1fr)",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 9,
                  alignContent: "start",
                }}
              >
                {proposal.changes.map(
                  (change) => {
                    const active =
                      selectedChange?.changeId ===
                      change.changeId;

                    return (
                      <button
                        type="button"
                        key={change.changeId}
                        onClick={() => {
                          setSelectedChangeId(
                            change.changeId
                          );
                          setCodeView("proposed");
                          setCopied(false);
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: 13,
                          borderRadius: 13,
                          border:
                            active
                              ? "1px solid rgba(246,202,98,0.42)"
                              : "1px solid rgba(255,255,255,0.07)",
                          background:
                            active
                              ? "rgba(246,202,98,0.1)"
                              : "rgba(255,255,255,0.025)",
                          color: "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        <code
                          style={{
                            display: "block",
                            color:
                              active
                                ? "#f6ca62"
                                : "#a8c7ff",
                            fontSize: 12,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {change.relativePath}
                        </code>

                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            marginTop: 8,
                          }}
                        >
                          <Badge color="#74b9ff">
                            {change.changeType}
                          </Badge>
                          <Badge
                            color={riskColor(
                              change.riskLevel
                            )}
                          >
                            {change.riskLevel}
                          </Badge>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              {selectedChange ? (
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          color: "#ffffff",
                          fontSize: 18,
                        }}
                      >
                        {selectedChange.summary}
                      </h3>

                      <p
                        style={{
                          margin: "7px 0 0",
                          color: "rgba(255,255,255,0.62)",
                          fontSize: 13,
                          lineHeight: 1.55,
                        }}
                      >
                        {selectedChange.reason}
                      </p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setCodeView("proposed")
                        }
                        style={{
                          padding: "9px 11px",
                          borderRadius: 10,
                          border:
                            codeView === "proposed"
                              ? "1px solid rgba(246,202,98,0.4)"
                              : "1px solid rgba(255,255,255,0.08)",
                          background:
                            codeView === "proposed"
                              ? "rgba(246,202,98,0.1)"
                              : "rgba(255,255,255,0.03)",
                          color:
                            codeView === "proposed"
                              ? "#f6ca62"
                              : "rgba(255,255,255,0.65)",
                          cursor: "pointer",
                        }}
                      >
                        Proposed code
                      </button>

                      <button
                        type="button"
                        disabled={
                          !selectedChange.originalContent
                        }
                        onClick={() =>
                          setCodeView("original")
                        }
                        style={{
                          padding: "9px 11px",
                          borderRadius: 10,
                          border:
                            codeView === "original"
                              ? "1px solid rgba(116,185,255,0.4)"
                              : "1px solid rgba(255,255,255,0.08)",
                          background:
                            codeView === "original"
                              ? "rgba(116,185,255,0.1)"
                              : "rgba(255,255,255,0.03)",
                          color:
                            !selectedChange.originalContent
                              ? "rgba(255,255,255,0.28)"
                              : codeView === "original"
                                ? "#9dc9ff"
                                : "rgba(255,255,255,0.65)",
                          cursor:
                            selectedChange.originalContent
                              ? "pointer"
                              : "not-allowed",
                        }}
                      >
                        Original code
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleCopy()
                        }
                        style={{
                          padding: "9px 11px",
                          borderRadius: 10,
                          border:
                            "1px solid rgba(255,255,255,0.08)",
                          background:
                            "rgba(255,255,255,0.03)",
                          color:
                            copied
                              ? "#70ddb0"
                              : "rgba(255,255,255,0.72)",
                          cursor: "pointer",
                        }}
                      >
                        {copied
                          ? "Copied"
                          : "Copy code"}
                      </button>

                      <button
                        type="button"
                        onClick={handleDownload}
                        style={{
                          padding: "9px 11px",
                          borderRadius: 10,
                          border:
                            "1px solid rgba(255,255,255,0.08)",
                          background:
                            "rgba(255,255,255,0.03)",
                          color:
                            "rgba(255,255,255,0.72)",
                          cursor: "pointer",
                        }}
                      >
                        Save file
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      borderRadius: 15,
                      overflow: "hidden",
                      border:
                        "1px solid rgba(255,255,255,0.07)",
                      background: "#070c14",
                    }}
                  >
                    <header
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        padding: "11px 13px",
                        background:
                          "rgba(255,255,255,0.04)",
                        borderBottom:
                          "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <code
                        style={{
                          color: "#a8c7ff",
                          fontSize: 12,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {selectedChange.relativePath}
                      </code>

                      <span
                        style={{
                          color:
                            codeView === "proposed"
                              ? "#f6ca62"
                              : "#9dc9ff",
                          fontSize: 12,
                        }}
                      >
                        {codeView === "proposed"
                          ? "Complete proposed file"
                          : "Current original file"}
                      </span>
                    </header>

                    <pre
                      style={{
                        margin: 0,
                        padding: 16,
                        maxHeight: "720px",
                        overflow: "auto",
                        color: "#dce7f7",
                        fontSize: 12,
                        lineHeight: 1.6,
                        whiteSpace: "pre",
                        tabSize: 2,
                      }}
                    >
                      {codeView === "proposed"
                        ? selectedChange.proposedContent ||
                          "No proposed content was returned."
                        : selectedChange.originalContent ||
                          "This is a new file, so no original content exists."}
                    </pre>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: 12,
                      marginTop: 14,
                    }}
                  >
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 13,
                        background:
                          "rgba(255,255,255,0.03)",
                        border:
                          "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <strong
                        style={{
                          color: "#ffffff",
                          fontSize: 13,
                        }}
                      >
                        Validation
                      </strong>

                      {selectedChange.validationCommands.length >
                      0 ? (
                        selectedChange.validationCommands.map(
                          (command) => (
                            <code
                              key={command}
                              style={{
                                display: "block",
                                marginTop: 8,
                                padding: "8px 9px",
                                borderRadius: 9,
                                background: "#080d16",
                                color: "#79e6b5",
                                fontSize: 11,
                                overflowWrap: "anywhere",
                              }}
                            >
                              {command}
                            </code>
                          )
                        )
                      ) : (
                        <p
                          style={{
                            color: "rgba(255,255,255,0.5)",
                            fontSize: 12,
                          }}
                        >
                          No validation commands were returned.
                        </p>
                      )}
                    </div>

                    <div
                      style={{
                        padding: 14,
                        borderRadius: 13,
                        background:
                          "rgba(255,255,255,0.03)",
                        border:
                          "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <strong
                        style={{
                          color: "#ffffff",
                          fontSize: 13,
                        }}
                      >
                        Rollback
                      </strong>

                      <ul
                        style={{
                          margin: "8px 0 0",
                          paddingLeft: 18,
                          color: "rgba(255,255,255,0.62)",
                          fontSize: 12,
                          lineHeight: 1.6,
                        }}
                      >
                        {selectedChange.rollbackInstructions.map(
                          (item, index) => (
                            <li
                              key={`${item}-${index}`}
                            >
                              {item}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {proposal.warnings.length > 0 ? (
            <section
              style={{
                ...cardStyle,
                padding: 22,
                border:
                  "1px solid rgba(246,202,98,0.2)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 12px",
                  color: "#ffffff",
                  fontSize: 18,
                }}
              >
                Proposal warnings
              </h3>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >
                {proposal.warnings.map(
                  (warning, index) => (
                    <div
                      key={`${warning}-${index}`}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background:
                          "rgba(246,202,98,0.06)",
                        color: "#f6d47d",
                        fontSize: 13,
                        lineHeight: 1.55,
                      }}
                    >
                      {warning}
                    </div>
                  )
                )}
              </div>
            </section>
          ) : null}

          <section
            style={{
              ...cardStyle,
              padding: 22,
              border: "1px solid rgba(112,221,176,0.24)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
              <div>
                <h3 style={{ margin: 0, color: "#ffffff", fontSize: 18 }}>
                  CEO approval and protected execution
                </h3>
                <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.62)", lineHeight: 1.6, fontSize: 13 }}>
                  Orion will verify the proposal, create timestamped backups, apply only these reviewed files, run approved checks, and automatically restore the backup when validation fails.
                </p>
              </div>
              <Badge color="#70ddb0">One-time approval token</Badge>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12, marginTop: 18 }}>
              <label style={{ display: "grid", gap: 8, color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: 700 }}>
                Type APPROVE
                <input
                  value={approvalText}
                  onChange={(event) => setApprovalText(event.target.value)}
                  placeholder="APPROVE"
                  style={{ ...inputStyle, padding: "12px 13px" }}
                />
              </label>
              <label style={{ display: "grid", gap: 8, color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: 700 }}>
                CEO note (optional)
                <input
                  value={approvalNote}
                  onChange={(event) => setApprovalNote(event.target.value)}
                  placeholder="Reason for approving this change"
                  style={{ ...inputStyle, padding: "12px 13px" }}
                />
              </label>
            </div>

            <div style={{ display: "grid", gap: 9, marginTop: 16 }}>
              <strong style={{ color: "#ffffff", fontSize: 13 }}>Validation commands</strong>
              {["npx tsc --noEmit", "npm run lint", "npm run build"].map((command) => (
                <label key={command} style={{ display: "flex", alignItems: "center", gap: 9, color: "rgba(255,255,255,0.68)", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={validationCommands.includes(command)}
                    onChange={() => toggleValidationCommand(command)}
                  />
                  <code>{command}</code>
                </label>
              ))}
              <label style={{ display: "flex", alignItems: "center", gap: 9, color: "#f6d47d", fontSize: 13, marginTop: 4 }}>
                <input type="checkbox" checked={autoRollback} onChange={(event) => setAutoRollback(event.target.checked)} />
                Automatically restore backups when a validation command fails
              </label>
            </div>

            <button
              type="button"
              onClick={() => void applyApprovedProposal()}
              disabled={applyLoading || approvalText.trim().toUpperCase() !== "APPROVE" || Boolean(applyResponse?.transaction)}
              style={{
                marginTop: 18,
                width: "100%",
                padding: "13px 16px",
                borderRadius: 13,
                border: "1px solid rgba(112,221,176,0.35)",
                background: approvalText.trim().toUpperCase() === "APPROVE" ? "rgba(112,221,176,0.14)" : "rgba(255,255,255,0.04)",
                color: approvalText.trim().toUpperCase() === "APPROVE" ? "#8cf0c4" : "rgba(255,255,255,0.36)",
                fontWeight: 850,
                cursor: applyLoading ? "wait" : "pointer",
              }}
            >
              {applyLoading ? "Orion is backing up, applying, and validating…" : "Approve and Apply Reviewed Changes"}
            </button>

            {applyResponse?.transaction ? (
              <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                <div style={{ padding: 15, borderRadius: 13, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <strong style={{ color: "#ffffff" }}>Transaction {applyResponse.transaction.transactionId}</strong>
                    <Badge color={applyResponse.transaction.status === "succeeded" ? "#70ddb0" : applyResponse.transaction.status === "rolled_back" ? "#f6ca62" : "#ff7a88"}>
                      {formatLabel(applyResponse.transaction.status)}
                    </Badge>
                  </div>
                  <p style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, lineHeight: 1.55 }}>
                    Applied {applyResponse.transaction.appliedChanges.length} file(s). Rollback performed: {applyResponse.transaction.rollbackPerformed ? "Yes" : "No"}.
                  </p>
                  {applyResponse.transaction.error ? <p style={{ color: "#ff9aa5", fontSize: 13 }}>{applyResponse.transaction.error}</p> : null}
                </div>

                {applyResponse.transaction.validations.map((validation) => (
                  <details key={validation.command} style={{ padding: 13, borderRadius: 12, background: "#080d16", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <summary style={{ cursor: "pointer", color: validation.status === "passed" ? "#79e6b5" : "#ff9aa5", fontWeight: 750 }}>
                      {validation.command} — {formatLabel(validation.status)}
                    </summary>
                    <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "rgba(255,255,255,0.68)", fontSize: 11, maxHeight: 300, overflow: "auto" }}>
                      {validation.stdout || validation.stderr || "No command output."}
                    </pre>
                  </details>
                ))}

                {!applyResponse.transaction.rollbackPerformed ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                    <input
                      value={rollbackText}
                      onChange={(event) => setRollbackText(event.target.value)}
                      placeholder='Type "ROLLBACK"'
                      style={{ ...inputStyle, padding: "12px 13px" }}
                    />
                    <button
                      type="button"
                      onClick={() => void rollbackTransaction()}
                      disabled={rollbackLoading || rollbackText.trim().toUpperCase() !== "ROLLBACK"}
                      style={{ padding: "11px 15px", borderRadius: 12, border: "1px solid rgba(255,122,136,0.35)", background: "rgba(255,122,136,0.1)", color: "#ff9aa5", fontWeight: 800, cursor: "pointer" }}
                    >
                      {rollbackLoading ? "Restoring…" : "Restore Backup"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {!loading && !proposal ? (
        <section
          style={{
            ...cardStyle,
            padding: 28,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              margin: "0 auto",
              display: "grid",
              placeItems: "center",
              borderRadius: 18,
              background:
                "rgba(246,202,98,0.08)",
              border:
                "1px solid rgba(246,202,98,0.16)",
              color: "#f6ca62",
              fontSize: 24,
            }}
          >
            {"</>"}
          </div>

          <h3
            style={{
              margin: "15px 0 0",
              color: "#ffffff",
            }}
          >
            Ready to propose code
          </h3>

          <p
            style={{
              margin: "8px auto 0",
              maxWidth: 620,
              color: "rgba(255,255,255,0.56)",
              lineHeight: 1.65,
              fontSize: 13,
            }}
          >
            Describe one focused feature or correction and
            supply the exact approved files. Smaller requests
            produce safer and more reviewable proposals.
          </p>
        </section>
      ) : null}
    </div>
  );
}