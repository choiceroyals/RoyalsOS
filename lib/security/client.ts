"use client";

import type { SecurityAlert, SecurityEvent, SecurityIncident, SecurityRule, SecurityState } from "@/lib/security/types";

export const SECURITY_STORAGE_KEY = "royalos:security-audit:v1";
export const SECURITY_EVENT = "royalos:security-audit-updated";

const now = new Date().toISOString();
const RULES: SecurityRule[] = [
  { id: "rule-failed-login", name: "Repeated failed logins", description: "Five failed logins within ten minutes.", severity: "high", enabled: true, threshold: "5 failures / 10 minutes", defaultEmployee: "Sentinel", recommendation: "Review source, account, IP reputation, MFA, and login controls." },
  { id: "rule-admin-created", name: "Administrator created", description: "A new administrator or privileged user is created.", severity: "high", enabled: true, threshold: "Any event", defaultEmployee: "Sentinel", recommendation: "Verify approval and remove unauthorized privilege immediately." },
  { id: "rule-token-expiry", name: "Integration token expiring", description: "OAuth or service credential expires within seven days.", severity: "medium", enabled: true, threshold: "7 days", defaultEmployee: "Sentinel", recommendation: "Reauthorize before business operations are interrupted." },
  { id: "rule-site-offline", name: "Website unavailable", description: "A registered brand website fails health checks.", severity: "high", enabled: true, threshold: "2 consecutive checks", defaultEmployee: "Sentinel", recommendation: "Confirm hosting, DNS, SSL, application status, and escalation to Orion." },
  { id: "rule-api-cost", name: "API spending spike", description: "Daily API cost materially exceeds recent baseline.", severity: "medium", enabled: true, threshold: "200% of baseline", defaultEmployee: "Sentinel", recommendation: "Review job volume, model choice, abuse, and budget controls." },
  { id: "rule-payment-webhook", name: "Payment webhook failure", description: "A Stripe or commerce webhook cannot be verified or processed.", severity: "high", enabled: true, threshold: "Any verified failure", defaultEmployee: "Sentinel", recommendation: "Preserve payload metadata, verify signature and endpoint health, and notify Michael P." },
  { id: "rule-code-change", name: "Production change without approval", description: "A production file or deployment changes without a linked approval.", severity: "critical", enabled: true, threshold: "Any event", defaultEmployee: "Sentinel", recommendation: "Contain deployment, preserve diffs, verify credentials, and escalate to Orion and CEO." },
  { id: "rule-document-delete", name: "Large or sensitive deletion", description: "Financial, customer, security, or company records are deleted.", severity: "high", enabled: true, threshold: "Sensitive record or bulk deletion", defaultEmployee: "Sentinel", recommendation: "Preserve audit history, verify approval, restore from backup if required." },
];

function seed(): SecurityState {
  const events: SecurityEvent[] = [
    { id: "event-royalos-login", brandId: "brand-triple-hay", platform: "RoyalOS", eventType: "authentication", actor: "Ayobami", action: "Signed in", target: "RoyalOS dashboard", result: "success", severity: "informational", source: "royalos_audit", evidence: "RoyalOS local session activity", createdAt: now },
    { id: "event-wordpress-fail", brandId: "brand-xena-grace", platform: "XenaGrace.com", eventType: "failed_login", actor: "Unknown", action: "Failed WordPress login", target: "Administrator account", result: "failure", severity: "high", source: "api_event", evidence: "Prototype event awaiting WordPress security connector", ipAddress: "masked", createdAt: now },
    { id: "event-token-expiry", brandId: "brand-choiceroyals", platform: "Instagram", eventType: "token_expiry", actor: "System", action: "Connection token requires review", target: "ChoiceRoyals Instagram", result: "warning", severity: "medium", source: "health_check", evidence: "Prototype connection-health event", createdAt: now },
  ];
  const alerts: SecurityAlert[] = [
    { id: "alert-wordpress-fail", brandId: "brand-xena-grace", title: "Review failed WordPress login", platform: "XenaGrace.com", severity: "high", status: "new", ruleId: "rule-failed-login", eventIds: ["event-wordpress-fail"], summary: "A failed administrator login event requires review. Full telemetry is not connected yet.", createdAt: now, updatedAt: now },
    { id: "alert-token-expiry", brandId: "brand-choiceroyals", title: "Instagram connection needs review", platform: "Instagram", severity: "medium", status: "new", ruleId: "rule-token-expiry", eventIds: ["event-token-expiry"], summary: "Connection-health data indicates that authorization should be checked.", createdAt: now, updatedAt: now },
  ];
  return { version: 1, events, alerts, incidents: [], rules: RULES, updatedAt: now };
}

