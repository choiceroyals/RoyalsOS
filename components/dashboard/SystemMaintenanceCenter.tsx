"use client";

import { useEffect, useMemo, useState } from "react";
import { createEmployeeMission } from "@/lib/core-operations/storage";
import {
  createAndAssignSecurityIssue,
  loadSecurityState,
  saveSecurityState,
} from "@/lib/security/client";
import type {
  SystemMaintenanceAction,
  SystemMaintenanceSnapshot,
} from "@/lib/system/types";
import styles from "./SystemMaintenanceCenter.module.css";

type Props = {
  onOpenOrion?: () => void;
  onOpenSecurity?: () => void;
  onOpenMissions?: () => void;
};

type ActionResponse = {
  message?: string;
  detail?: string;
  error?: string;
  snapshot?: SystemMaintenanceSnapshot;
};

const ACTIONS: Array<{
  id: SystemMaintenanceAction;
  label: string;
  description: string;
  tone?: "warning" | "danger";
}> = [
  { id: "quick_scan", label: "Run quick scan", description: "Check files, dependencies, APIs, database setup, and captured errors." },
  { id: "verify_code", label: "Verify code", description: "Run TypeScript and ESLint using the approved command allowlist." },
  { id: "safe_repair", label: "Safe repair", description: "Create runtime folders and clear only the safe Next.js cache." },
  { id: "repair_dependencies", label: "Repair dependencies", description: "Run npm install when packages are missing or Next.js cannot start.", tone: "warning" },
  { id: "create_restore_point", label: "Create restore point", description: "Protect app, components, library code, migrations, and configuration." },
  { id: "generate_report", label: "Generate report", description: "Save a complete diagnostic snapshot inside .royalos/reports." },
];

