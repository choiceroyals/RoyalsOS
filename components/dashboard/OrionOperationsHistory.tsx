"use client";

import { useEffect, useState, type CSSProperties } from "react";

type ValidationResult = {
  command: string;
  status: string;
  stdout: string;
  stderr: string;
  durationMs: number;
};

type Transaction = {
  transactionId: string;
  title: string;
  workspace: string;
  status: string;
  riskLevel: string;
  affectedPaths: string[];
  appliedChanges: string[];
  validations: ValidationResult[];
  rollbackPerformed: boolean;
  approvedBy: string;
  error?: string;
  startedAt: string;
  durationMs?: number;
};

type Audit = {
  eventId: string;
  eventType: string;
  message: string;
  timestamp: string;
};

type Health = {
  status: string;
  capabilities: {
    localMode: boolean;
    writesEnabled: boolean;
    deletesEnabled: boolean;
    terminalEnabled: boolean;
    backupsRequired: boolean;
    approvalRequired: boolean;
    projectRoot: string;
  };
  validationAllowlist: string[];
  safeguards: string[];
};

const cardStyle: CSSProperties = {
  background: "linear-gradient(145deg, rgba(19,25,38,0.98), rgba(12,17,27,0.98))",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 22,
  boxShadow: "0 22px 60px rgba(0,0,0,0.24)",
};

