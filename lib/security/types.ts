export type SecuritySeverity = "informational" | "low" | "medium" | "high" | "critical";
export type SecurityEventSource = "full_log" | "api_event" | "webhook" | "royalos_audit" | "health_check";
export type SecurityAlertStatus = "new" | "assigned" | "investigating" | "resolved" | "false_positive";
export type SecurityIncidentStatus = "open" | "investigating" | "awaiting_approval" | "contained" | "resolved";

export type SecurityEvent = {
  id: string;
  brandId: string;
  platform: string;
  eventType: string;
  actor: string;
  action: string;
  target: string;
  result: "success" | "failure" | "warning";
  severity: SecuritySeverity;
  source: SecurityEventSource;
  evidence: string;
  ipAddress?: string;
  createdAt: string;
};

export type SecurityAlert = {
  id: string;
  brandId: string;
  title: string;
  platform: string;
  severity: SecuritySeverity;
  status: SecurityAlertStatus;
  ruleId: string;
  eventIds: string[];
  summary: string;
  assignedEmployee?: string;
  createdAt: string;
  updatedAt: string;
};

export type SecurityIncident = {
  id: string;
  brandId: string;
  alertId: string;
  title: string;
  platform: string;
  severity: SecuritySeverity;
  status: SecurityIncidentStatus;
  assignedEmployee: string;
  findings: string;
  evidence: string[];
  actionsTaken: string[];
  recommendations: string[];
  escalation?: string;
  createdAt: string;
  updatedAt: string;
};

export type SecurityRule = {
  id: string;
  name: string;
  description: string;
  severity: SecuritySeverity;
  enabled: boolean;
  threshold: string;
  defaultEmployee: string;
  recommendation: string;
};

export type SecurityState = {
  version: 1;
  events: SecurityEvent[];
  alerts: SecurityAlert[];
  incidents: SecurityIncident[];
  rules: SecurityRule[];
  updatedAt: string;
};