export function loadSecurityState(): SecurityState {
  if (typeof window === "undefined") return seed();
  const raw = window.localStorage.getItem(SECURITY_STORAGE_KEY);
  if (!raw) return seed();
  try {
    const parsed = JSON.parse(raw) as Partial<SecurityState>;
    if (parsed.version !== 1) return seed();
    const base = seed();
    return { ...base, ...parsed, events: parsed.events ?? base.events, alerts: parsed.alerts ?? base.alerts, incidents: parsed.incidents ?? base.incidents, rules: parsed.rules ?? base.rules, version: 1 };
  } catch {
    return seed();
  }
}

export function saveSecurityState(state: SecurityState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SECURITY_STORAGE_KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
  window.dispatchEvent(new CustomEvent(SECURITY_EVENT));
}

export function assignAlertToSentinel(state: SecurityState, alertId: string): SecurityState {
  const alert = state.alerts.find((item) => item.id === alertId);
  if (!alert) return state;
  const existing = state.incidents.find((item) => item.alertId === alertId);
  const incident: SecurityIncident = existing ?? {
    id: `incident_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    brandId: alert.brandId,
    alertId: alert.id,
    title: alert.title,
    platform: alert.platform,
    severity: alert.severity,
    status: "investigating",
    assignedEmployee: "Sentinel",
    findings: "Sentinel has opened an investigation. Findings must be based on available evidence and connected telemetry.",
    evidence: alert.eventIds,
    actionsTaken: ["Alert accepted", "Evidence preservation started", "Related platform activity queued for review"],
    recommendations: ["Connect the platform security log or webhook for stronger visibility", "Review account access and recent changes", "Enable MFA where supported"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return {
    ...state,
    alerts: state.alerts.map((item) => item.id === alertId ? { ...item, status: "investigating", assignedEmployee: "Sentinel", updatedAt: new Date().toISOString() } : item),
    incidents: existing ? state.incidents : [incident, ...state.incidents],
  };
}


export function createAndAssignSecurityIssue(
  state: SecurityState,
  input: {
    brandId?: string;
    title: string;
    platform: string;
    summary: string;
    severity?: SecurityAlert["severity"];
    evidence?: string;
    ruleId?: string;
  },
): { state: SecurityState; alert: SecurityAlert; incident: SecurityIncident } {
  const createdAt = new Date().toISOString();
  const eventId = `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const alertId = `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const event: SecurityEvent = {
    id: eventId,
    brandId: input.brandId ?? "brand-triple-hay",
    platform: input.platform,
    eventType: "system_issue",
    actor: "RoyalOS System Care",
    action: input.title,
    target: input.platform,
    result: "warning",
    severity: input.severity ?? "high",
    source: "royalos_audit",
    evidence: input.evidence ?? input.summary,
    createdAt,
  };
  const alert: SecurityAlert = {
    id: alertId,
    brandId: event.brandId,
    title: input.title,
    platform: input.platform,
    severity: input.severity ?? "high",
    status: "new",
    ruleId: input.ruleId ?? "rule-system-runtime",
    eventIds: [eventId],
    summary: input.summary,
    createdAt,
    updatedAt: createdAt,
  };
  const withAlert: SecurityState = {
    ...state,
    events: [event, ...state.events],
    alerts: [alert, ...state.alerts],
    updatedAt: createdAt,
  };
  const assigned = assignAlertToSentinel(withAlert, alertId);
  const incident = assigned.incidents.find((item) => item.alertId === alertId);
  if (!incident) throw new Error("Sentinel incident could not be created.");
  return { state: assigned, alert: assigned.alerts.find((item) => item.id === alertId) ?? alert, incident };
}