function label(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusColor(status: string): string {
  if (status === "succeeded" || status === "passed") return "#70ddb0";
  if (status === "rolled_back" || status === "validation_failed") return "#f6ca62";
  if (status === "failed") return "#ff7a88";
  return "#9dc9ff";
}

export default function OrionOperationsHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validations, setValidations] = useState<ValidationResult[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [historyResponse, healthResponse] = await Promise.all([
        fetch("/api/developer/history?limit=40", { cache: "no-store" }),
        fetch("/api/developer/health", { cache: "no-store" }),
      ]);
      const historyData = (await historyResponse.json()) as {
        transactions?: Transaction[];
        audit?: Audit[];
        error?: string;
      };
      const healthData = (await healthResponse.json()) as Health & { error?: string };
      if (!historyResponse.ok) throw new Error(historyData.error || "Could not load Orion history.");
      if (!healthResponse.ok) throw new Error(healthData.error || "Could not load Orion health.");
      setTransactions(historyData.transactions ?? []);
      setAudit(historyData.audit ?? []);
      setHealth(healthData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load Orion operations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Loading server state is the intentional synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function runValidation() {
    setValidationLoading(true);
    setError("");
    try {
      const response = await fetch("/api/developer/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commands: ["npx tsc --noEmit", "npm run lint", "npm run build"] }),
      });
      const data = (await response.json()) as { validations?: ValidationResult[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Orion could not validate the project.");
      setValidations(data.validations ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Orion could not validate the project.");
    } finally {
      setValidationLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={{ ...cardStyle, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#70ddb0", fontSize: 12, fontWeight: 850, letterSpacing: "0.12em" }}>ORION LOCAL DEVELOPER</div>
            <h2 style={{ margin: "7px 0 0", color: "#fff", fontSize: 26 }}>Execution, Validation & Audit</h2>
            <p style={{ margin: "9px 0 0", color: "rgba(255,255,255,.64)", lineHeight: 1.6, maxWidth: 760 }}>
              Review local developer capabilities, run the safe validation suite, and inspect every approved source change and rollback event.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => void load()} style={{ padding: "10px 13px", borderRadius: 11, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.04)", color: "#fff", cursor: "pointer" }}>Refresh</button>
            <button type="button" onClick={() => void runValidation()} disabled={validationLoading} style={{ padding: "10px 13px", borderRadius: 11, border: "1px solid rgba(112,221,176,.32)", background: "rgba(112,221,176,.1)", color: "#8cf0c4", fontWeight: 800, cursor: validationLoading ? "wait" : "pointer" }}>
              {validationLoading ? "Validating…" : "Run Full Validation"}
            </button>
          </div>
        </div>
      </section>

      {error ? <div style={{ padding: 13, borderRadius: 12, background: "rgba(255,122,136,.1)", border: "1px solid rgba(255,122,136,.25)", color: "#ff9aa5" }}>{error}</div> : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
        {[
          ["Local mode", health?.capabilities.localMode ? "Ready" : "Blocked"],
          ["Approved writes", health?.capabilities.writesEnabled ? "Enabled" : "Disabled"],
          ["Validation commands", health?.capabilities.terminalEnabled ? "Enabled" : "Disabled"],
          ["Backups", health?.capabilities.backupsRequired ? "Required" : "Optional"],
        ].map(([title, value]) => (
          <article key={title} style={{ ...cardStyle, padding: 18 }}>
            <span style={{ color: "rgba(255,255,255,.52)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>{title}</span>
            <strong style={{ display: "block", marginTop: 7, color: value === "Ready" || value === "Enabled" || value === "Required" ? "#70ddb0" : "#ff7a88", fontSize: 20 }}>{value}</strong>
          </article>
        ))}
      </section>

      {health ? (
        <section style={{ ...cardStyle, padding: 20 }}>
          <h3 style={{ margin: 0, color: "#fff" }}>Safety controls</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 8, marginTop: 13 }}>
            {health.safeguards.map((item) => <div key={item} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(112,221,176,.055)", color: "rgba(255,255,255,.68)", fontSize: 13 }}>✓ {item}</div>)}
          </div>
          <p style={{ color: "rgba(255,255,255,.45)", fontSize: 12, marginBottom: 0, overflowWrap: "anywhere" }}>Project root: {health.capabilities.projectRoot}</p>
        </section>
      ) : null}

      {validations.length > 0 ? (
        <section style={{ ...cardStyle, padding: 20 }}>
          <h3 style={{ margin: 0, color: "#fff" }}>Latest manual validation</h3>
          <div style={{ display: "grid", gap: 10, marginTop: 13 }}>
            {validations.map((validation) => (
              <details key={validation.command} style={{ padding: 12, borderRadius: 11, background: "#080d16", border: "1px solid rgba(255,255,255,.07)" }}>
                <summary style={{ color: statusColor(validation.status), cursor: "pointer", fontWeight: 800 }}>{validation.command} — {label(validation.status)}</summary>
                <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "rgba(255,255,255,.65)", fontSize: 11, maxHeight: 260, overflow: "auto" }}>{validation.stdout || validation.stderr || "No output."}</pre>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <section style={{ ...cardStyle, padding: 20 }}>
        <h3 style={{ margin: 0, color: "#fff" }}>Change transactions</h3>
        {loading ? <p style={{ color: "rgba(255,255,255,.55)" }}>Loading Orion history…</p> : transactions.length === 0 ? <p style={{ color: "rgba(255,255,255,.55)" }}>No approved file-change transactions yet.</p> : (
          <div style={{ display: "grid", gap: 10, marginTop: 13 }}>
            {transactions.map((transaction) => (
              <article key={transaction.transactionId} style={{ padding: 14, borderRadius: 13, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <strong style={{ color: "#fff" }}>{transaction.title}</strong>
                    <div style={{ marginTop: 4, color: "rgba(255,255,255,.48)", fontSize: 12 }}>{transaction.workspace} · {new Date(transaction.startedAt).toLocaleString()} · {transaction.approvedBy}</div>
                  </div>
                  <span style={{ color: statusColor(transaction.status), fontWeight: 800, fontSize: 12 }}>{label(transaction.status)}</span>
                </div>
                <p style={{ color: "rgba(255,255,255,.62)", fontSize: 13, lineHeight: 1.5, marginBottom: 0 }}>{transaction.affectedPaths.join(", ")}</p>
                {transaction.error ? <p style={{ color: "#ff9aa5", fontSize: 12 }}>{transaction.error}</p> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={{ ...cardStyle, padding: 20 }}>
        <h3 style={{ margin: 0, color: "#fff" }}>Audit trail</h3>
        <div style={{ display: "grid", gap: 8, marginTop: 13, maxHeight: 420, overflow: "auto" }}>
          {audit.length === 0 ? <p style={{ color: "rgba(255,255,255,.55)" }}>No Orion audit events yet.</p> : audit.map((event) => (
            <div key={event.eventId} style={{ padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.025)", borderLeft: `3px solid ${statusColor(event.eventType.includes("failed") ? "failed" : event.eventType.includes("rollback") ? "rolled_back" : "succeeded")}` }}>
              <strong style={{ color: "rgba(255,255,255,.82)", fontSize: 12 }}>{label(event.eventType)}</strong>
              <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.58)", fontSize: 12 }}>{event.message}</p>
              <small style={{ color: "rgba(255,255,255,.35)" }}>{new Date(event.timestamp).toLocaleString()}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
