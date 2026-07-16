"use client";

import { useEffect, useMemo, useState } from "react";
import {
  assignAlertToSentinel,
  createAndAssignSecurityIssue,
  loadSecurityState,
  saveSecurityState,
} from "@/lib/security/client";
import type {
  SecurityAlert,
  SecurityIncident,
  SecuritySeverity,
  SecurityState,
} from "@/lib/security/types";
import SaveCompanyPdfButton from "@/components/reports/SaveCompanyPdfButton";
import type { RoyalOSWorkspace } from "@/lib/missions/types";
import styles from "./SecurityAuditCenter.module.css";

type View = "overview" | "alerts" | "incidents" | "events" | "health" | "rules" | "reports";

const BRAND_NAMES: Record<string, string> = {
  "brand-choiceroyals": "ChoiceRoyals",
  "brand-xena-grace": "Xena Grace",
  "brand-td-talk": "TD Talk",
  "brand-triple-hay": "Triple-Hay Concept LLC",
};

const HEALTH_PLATFORMS = [
  { name: "RoyalOS", brandId: "brand-triple-hay", healthy: true },
  { name: "ChoiceRoyals.com", brandId: "brand-choiceroyals", healthy: true },
  { name: "XenaGrace.com", brandId: "brand-xena-grace", healthy: false },
  { name: "Instagram", brandId: "brand-choiceroyals", healthy: true },
  { name: "Facebook", brandId: "brand-choiceroyals", healthy: true },
  { name: "TikTok", brandId: "brand-xena-grace", healthy: true },
  { name: "YouTube", brandId: "brand-xena-grace", healthy: true },
  { name: "Stripe", brandId: "brand-choiceroyals", healthy: true },
  { name: "Supabase", brandId: "brand-triple-hay", healthy: true },
  { name: "GitHub", brandId: "brand-triple-hay", healthy: true },
  { name: "OpenAI", brandId: "brand-triple-hay", healthy: true },
];

function severityRank(value: SecuritySeverity): number {
  return ["informational", "low", "medium", "high", "critical"].indexOf(value);
}

