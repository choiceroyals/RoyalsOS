export type CoreOperationsSection =
  | "Workspaces"
  | "Missions"
  | "Approvals"
  | "Knowledge"
  | "Memory"
  | "Messages"
  | "Analytics"
  | "Settings";

export type WorkspaceStatus = "Active" | "Paused" | "Archived";
export type MissionStatus = "Planning" | "In Progress" | "Blocked" | "Review" | "Completed";
export type MissionPriority = "Low" | "Normal" | "High" | "Critical";
export type ApprovalStatus = "Pending" | "Approved" | "Changes Requested" | "Rejected";
export type KnowledgeStatus = "Indexed" | "Processing" | "Draft";
export type MessageKind = "Employee" | "System" | "Customer" | "Mission";

export type WorkspaceRecord = {
  id: string;
  name: string;
  type: string;
  description: string;
  status: WorkspaceStatus;
  accent: string;
  memberCount: number;
  missionCount: number;
  documentCount: number;
  createdAt: string;
};

export type MissionRecord = {
  id: string;
  title: string;
  workspaceId: string;
  description: string;
  leadEmployee: string;
  supportingEmployees: string[];
  priority: MissionPriority;
  status: MissionStatus;
  progress: number;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
};

export type ApprovalRecord = {
  id: string;
  title: string;
  kind: string;
  workspaceId: string;
  requestedBy: string;
  summary: string;
  status: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
  sourceType?: string;
  sourceId?: string;
  targetEmployee?: string;
  metadata?: Record<string, unknown>;
};

export type KnowledgeDocumentRecord = {
  id: string;
  title: string;
  workspaceId: string;
  category: string;
  source: string;
  status: KnowledgeStatus;
  access: string[];
  notes: string;
  updatedAt: string;
};

export type MemoryRecord = {
  id: string;
  title: string;
  workspaceId: string;
  kind: string;
  source: string;
  content: string;
  pinned: boolean;
  createdAt: string;
};

export type MessageRecord = {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  workspaceId: string;
  kind: MessageKind;
  createdAt: string;
  read: boolean;
  threadId?: string;
  parentId?: string;
  status?: "Delivered" | "Acknowledged" | "Working" | "Completed" | "Closed";
  actionRequired?: boolean;
  missionId?: string;
  attachmentNames?: string[];
};

export type CoreOperationsSettings = {
  companyName: string;
  founderName: string;
  defaultWorkspaceId: string;
  approvalRequired: boolean;
  socialPublishingApproval: boolean;
  accountingApproval: boolean;
  apiMonthlyBudget: number;
  notificationsEnabled: boolean;
  autoBackupEnabled: boolean;
  dataRegion: string;
};

export type CoreOperationsState = {
  version: 1;
  workspaces: WorkspaceRecord[];
  missions: MissionRecord[];
  approvals: ApprovalRecord[];
  knowledge: KnowledgeDocumentRecord[];
  memories: MemoryRecord[];
  messages: MessageRecord[];
  settings: CoreOperationsSettings;
  updatedAt: string;
};
