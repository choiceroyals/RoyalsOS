# RoyalOS Product Roadmap

Updated: July 14, 2026

This roadmap defines the planned development path for RoyalOS after the current Cine, Michael P, and Ifeoluwa history update.

## Phase 2 — Employee Intelligence

**Current priority**

This phase turns RoyalOS employees from visual dashboard profiles into useful, connected workers with clear responsibilities, tools, memory, and mission execution.

### 1. Adedeji — CEO Assistant

**Status:** Next

Responsibilities:

- Prepare a daily executive briefing
- Prioritize tasks and decisions
- Create and coordinate missions
- Remind the CEO about important items
- Coordinate work across employees
- Summarize company progress
- Surface approvals, risks, deadlines, and unfinished work

### 2. Emmy — Marketing Director

Planned connections:

- Facebook
- Instagram
- LinkedIn
- X
- TikTok
- YouTube
- WordPress

Capabilities:

- Write social posts
- Generate captions
- Schedule content
- Build campaign calendars
- Suggest hashtags
- Analyze engagement
- Receive finished assets directly from Cine, Jack, and Nova

### 3. Jack — Media Director

Planned connections:

- ElevenLabs
- Runway
- CapCut workflow
- YouTube Studio

Capabilities:

- Produce videos
- Produce short-form content
- Generate thumbnails
- Prepare podcast assets
- Review media quality and production standards
- Oversee Cine output before publishing when approval is required

### 4. Cine — Director of AI Video Production

Current development focus:

- Dedicated Cine Video Studio page
- Prompt-to-storyboard workflow
- Provider selection and routing
- Video generation jobs and progress tracking
- Voice-over, captions, music, and thumbnails
- RoyalOS Asset Gallery storage
- Direct handoff to Jack, Emmy, and the social publishing workflow
- Economy, Balanced, and Premium cost modes
- Per-project cost estimates and spending limits

Planned providers include OpenAI video services, Runway, HeyGen, Google Veo, ElevenLabs, and other approved APIs. Provider support should remain modular so RoyalOS can select or replace services without changing the Cine user experience.

### 5. Nova — Creative Director

Planned connections:

- OpenAI Images
- Canva API later

Capabilities:

- Generate graphics
- Create logos
- Create advertisements
- Create book covers
- Create product mockups
- Prepare campaign assets for Emmy and Cine

### 6. Atlas — Research and Business Intelligence

Capabilities:

- Internet research
- Competitor reports
- Market intelligence
- Business opportunity research
- Funding research
- Source-backed executive summaries
- Save approved research as branded, searchable company PDFs

### 7. Janet — Customer Success

Planned connections:

- Gmail
- Website contact forms
- Support inbox

Capabilities:

- Prepare reply drafts
- Handle frequently asked questions
- Organize support tickets
- Escalate sensitive or uncertain issues
- Maintain customer communication records

### 8. Tyson — Business Operations

Responsibilities:

- Generate standard operating procedures
- Maintain company documentation
- Improve workflows
- Produce business reports
- Document repeatable processes

### 9. Titan — Operations

Responsibilities:

- Monitor projects
- Track deadlines
- Monitor missions
- Track team and system health
- Flag blocked or delayed work

### 10. Michael P — Chief Bookkeeping, Accounting & Records Officer

Current development focus:

- Organize income, expenses, receipts, invoices, and transactions
- Maintain searchable company records
- Create financial and operational PDFs
- Store source documents without overwriting originals
- Categorize records and flag uncertain items for review
- Produce monthly summaries and profit-and-loss preparation
- Maintain audit history and approval records
- Create a structured company filing cabinet

Safety boundaries:

- Do not silently make payments
- Do not submit tax filings without explicit approval
- Do not delete original records
- Do not finalize uncertain accounting corrections without review
- Keep a visible audit trail for every material change

### 11. Orion — Developer

Local developer edition completed for approval-controlled work:

- Read and search the repository
- Plan changes and review architecture
- Generate complete-file code proposals
- Apply approved local file changes
- Create backups and rollback transactions
- Run TypeScript, lint, and build validation
- Record transaction and audit history

Next after Git migration:

- Create branches and commits
- Generate pull requests
- Review CI results before merge
- Preserve CEO approval for merge and deployment
- Identify risks and regressions
- Maintain technical documentation and handoff records

### Core Operations Pack implemented — July 14, 2026

RoyalOS now includes interactive foundations for:

- Workspaces
- Missions
- Approvals
- Knowledge
- Memory
- Messages
- Analytics
- Settings

These modules use typed browser persistence for immediate internal testing and include a review-first Supabase schema foundation. Secure multi-user storage, organization membership, Row Level Security policies, private file upload, and external analytics remain future work.

### Shared Phase 2 foundations

