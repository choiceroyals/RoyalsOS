export type SystemCheckStatus = "pass" | "warning" | "fail" | "not_run";

export type SystemCheck = {
  id: string;
  label: string;
  status: SystemCheckStatus;
  detail: string;
  remediation?: string;
  checkedAt: string;
};

export type SystemMaintenanceLog = {
  id: string;
  action: string;
  status: "success" | "warning" | "error";
  summary: string;
  detail?: string;
  createdAt: string;
};

export type RestorePoint = {
  id: string;
  path: string;
  createdAt: string;
  fileCount: number;
};

export type SystemMaintenanceSnapshot = {
  engine: "active" | "attention";
  connected: boolean;
  projectRoot: string;
  appVersion: string;
  nodeVersion: string;
  checks: SystemCheck[];
  logs: SystemMaintenanceLog[];
  restorePoints: RestorePoint[];
  lastScanAt: string;
};

export type SystemMaintenanceAction =
  | "quick_scan"
  | "verify_code"
  | "safe_repair"
  | "clear_build_cache"
  | "repair_dependencies"
  | "create_restore_point"
  | "restore_last"
  | "generate_report";
