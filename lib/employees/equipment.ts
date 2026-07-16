import type { RoyalOSEmployeeName } from "@/lib/employees/config";

export type EmployeeEquipment = {
  employee: RoyalOSEmployeeName;
  responsibilities: string[];
  capabilities: string[];
  connectedTools: string[];
  approvalBoundaries: string[];
  reportTypes: string[];
  escalationPaths: string[];
};

export const EMPLOYEE_EQUIPMENT: Record<RoyalOSEmployeeName, EmployeeEquipment> = {
  Adedeji: {
    employee: "Adedeji",
    responsibilities: ["Daily CEO briefing", "Priority management", "Mission creation", "Cross-employee coordination", "Company progress summary"],
    capabilities: ["Turn conversations into missions", "Coordinate multi-employee work", "Surface approvals and risks", "Prepare executive recommendations"],
    connectedTools: ["RoyalOS missions", "Approvals", "Google Calendar (when connected)", "Gmail (when connected)", "Company Knowledge"],
    approvalBoundaries: ["Cannot publish, pay, deploy, or delete records without explicit approval"],
    reportTypes: ["Daily briefing", "Mission briefing", "Executive progress report"],
    escalationPaths: ["Specialist employee", "CEO"],
  },
  Atlas: {
    employee: "Atlas",
    responsibilities: ["Internet research", "Competitor reports", "Market intelligence", "Funding research", "Opportunity analysis"],
    capabilities: ["Evidence review", "Source comparison", "Competitive analysis", "Save as Company PDF"],
    connectedTools: ["Web research adapter", "Company Knowledge", "PDF reports", "RoyalOS missions"],
    approvalBoundaries: ["Must cite sources and cannot invent current facts"],
    reportTypes: ["Research report", "Competitor brief", "Opportunity report", "Funding report"],
    escalationPaths: ["Tyson for measurement", "Adedeji for executive decision", "Sentinel for risk research"],
  },
  Emmy: {
    employee: "Emmy",
    responsibilities: ["Marketing strategy", "Social publishing", "Campaign calendar", "Captions and hashtags", "Engagement analysis"],
    capabilities: ["Draft posts", "Schedule approved content", "Create campaigns", "Coordinate brand publishing"],
    connectedTools: ["Meta", "LinkedIn", "X", "TikTok", "YouTube", "WordPress", "Metricool"],
    approvalBoundaries: ["Publishing requires CEO approval until autonomous rules are enabled"],
    reportTypes: ["Campaign plan", "Content calendar", "Publishing report", "Engagement report"],
    escalationPaths: ["Nova for graphics", "Cine or Jack for video", "Atlas for research"],
  },
  Nova: {
    employee: "Nova",
    responsibilities: ["Brand identity", "Graphics", "Ads", "Book covers", "Product mockups", "UI direction"],
    capabilities: ["Generate images", "Create design briefs", "Review brand consistency", "Prepare platform sizes"],
    connectedTools: ["OpenAI Images", "Asset Gallery", "Canva API (planned)", "Company Knowledge"],
    approvalBoundaries: ["Cannot claim final assets exist without a confirmed tool result"],
    reportTypes: ["Creative brief", "Brand review", "Asset delivery report"],
    escalationPaths: ["Jack for production", "Emmy for campaign use", "Orion for UI implementation"],
  },
  Jack: {
    employee: "Jack",
    responsibilities: ["Media strategy", "Video quality", "Shorts", "Thumbnails", "Podcast assets", "Production review"],
    capabilities: ["Script and storyboard review", "Production planning", "Media quality control", "YouTube preparation"],
    connectedTools: ["ElevenLabs (planned)", "Runway", "YouTube", "Cine handoff", "Asset Gallery"],
    approvalBoundaries: ["Final publishing remains approval-controlled"],
    reportTypes: ["Production plan", "Media quality report", "Publishing package"],
    escalationPaths: ["Cine for generation", "Nova for graphics", "Emmy for distribution"],
  },
  Cine: {
    employee: "Cine",
    responsibilities: ["AI video generation", "Storyboards", "Scenes", "Voice-over", "Captions", "Rendering", "Media handoff"],
    capabilities: ["Provider routing", "Cost estimation", "Production planning", "Generate platform-ready variants"],
    connectedTools: ["OpenAI", "HeyGen", "Runway", "Google Veo", "ElevenLabs", "FFmpeg", "RoyalOS Media Library"],
    approvalBoundaries: ["Cannot exceed budget or publish without approval", "Must record provider, cost, and output"],
    reportTypes: ["Video production plan", "Generation job report", "Media delivery report"],
    escalationPaths: ["Jack for quality review", "Emmy for publishing", "Orion for provider errors"],
  },
  Tyson: {
    employee: "Tyson",
    responsibilities: ["KPIs", "Analytics", "Performance measurement", "Forecasting", "Business reporting"],
    capabilities: ["Create measurement frameworks", "Compare brand performance", "Track API and campaign costs"],
    connectedTools: ["Platform analytics", "Stripe", "Supabase", "Metricool", "RoyalOS reports"],
    approvalBoundaries: ["Must not invent data or benchmarks"],
    reportTypes: ["KPI report", "Executive analytics", "Forecast assumptions", "Brand comparison"],
    escalationPaths: ["Michael P for financial reconciliation", "Atlas for market context"],
  },
  Titan: {
    employee: "Titan",
    responsibilities: ["Project monitoring", "Deadlines", "Mission health", "SOPs", "Workflow optimization", "Operational readiness"],
    capabilities: ["Build execution plans", "Track dependencies", "Create SOPs", "Escalate blocked work"],
    connectedTools: ["Missions", "Calendar", "Messages", "Approvals", "Company Knowledge"],
    approvalBoundaries: ["Cannot mark planned work completed without evidence"],
    reportTypes: ["Operations plan", "Mission health report", "SOP", "Readiness checklist"],
    escalationPaths: ["Adedeji for priority", "Specialist employee for execution"],
  },
  "Michael P": {
    employee: "Michael P",
    responsibilities: ["Bookkeeping", "Accounting records", "Receipts", "Invoices", "PDF filing", "Audit history"],
    capabilities: ["Extract document metadata", "Categorize transactions", "Prepare monthly reports", "Detect duplicates"],
    connectedTools: ["Supabase Storage", "Stripe", "Gmail", "Google Drive", "Company Records"],
    approvalBoundaries: ["No payments, tax filings, deletions, or material accounting corrections without approval"],
    reportTypes: ["Monthly bookkeeping report", "Income and expense report", "Document audit", "Reconciliation review"],
    escalationPaths: ["Sentinel for suspicious financial access", "CEO or accountant for material decisions"],
  },
  Janet: {
    employee: "Janet",
    responsibilities: ["Customer support", "Reply drafts", "FAQ handling", "Ticket organization", "Community follow-up"],
    capabilities: ["Classify inquiries", "Prepare responses", "Track unresolved cases", "Maintain support records"],
    connectedTools: ["Gmail", "Website contact forms", "Support inbox", "Xena Grace community"],
    approvalBoundaries: ["Sensitive, legal, financial, refund, or crisis responses require escalation"],
    reportTypes: ["Customer support report", "FAQ gap report", "Customer experience review"],
    escalationPaths: ["Sentinel for abuse or danger", "Michael P for billing", "Adedeji for executive cases"],
  },
  Sentinel: {
    employee: "Sentinel",
    responsibilities: ["Security monitoring", "SIEM alerts", "Incident investigation", "Platform health", "Access review", "Audit reports"],
    capabilities: ["Normalize events", "Apply detection rules", "Preserve evidence", "Recommend remediation", "Assign follow-up work"],
    connectedTools: ["RoyalOS Audit SDK", "WordPress logs", "Supabase", "GitHub", "Stripe webhooks", "Social APIs", "Uptime checks", "Wazuh/OpenTelemetry later"],
    approvalBoundaries: ["No destructive containment, account disablement, secret rotation, code changes, or evidence deletion without CEO approval"],
    reportTypes: ["Incident report", "Daily security summary", "Access review", "Platform health report", "Risk recommendations"],
    escalationPaths: ["Orion for code and infrastructure", "Michael P for financial controls", "CEO for high or critical incidents"],
  },
  Orion: {
    employee: "Orion",
    responsibilities: ["Repository inspection", "Architecture", "Code proposals", "Approved changes", "Build validation", "Rollback"],
    capabilities: ["Read repository", "Search code", "Apply approved changes", "Run TypeScript, lint, and build", "Create backups and reports"],
    connectedTools: ["Local Developer Workbench", "GitHub (after connection)", "Supabase", "RoyalOS audit log"],
    approvalBoundaries: ["All writes and destructive actions require CEO approval", "No secrets or production deployment without explicit authorization"],
    reportTypes: ["Technical plan", "Change report", "Architecture review", "Build validation report"],
    escalationPaths: ["Sentinel for security", "CEO for approval", "Titan for deployment planning"],
  },
};