export default function SystemMaintenanceCenter({
  onOpenOrion,
  onOpenSecurity,
  onOpenMissions,
}: Props) {
  const [snapshot, setSnapshot] = useState<SystemMaintenanceSnapshot | null>(null);
  const [busy, setBusy] = useState<SystemMaintenanceAction | "loading" | "">("loading");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    setBusy("loading");
    setError("");
    try {
      const response = await fetch("/api/system/maintenance", { cache: "no-store" });
      const data = (await response.json()) as SystemMaintenanceSnapshot & { error?: string };
      if (!response.ok || data.error) throw new Error(data.error || "System Care could not connect.");
      setSnapshot(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "System Care could not connect.");
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function run(action: SystemMaintenanceAction) {
    setBusy(action);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/system/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as ActionResponse;
      if (!response.ok || data.error) throw new Error(data.error || "Maintenance action failed.");
      if (data.snapshot) setSnapshot(data.snapshot);
      setMessage(data.detail ? `${data.message} ${data.detail}` : data.message || "Action completed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Maintenance action failed.");
    } finally {
      setBusy("");
    }
  }

  const attentionChecks = useMemo(
    () => snapshot?.checks.filter((item) => item.status === "warning" || item.status === "fail") ?? [],
    [snapshot],
  );

  function issueSummary() {
    if (attentionChecks.length === 0) return "RoyalOS System Care did not find an active configuration or code issue.";
    return attentionChecks.map((item) => `${item.label}: ${item.detail}`).join("\n");
  }

  function assignOrion() {
    const mission = createEmployeeMission({
      title: `Repair RoyalOS system issue — ${new Date().toLocaleDateString()}`,
      description: `${issueSummary()}\n\nInspect the repository, identify the root cause, prepare an approval-controlled fix, create a restore point, apply only approved changes, and run TypeScript and lint verification.`,
      leadEmployee: "Orion",
      supportingEmployees: ["Sentinel"],
      workspaceName: "Triple-Hay Concept LLC",
      priority: attentionChecks.some((item) => item.status === "fail") ? "Critical" : "High",
    });
    setMessage(`Mission ${mission.title} was assigned to Orion.`);
    onOpenMissions?.();
  }

  function assignSentinel() {
    const result = createAndAssignSecurityIssue(loadSecurityState(), {
      title: "Investigate RoyalOS software health issue",
      platform: "RoyalOS",
      summary: issueSummary(),
      severity: attentionChecks.some((item) => item.status === "fail") ? "critical" : "high",
      evidence: snapshot ? JSON.stringify(snapshot.checks) : issueSummary(),
      ruleId: "rule-system-runtime",
    });
    saveSecurityState(result.state);
    setMessage(`Sentinel accepted incident ${result.incident.title}.`);
    onOpenSecurity?.();
  }

  const active = snapshot?.connected && snapshot.engine === "active";

  return (
    <div className={styles.center}>
      <section className={styles.hero}>
        <div className={styles.mark}>SC</div>
        <div className={styles.heroCopy}>
          <span>RoyalOS software operations</span>
          <h1>System Care & Software Update</h1>
          <p>Simple, approval-controlled diagnostics and repairs for the RoyalOS application. Browser errors are captured automatically, while file changes remain under Orion and CEO control.</p>
        </div>
        <div className={`${styles.engine} ${active ? styles.engineActive : styles.engineAttention}`}>
          <i />
          <div><b>{snapshot?.connected ? "Repair engine connected" : "Connecting"}</b><small>{active ? "Active and healthy" : "Attention required"}</small></div>
        </div>
      </section>

      {error ? <div className={styles.error}>{error}</div> : null}
      {message ? <div className={styles.success}>{message}</div> : null}

      <section className={styles.metrics}>
        <article><strong>{snapshot?.checks.filter((item) => item.status === "pass").length ?? 0}</strong><span>Checks passed</span></article>
        <article><strong>{attentionChecks.length}</strong><span>Attention items</span></article>
        <article><strong>{snapshot?.restorePoints.length ?? 0}</strong><span>Restore points</span></article>
        <article><strong>{snapshot?.logs.length ?? 0}</strong><span>Maintenance actions</span></article>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <header><div><span>Health scan</span><h2>Software status</h2></div><button type="button" onClick={() => void refresh()} disabled={busy !== ""}>{busy === "loading" ? "Scanning…" : "Refresh"}</button></header>
          <div className={styles.checks}>
            {snapshot?.checks.map((item) => (
              <article key={item.id}>
                <span className={`${styles.badge} ${styles[item.status]}`}>{item.status.replace("_", " ")}</span>
                <div><b>{item.label}</b><p>{item.detail}</p>{item.remediation ? <small>{item.remediation}</small> : null}</div>
              </article>
            )) ?? <div className={styles.empty}>Connecting to the local repair engine…</div>}
          </div>
        </section>

        <section className={styles.panel}>
          <header><div><span>Safe allowlist</span><h2>Repair actions</h2></div></header>
          <div className={styles.actions}>
            {ACTIONS.map((action) => (
              <button key={action.id} type="button" className={action.tone ? styles[action.tone] : ""} disabled={busy !== ""} onClick={() => void run(action.id)}>
                <b>{busy === action.id ? "Working…" : action.label}</b><span>{action.description}</span>
              </button>
            ))}
          </div>
          <div className={styles.assignmentActions}>
            <button type="button" onClick={assignOrion}>Assign issue to Orion</button>
            <button type="button" onClick={assignSentinel}>Assign security review to Sentinel</button>
            <button type="button" onClick={onOpenOrion}>Open Orion</button>
          </div>
        </section>
      </div>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <header><div><span>Recovery</span><h2>Restore points</h2></div></header>
          <div className={styles.restoreList}>
            {snapshot?.restorePoints.slice(0, 6).map((point) => <article key={point.id}><div><b>{point.id}</b><small>{new Date(point.createdAt).toLocaleString()}</small></div><span>{point.fileCount} files</span></article>) ?? null}
            {snapshot && snapshot.restorePoints.length === 0 ? <div className={styles.empty}>Create a restore point before major upgrades.</div> : null}
          </div>
          <p className={styles.note}>Rollback is intentionally not automatic. It must be approved and performed after reviewing the latest restore point.</p>
        </section>

        <section className={styles.panel}>
          <header><div><span>Audit trail</span><h2>Recent maintenance</h2></div></header>
          <div className={styles.logs}>
            {snapshot?.logs.slice(0, 8).map((log) => <article key={log.id}><span className={`${styles.logDot} ${styles[log.status]}`} /><div><b>{log.summary}</b><small>{new Date(log.createdAt).toLocaleString()} · {log.action.replaceAll("_", " ")}</small>{log.detail ? <p>{log.detail}</p> : null}</div></article>) ?? null}
            {snapshot && snapshot.logs.length === 0 ? <div className={styles.empty}>No maintenance actions have been recorded yet.</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