export default function SecurityAuditCenter() {
  const [state, setState] = useState<SecurityState | null>(null);
  const [view, setView] = useState<View>("overview");
  const [selectedAlertId, setSelectedAlertId] = useState("");
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const refresh = () => setState(loadSecurityState());
    refresh();
    window.addEventListener("royalos:security-audit-updated", refresh);
    return () => window.removeEventListener("royalos:security-audit-updated", refresh);
  }, []);

  function persist(next: SecurityState) {
    setState(next);
    saveSecurityState(next);
  }

  const openAlerts = useMemo(
    () => state?.alerts.filter((item) => !["resolved", "false_positive"].includes(item.status)) ?? [],
    [state],
  );
  const metrics = useMemo(() => ({
    open: openAlerts.length,
    critical: openAlerts.filter((item) => item.severity === "critical").length,
    incidents: state?.incidents.filter((item) => item.status !== "resolved").length ?? 0,
    events: state?.events.length ?? 0,
    rules: state?.rules.filter((item) => item.enabled).length ?? 0,
  }), [openAlerts, state]);

  const selectedAlert = state?.alerts.find((item) => item.id === selectedAlertId) ?? null;
  const selectedIncident = state?.incidents.find((item) => item.id === selectedIncidentId) ?? null;

  function assign(alert: SecurityAlert) {
    if (!state) return;
    const next = assignAlertToSentinel(state, alert.id);
    persist(next);
    const incident = next.incidents.find((item) => item.alertId === alert.id);
    setSelectedAlertId(alert.id);
    setNotice(incident ? `Sentinel accepted the incident: ${incident.title}.` : "Sentinel assignment was saved.");
  }

  function assignHealthPlatform(platform: typeof HEALTH_PLATFORMS[number]) {
    if (!state) return;
    const result = createAndAssignSecurityIssue(state, {
      brandId: platform.brandId,
      title: `Review ${platform.name} platform health`,
      platform: platform.name,
      summary: platform.healthy
        ? `${platform.name} is registered, but Sentinel was asked to complete a preventive security review.`
        : `${platform.name} has limited telemetry or needs a connector and requires investigation.`,
      severity: platform.healthy ? "medium" : "high",
      ruleId: platform.healthy ? "rule-platform-review" : "rule-site-offline",
    });
    persist(result.state);
    setNotice(`Sentinel accepted ${platform.name} for investigation.`);
    setSelectedIncidentId(result.incident.id);
  }

  function resolveIncident(incident: SecurityIncident) {
    if (!state) return;
    const now = new Date().toISOString();
    const next: SecurityState = {
      ...state,
      incidents: state.incidents.map((item) => item.id === incident.id ? {
        ...item,
        status: "resolved",
        actionsTaken: [...item.actionsTaken, "CEO marked the incident resolved after review"],
        updatedAt: now,
      } : item),
      alerts: state.alerts.map((item) => item.id === incident.alertId ? { ...item, status: "resolved", updatedAt: now } : item),
      updatedAt: now,
    };
    persist(next);
    setNotice(`${incident.title} was marked resolved.`);
  }

  const securityReport = `RoyalOS Security & Audit Summary\nOpen alerts: ${metrics.open}\nCritical alerts: ${metrics.critical}\nOpen incidents: ${metrics.incidents}\nSecurity events: ${metrics.events}\nEnabled detection rules: ${metrics.rules}\n\nRecommendations:\n- Connect WordPress, Supabase, GitHub, Stripe, social, and uptime telemetry.\n- Enable MFA and least privilege on all business accounts.\n- Review employee and integration permissions quarterly.\n- Preserve evidence and approval history for every high-impact action.\n- Add OpenTelemetry or Wazuh later when endpoint and server visibility is needed.`;

  if (!state) {
    return <div className={styles.center}><section className={styles.panel}><div className={styles.empty}>Loading Sentinel and the Security & Audit Center…</div></section></div>;
  }

  return (
    <div className={styles.center}>
      <section className={styles.hero}>
        <div className={styles.sentinelMark}>SE</div>
        <div><span>RoyalOS Security Operations</span><h1>Security & Audit Center</h1><p>Sentinel monitors available logs, API events, webhooks, health checks, and RoyalOS audit records. Visibility is clearly labeled so limited platform telemetry is never mistaken for full SIEM coverage.</p></div>
        <div className={styles.status}><i />Protected with attention items</div>
      </section>

      {notice ? <div className={styles.notice}>{notice}<button type="button" onClick={() => setNotice("")}>×</button></div> : null}

      <section className={styles.metrics}>
        <article><strong>{metrics.open}</strong><span>Open alerts</span></article>
        <article><strong>{metrics.critical}</strong><span>Critical</span></article>
        <article><strong>{metrics.incidents}</strong><span>Open incidents</span></article>
        <article><strong>{metrics.events}</strong><span>Events retained</span></article>
        <article><strong>{metrics.rules}</strong><span>Rules enabled</span></article>
      </section>

      <nav className={styles.tabs}>
        {(["overview", "alerts", "incidents", "events", "health", "rules", "reports"] as View[]).map((item) => (
          <button key={item} type="button" className={view === item ? styles.active : ""} onClick={() => setView(item)}>{item}</button>
        ))}
      </nav>

      {view === "overview" ? (
        <div className={styles.twoColumn}>
          <section className={styles.panel}>
            <header><div><span>Priority queue</span><h2>Alerts requiring review</h2></div><button type="button" onClick={() => setView("alerts")}>View all</button></header>
            <div className={styles.alertList}>
              {[...openAlerts].sort((a, b) => severityRank(b.severity) - severityRank(a.severity)).slice(0, 5).map((alert) => (
                <article key={alert.id} onClick={() => setSelectedAlertId(alert.id)}>
                  <span className={`${styles.severity} ${styles[alert.severity]}`}>{alert.severity}</span>
                  <div><b>{alert.title}</b><p>{alert.summary}</p><small>{BRAND_NAMES[alert.brandId]} · {alert.platform} · {alert.status}</small></div>
                  <button type="button" disabled={alert.assignedEmployee === "Sentinel"} onClick={(event) => { event.stopPropagation(); assign(alert); }}>{alert.assignedEmployee === "Sentinel" ? "Sentinel assigned" : "Assign Sentinel"}</button>
                </article>
              ))}
            </div>
          </section>
          <section className={styles.panel}><header><div><span>Sentinel</span><h2>Investigation workflow</h2></div></header><ol className={styles.workflow}><li>Review evidence and telemetry quality</li><li>Classify severity and affected systems</li><li>Recommend containment or correction</li><li>Request CEO approval for high-impact action</li><li>Escalate to Orion or Michael P</li><li>Validate recovery and generate report</li></ol></section>
        </div>
      ) : null}

      {view === "alerts" ? (
        <section className={styles.panel}>
          <header><div><span>Detection queue</span><h2>Security alerts</h2></div></header>
          <div className={styles.alertList}>
            {state.alerts.map((alert) => (
              <article key={alert.id} onClick={() => setSelectedAlertId(alert.id)}>
                <span className={`${styles.severity} ${styles[alert.severity]}`}>{alert.severity}</span>
                <div><b>{alert.title}</b><p>{alert.summary}</p><small>{BRAND_NAMES[alert.brandId]} · {alert.platform} · {alert.status}</small></div>
                <button type="button" disabled={alert.assignedEmployee === "Sentinel"} onClick={(event) => { event.stopPropagation(); assign(alert); }}>{alert.assignedEmployee === "Sentinel" ? "Sentinel assigned" : "Assign to Sentinel"}</button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {view === "incidents" ? (
        <section className={styles.panel}>
          <header><div><span>Managed response</span><h2>Incidents</h2></div></header>
          <div className={styles.incidentGrid}>
            {state.incidents.length === 0 ? <div className={styles.empty}>Assign an alert to Sentinel to create an incident.</div> : state.incidents.map((incident) => (
              <article key={incident.id} onClick={() => setSelectedIncidentId(incident.id)}>
                <span className={`${styles.severity} ${styles[incident.severity]}`}>{incident.severity}</span>
                <h3>{incident.title}</h3><p>{incident.findings}</p><small>{incident.assignedEmployee} · {incident.status}</small><button type="button">Open report</button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {view === "events" ? (
        <section className={styles.panel}>
          <header><div><span>Normalized activity</span><h2>Live events</h2></div></header>
          <div className={styles.eventTable}>{state.events.map((event) => <div key={event.id}><time>{new Date(event.createdAt).toLocaleTimeString()}</time><span>{BRAND_NAMES[event.brandId]}</span><b>{event.platform}</b><p>{event.action}</p><em>{event.source.replaceAll("_", " ")}</em><i className={styles[event.result]}>{event.result}</i></div>)}</div>
        </section>
      ) : null}

      {view === "health" ? (
        <section className={styles.healthGrid}>
          {HEALTH_PLATFORMS.map((platform) => (
            <article key={platform.name}>
              <span className={platform.healthy ? styles.healthyDot : styles.warningDot} />
              <div><b>{platform.name}</b><small>{platform.healthy ? "Registered or ready for connection" : "Limited telemetry / needs connector"}</small></div>
              <button type="button" onClick={() => assignHealthPlatform(platform)}>Assign Sentinel</button>
            </article>
          ))}
        </section>
      ) : null}

      {view === "rules" ? (
        <section className={styles.panel}>
          <header><div><span>Simple but powerful</span><h2>Detection rules</h2></div></header>
          <div className={styles.ruleList}>{state.rules.map((rule) => <article key={rule.id}><span className={`${styles.severity} ${styles[rule.severity]}`}>{rule.severity}</span><div><b>{rule.name}</b><p>{rule.description}</p><small>{rule.threshold} · {rule.defaultEmployee}</small></div><label><input type="checkbox" checked={rule.enabled} onChange={() => persist({ ...state, rules: state.rules.map((item) => item.id === rule.id ? { ...item, enabled: !item.enabled } : item), updatedAt: new Date().toISOString() })} /> Enabled</label></article>)}</div>
        </section>
      ) : null}

      {view === "reports" ? (
        <section className={styles.panel}>
          <header><div><span>Company records</span><h2>Security reporting</h2></div><SaveCompanyPdfButton defaultTitle="RoyalOS Security & Audit Summary" workspace="Triple-Hay Concept LLC" employee="Sentinel" content={securityReport} /></header>
          <div className={styles.reportCards}>{["Daily security summary", "Weekly audit report", "Platform health report", "Employee activity report", "Failed-login report", "Financial access report", "Incident report"].map((report) => <article key={report}><b>{report}</b><p>Generate an editable record and branded PDF linked to the correct workspace, platform, incident, and evidence folder.</p><button type="button">Prepare report</button></article>)}</div>
        </section>
      ) : null}

      {selectedAlert ? (
        <div className={styles.backdrop} onClick={() => setSelectedAlertId("")}>
          <section className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <header><div><span className={`${styles.severity} ${styles[selectedAlert.severity]}`}>{selectedAlert.severity}</span><div><h2>{selectedAlert.title}</h2><p>{BRAND_NAMES[selectedAlert.brandId]} · {selectedAlert.platform}</p></div></div><button type="button" onClick={() => setSelectedAlertId("")}>×</button></header>
            <p>{selectedAlert.summary}</p>
            <dl><div><dt>Status</dt><dd>{selectedAlert.status}</dd></div><div><dt>Rule</dt><dd>{selectedAlert.ruleId}</dd></div><div><dt>Employee</dt><dd>{selectedAlert.assignedEmployee || "Not assigned"}</dd></div><div><dt>Events</dt><dd>{selectedAlert.eventIds.length}</dd></div></dl>
            <div className={styles.modalActions}><button type="button" disabled={selectedAlert.assignedEmployee === "Sentinel"} onClick={() => assign(selectedAlert)}>{selectedAlert.assignedEmployee === "Sentinel" ? "Sentinel assigned" : "Assign to Sentinel"}</button><button type="button" onClick={() => setSelectedAlertId("")}>Close</button></div>
          </section>
        </div>
      ) : null}

      {selectedIncident ? (
        <div className={styles.backdrop} onClick={() => setSelectedIncidentId("")}>
          <section className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <header><div><span className={`${styles.severity} ${styles[selectedIncident.severity]}`}>{selectedIncident.severity}</span><div><h2>{selectedIncident.title}</h2><p>{selectedIncident.assignedEmployee} · {selectedIncident.status}</p></div></div><button type="button" onClick={() => setSelectedIncidentId("")}>×</button></header>
            <h3>Findings</h3><p>{selectedIncident.findings}</p>
            <h3>Actions taken</h3><ul>{selectedIncident.actionsTaken.map((item) => <li key={item}>{item}</li>)}</ul>
            <h3>Recommendations</h3><ul>{selectedIncident.recommendations.map((item) => <li key={item}>{item}</li>)}</ul>
            <div className={styles.modalActions}>
              <SaveCompanyPdfButton defaultTitle={selectedIncident.title} workspace={(BRAND_NAMES[selectedIncident.brandId] || "Triple-Hay Concept LLC") as RoyalOSWorkspace} employee="Sentinel" content={`Incident: ${selectedIncident.title}\nPlatform: ${selectedIncident.platform}\nSeverity: ${selectedIncident.severity}\nStatus: ${selectedIncident.status}\nHandled by: ${selectedIncident.assignedEmployee}\n\nFindings:\n${selectedIncident.findings}\n\nEvidence:\n${selectedIncident.evidence.join("\n")}\n\nActions taken:\n${selectedIncident.actionsTaken.join("\n")}\n\nRecommendations:\n${selectedIncident.recommendations.join("\n")}`} />
              <button type="button" onClick={() => resolveIncident(selectedIncident)}>Mark resolved</button><button type="button">Send to Orion</button><button type="button">Send to Michael P</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