- Canonical employee registry
- Employee permissions and tool access
- Persistent employee memory
- ChatGPT-style conversation history
- Employee handoff button on chat, task, and mission pages
- Shared mission and task context
- Approval workflow
- Audit log
- Company document storage
- Asset Gallery and media library
- Cost tracking for external APIs

## Phase 3 — Company Integrations

### Foundation implemented — July 14, 2026

RoyalOS now includes a Connections & Publishing Center with:

- A canonical registry for social and company integrations
- Safe server-side environment readiness checks
- Connection statuses that do not expose secret values
- Employee access and approval rules
- An Emmy publishing queue with draft and CEO approval states
- Cine-to-Emmy production-plan handoff
- A local development activity log
- Workspace selection and provider setup guidance

This foundation does not yet perform provider OAuth consent, encrypted token persistence, live posting, scheduling, or analytics retrieval. Those features require provider developer applications, callback handlers, Supabase token storage, and provider-specific adapters.

Connect RoyalOS to:

- WordPress
- GitHub
- Google Drive
- Gmail
- Google Calendar
- Supabase
- Stripe
- Printful
- DistroKid
- Metricool
- YouTube
- Meta
- TikTok

When this phase is complete, RoyalOS becomes the central operating system for the businesses instead of only a dashboard.

Integration requirements:

- Secure server-side credentials
- Workspace-specific connections
- Permission controls
- Connection health checks
- Activity and error logs
- Retry and fallback handling
- Human approval for high-impact actions

## Phase 4 — Autonomous Workforce

Employees begin completing repeatable work with minimal supervision.

Examples:

- Emmy publishes approved social content automatically
- Janet answers routine customer emails
- Atlas sends scheduled competitor reports
- Orion reviews code before deployment
- Jack produces short-form media
- Nova creates graphics from campaign briefs
- Michael P processes records and prepares review-ready bookkeeping reports
- Cine generates and hands off approved video assets

Autonomy must be controlled by:

- Clear permissions
- Spending limits
- Approval thresholds
- Audit logs
- Reversible actions where possible
- Escalation rules

## Phase 5 — Mission System 2.0

Every assignment becomes a mission with employees, dependencies, approvals, files, costs, and outcomes.

Example mission: **Launch a new Xena Grace song**

Automatic assignments:

- Emmy — marketing plan and publishing calendar
- Nova — artwork and graphics
- Cine — music video, lyric video, and short-form versions
- Jack — media review and production oversight
- Atlas — audience and competitor research
- Janet — customer and community communication
- Michael P — campaign expense and income records
- Titan — progress and deadline tracking
- Adedeji — executive updates and final coordination

Mission System 2.0 goals:

- No manual coordination for standard workflows
- Reusable mission templates
- Dependency tracking
- Cross-employee handoffs
- Approval gates
- Cost and API usage tracking
- Final mission report and archived company record

## Phase 6 — Public Release

After successful internal testing, prepare RoyalOS for other businesses.

Planned capabilities:

- Team management
- Multi-user login
- Organizations and workspaces
- Roles and permissions
- Billing
- Public API
- Integration marketplace
- Mobile applications
- RoyalOS Cloud
- Onboarding, support, and documentation

This is the stage where RoyalOS moves from an internal ChoiceRoyals operating system into a commercial platform.

## Current execution order

1. Stabilize the current full source package and preserve it as the working source of truth.
2. Move Ifeoluwa conversation history from browser storage to authenticated Supabase storage.
3. Complete Adedeji's daily briefing, prioritization, reminders, and employee coordination workflow.
4. Build the reusable employee handoff button for chats, tasks, and missions.
5. Connect the first real social OAuth adapter and encrypted token persistence in the Connections Center.
6. Connect Emmy's approved publishing queue to one provider, then add scheduling and provider result storage.
7. Build Cine's first real video-generation adapter, job polling, cost capture, asset storage, and final media handoff.
8. Build Michael P's private document intake, extraction, review queue, bookkeeping records, and PDF reporting.
9. Add shared Supabase audit history, approvals, workspace permissions, and API cost tracking.
10. Expand the remaining employee intelligence and Phase 3 integrations one controlled adapter at a time.

## Current implementation milestone — Brand, Security & Workforce Foundation

Completed foundations:

- Brand Directory, brand profiles, premium brand identity, and global brand switching.
- Per-brand connection records and separate Metricool configuration.
- Employee Directory, clickable profiles, direct task assignment, and employee equipment maps.
- Sentinel lightweight SIEM interface, incidents, reports, and security-event ingestion.
- Dashboard privacy and workforce de-cluttering.

Next execution priorities:

1. Complete provider developer-app registration and OAuth consent for each brand.
2. Implement and test provider-specific publishing and analytics adapters one platform at a time.
3. Persist brand, mission, security, employee, and publishing state fully in Supabase with authenticated organization membership.
4. Add webhook verification and token-refresh jobs.
5. Connect website security logs and uptime/SSL monitoring to Sentinel.
6. Complete multi-company isolation before public release.
