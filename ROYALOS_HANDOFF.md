# RoyalOS Project Handoff

Updated: 2026-07-14

## Purpose

This package contains the current RoyalOS Next.js and TypeScript source code. Treat the packaged files as the latest source of truth for the next development session.

The package intentionally excludes:

- `node_modules`
- `.next`
- Git data
- real `.env` files
- API keys, passwords, recovery codes, and access tokens
- unrelated personal files and large media

Use `.env.example` only as a variable-name template. Keep real credentials in `.env.local` on the development computer.

## Current architecture

- Main dashboard and integrated work surfaces: `app/page.tsx`
- Main dashboard styles: `app/page.module.css`
- API routes: `app/api`
- Shared employee model: `lib/employees/config.ts`
- Integration registry and status engine: `lib/integrations`
- Mission orchestration: `lib/orchestrator`
- Mission types and persistence: `lib/missions`
- Dashboard components: `components/dashboard`
- Company and employee knowledge: `Knowledge`
- Supabase helpers: `lib/supabase` and `utils`

## Current employees

- Adedeji — Executive Assistant and Chief of Staff
- Atlas — Research and Business Intelligence
- Emmy — Marketing and Content Strategy
- Nova — Creative Direction
- Jack — Media and Video Production leadership
- Cine — Director of AI Video Production
- Tyson — Data and Business Intelligence
- Titan — Operations
- Michael P — Chief Bookkeeping, Accounting & Records Officer
- Janet — Customer Experience
- Orion — Technology and AI Systems; approval-controlled local developer employee
- Ifeoluwa — Private CEO adviser

## Work completed

### Shared employee configuration

Cine and Michael P are part of the canonical employee list in `lib/employees/config.ts`. Michael P replaces the former employee name `Ledger` throughout active source code.

### Ifeoluwa conversation history

Ifeoluwa supports multiple browser-persistent conversations in `app/page.tsx`.

- `New chat` creates a new conversation without deleting the old conversation.
- Previous chats appear in a history panel.
- A previous chat can be reopened and continued.
- Conversation titles are generated from the first user message.
- The old single-chat localStorage format is migrated automatically.
- Supabase synchronization is still future work.

### Cine Video Studio

Files:

- `components/dashboard/CineVideoStudio.tsx`
- `components/dashboard/CineVideoStudio.module.css`
- `app/api/cine/route.ts`
- `lib/cine/config.ts`
- `Knowledge/employees/cine.md`

Current capability:

- Accept video instructions and production options.
- Prepare structured production plans and storyboards.
- Detect configured provider keys.
- Use OpenAI planning when available or a safe local template when unavailable.
- Send a production plan into Emmy's publishing queue with `awaiting_media` status.
- Open the new Connections Center from the Cine page.

Real video generation, polling, cost capture, rendering, and final media storage still require provider adapters.

### Michael P Records Center

Files:

- `components/dashboard/MichaelPRecordsCenter.tsx`
- `components/dashboard/MichaelPRecordsCenter.module.css`
- `lib/finance/michaelP.ts`
- `Knowledge/employees/michael-p.md`

The page defines the records workspace, company folders, and safety rules. Private document upload, extraction, transaction persistence, duplicate detection, reconciliation, and PDF reporting remain locked until secure Supabase storage and audit tables are implemented.


### Core Operations Pack

Files:

- `components/dashboard/CoreOperationsCenter.tsx`
- `components/dashboard/CoreOperationsCenter.module.css`
- `lib/core-operations/types.ts`
- `lib/core-operations/seed.ts`
- `lib/core-operations/storage.ts`
- `supabase/migrations/20260714_core_operations_foundation.sql`
- `Knowledge/system/core-operations-engine.md`

Current capability:

- Replaces the Workspaces, Missions, Approvals, Knowledge, Memory, Messages, Analytics, and Settings placeholders.
- Provides typed local records and browser persistence.
- Creates workspaces and missions, processes approvals, indexes knowledge metadata, stores memories, handles internal messages, calculates operational analytics, and saves organization settings.
- Exports a JSON company-data backup.
- Includes a review-first Supabase multi-organization schema with RLS enabled and no public access policies.

Important boundary:

- Local persistence is for internal development only. Secure multi-user storage, organization membership, RLS policies, file storage, and connected analytics still require implementation.

### Orion Local Developer Edition

Files:

- `components/dashboard/OrionDeveloperWorkbenchShell.tsx`
- `components/dashboard/OrionDeveloperWorkbench.tsx`
- `components/dashboard/OrionCodeProposal.tsx`
- `components/dashboard/OrionOperationsHistory.tsx`
- `app/api/developer/inspect/route.ts`
- `app/api/developer/search/route.ts`
- `app/api/developer/plan/route.ts`
- `app/api/developer/propose/route.ts`
- `app/api/developer/apply/route.ts`
- `app/api/developer/rollback/route.ts`
- `app/api/developer/validate/route.ts`
- `app/api/developer/history/route.ts`
- `app/api/developer/health/route.ts`
- `lib/developer/local-runtime.ts`
- `lib/developer/executor.ts`
- `lib/developer/validation.ts`

Current capability:

- Inspects and searches the approved repository.
- Creates implementation plans and complete-file code proposals.
- Registers a six-hour one-time approval token for each proposal.
- Requires the CEO to type `APPROVE` exactly before any write.
- Verifies proposal integrity and target-file SHA-256 hashes.
- Blocks protected paths and proposed content that appears to contain secrets.
- Creates timestamped backups and performs atomic file writes.
- Runs only `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
- Can automatically roll back on failure and manually roll back after exact `ROLLBACK` approval.
- Stores local transaction and audit history.

Boundaries:

- No arbitrary terminal commands.
- No package installation.
- No deployment or production access.
- No Git commits, branches, or pull requests until the later Git integration phase.
- No unattended file changes.

### Official company PDF records

Files:

- `components/reports/SaveCompanyPdfButton.tsx`
- `components/reports/CompanyRecordsLibrary.tsx`
- `app/api/reports/company-pdf/route.ts`
- `lib/reports/pdf.ts`
- `lib/reports/company-records.ts`
- `supabase/migrations/20260714_orion_company_records.sql`

Current capability:

- Converts substantial Ifeoluwa responses and executive briefings into branded PDF records.
- Preserves the original JSON alongside the PDF.
- Saves title, workspace, employee, mission, conversation, tags, sources, version, and timestamps.
- Uses Supabase Storage and the company-record table when configured.
- Uses a local development fallback when Supabase is unavailable.
- Displays searchable records inside Michael P's Records Center.


### Connections & Publishing Center

Files:

- `components/dashboard/IntegrationsCenter.tsx`
- `components/dashboard/IntegrationsCenter.module.css`
- `app/api/integrations/route.ts`
- `lib/integrations/config.ts`
- `lib/integrations/types.ts`
- `lib/integrations/client.ts`
- `lib/integrations/server.ts`
- `Knowledge/system/integration-engine.md`

Current capability:

- Adds `Connections` to the left navigation.
- Represents Facebook, Instagram, LinkedIn, X, TikTok, YouTube, WordPress, Metricool, Gmail, Google Drive, Google Calendar, Stripe, Printful, GitHub, Supabase, and a DistroKid planning workflow.
- Reads server-side environment readiness without exposing secret values.
- Shows `Connected`, `Credentials ready`, `Not configured`, and `Planned` states.
- Shows required environment variable names and planned callback paths.
- Displays employee access, capabilities, and approval rules.
- Provides an Emmy publishing queue with draft, awaiting media, awaiting approval, approved, and scheduled states.
- Supports manual draft creation and Cine-to-Emmy handoff.
- Stores the current development queue and activity log in browser localStorage.

Important boundary:

- No account is falsely marked connected without a detected server-side credential or token.
- OAuth authorization, state validation, callback handling, encrypted token persistence, provider health checks, actual scheduling, actual publishing, provider result storage, and analytics retrieval are not yet implemented.
- The Publish button remains disabled until a real provider adapter is connected.

## Tool and permission expansion

`lib/tools/types.ts` now includes additional providers and capabilities needed for planned social, media, document, finance, and integration tools. No new external action is enabled merely by adding these types.

## Validation completed

- `npx tsc --noEmit` passes.
- `npm run build` passes without requiring placeholder Supabase values after lazy server-client initialization was added.
- The build includes `/api/integrations`.
- The remaining warning is the existing Turbopack tracing warning from Orion developer security code.

The source now builds without `.env.local`; live Supabase features still require the user's private local configuration at runtime.

## Exact next development steps

1. Test Orion against several real but low-risk RoyalOS changes before moving the repository to Git.
2. Move Core Operations and Ifeoluwa conversation history to authenticated Supabase tables with organization membership and RLS policies.
3. Complete Adedeji's daily executive briefing, task prioritization, reminders, and employee coordination.
4. Build the reusable employee handoff button for chats, tasks, and missions.
5. Select the first social provider and build its OAuth start route, callback route, state validation, encrypted token storage, and health check.
6. Connect Emmy's approved publishing queue to that provider and store the external post ID, response, timestamp, and audit event.
7. Build Cine's first real video provider adapter, job persistence, polling, cost limits, output storage, and final media handoff.
8. Build Michael P's private document intake, extraction, review queue, bookkeeping tables, audit events, and monthly PDFs.
9. Add workspace-specific roles, permissions, approval thresholds, and API cost tracking.

## Safety rules

- Never commit or upload `.env.local`.
- Never place provider API keys or OAuth secrets in browser code.
- Never report an external action as complete without a confirmed provider response.
- External publishing stays approval controlled until the CEO explicitly enables a trusted autonomous permission.
- Cine must not claim generation, storage, or publishing without confirmed tool results.
- Michael P must preserve originals and must not make payments, submit taxes, delete records, or finalize material corrections without CEO approval.

## Product roadmap

The approved Phase 2–6 roadmap is stored in `ROYALOS_PRODUCT_ROADMAP.md`.

## 2026-07-15 — Brand, Security, Employee & Connections Pack

The latest source now contains:

- Brand Directory and full brand profiles.
- Premium ChoiceRoyals identity and logo asset.
- Global brand switcher and per-brand context.
- Separate per-brand social, website, Metricool, commerce, and developer connection records.
- OAuth start/callback foundation for Meta, Google, LinkedIn, X, TikTok, and GitHub.
- Encrypted Supabase credential vault.
- Full Employee Directory and direct task assignment.
- Sentinel and Security & Audit Center.
- Security-event ingestion and persistence foundation.
- Curated senior employees on the dashboard.
- Private/collapsible Ifeoluwa dashboard chat.

Use `ROYALOS_API_AND_CONNECTION_SETUP.md` for provider credentials and callback registration. The packaged `.env.example` contains variable names only; real secrets remain in the owner's private `.env.local`.

---

## RoyalOS V3 plugin-platform update — 2026-07-15

The package now includes a native Plugin Marketplace and WordPress-style RoyalOS plugin ZIP upload flow. Compatible packages register capabilities, employee assignments, permissions, required environment variables, and safe actions without manually changing `app`, `components`, or `lib` files.

New primary files:

- `components/dashboard/PluginMarketplace.tsx`
- `lib/plugins/catalog.ts`
- `lib/plugins/schema.ts`
- `lib/plugins/storage.ts`
- `lib/plugins/types.ts`
- `app/api/plugins/route.ts`
- `app/api/plugins/upload/route.ts`
- `app/api/plugins/action/route.ts`
- `ROYALOS_V3_PLUGIN_DEVELOPER_GUIDE.md`
- `examples/plugins/ROYALOS_EXAMPLE_BUSINESS_RESEARCH_PLUGIN.zip`

The package also repairs the Core Operations navigation/storage feedback loop, adds Michael P's Drive-style records workspace, threaded employee messages, an Ifeoluwa conversation sidebar, Nova reference-image generation, and employee plugin-capability visibility.

See `ROYALOS_V3_PLUGIN_PLATFORM_HANDOFF.md` for completed scope, boundaries, and next hardening work.
