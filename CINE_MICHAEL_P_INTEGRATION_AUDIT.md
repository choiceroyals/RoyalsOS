# Cine and Michael P Integration Audit

## Source of truth reviewed

- `ROYALOS_HANDOFF.md`
- `ROYALOS_FILE_INVENTORY.txt`
- `ROYALOS_OMITTED_LARGE_MEDIA.txt`
- Packaged RoyalOS source tree

## Shared employee configuration completed

A new shared registry now lives at:

- `lib/employees/config.ts`

It defines:

- the canonical employee-name union
- full and short roles
- departments
- dashboard status and assignment text
- avatar paths and fallback initials
- mission-routing descriptions
- departmental assignment focus
- employee safety and quality standards
- shared lookup maps and validators

Cine and Michael P are now part of the canonical employee list.

## Files updated in this pass

- `lib/employees/config.ts` — new canonical registry
- `lib/missions/types.ts` — employee type and validation now come from the registry
- `lib/brain.ts` — routing schema and employee directory now include Cine and Michael P
- `lib/orchestrator/employeeRunner.ts` — shared roles and standards
- `lib/orchestrator/mission.ts` — shared roles, assignment focus, and deliverable matching
- `lib/orchestrator/mergeReports.ts` — shared roles
- `lib/knowledgeIndex.ts` — knowledge indexing recognizes Cine and Michael P
- `app/api/royalos/route.ts` — gateway employee list comes from the registry
- `app/api/emmy/route.ts` — mission API employee validation and roles come from the registry
- `app/page.tsx` — dashboard, selectors, call center, and workforce cards come from the registry

## Validation completed

- `npx tsc --noEmit` passes.

## Employee surfaces inspected

### Types and validation

- `lib/missions/types.ts`
- `lib/brain.ts`
- `app/api/emmy/route.ts`
- `app/api/royalos/route.ts`
- `app/api/missions/route.ts`

### Mission routing and collaboration

- `lib/orchestrator/mission.ts`
- `lib/orchestrator/employeeRunner.ts`
- `lib/orchestrator/mergeReports.ts`
- `lib/orchestrator/teamCoordinator.ts`
- `lib/orchestrator/executiveSynthesizer.ts`

### Knowledge and memory

- `lib/knowledgeIndex.ts`
- `lib/knowledge.ts`
- `lib/memory/*`

### Tool registry and permissions

- `lib/tools/types.ts`
- `lib/tools/registry.ts`
- `lib/tools/permissions.ts`
- `lib/tools/executor.ts`
- `lib/tools/builtins/openai-image-tool.ts`
- `app/api/tools/images/route.ts`
- `app/api/tools/images/assets/route.ts`
- `app/api/tools/images/assets/upload/route.ts`

### User interface and work surfaces

- `app/page.tsx`
- `components/dashboard/NovaImageStudio.tsx`
- `components/dashboard/RoyalOSAssetGallery.tsx`
- `components/dashboard/OrionDeveloperWorkbench*.tsx`

The current package keeps Chat, Tasks, Missions, workforce cards, and most dashboard surfaces inside `app/page.tsx`; there are not yet separate general-purpose Chat or Task component files.

## Exact next files for the Employee handoff button

- `app/page.tsx`
  - add a reusable Employee handoff control
  - add it to Ifeoluwa chat, Mission Command, mission cards/details, and future task cards
  - transfer workspace, source type, source ID, message history, attachments, and selected employee
- `app/api/royalos/route.ts`
  - accept handoff metadata and preserve source context
- `app/api/missions/route.ts`
  - create/update assignments and participating employees
- `lib/missions/types.ts`
  - add typed handoff payload and audit fields
- `lib/missions/service.ts`
  - persist assignment/handoff history

## Exact next files for Cine

- `lib/employees/config.ts` — completed employee definition
- `lib/tools/types.ts` — video-generation and media-library tool contracts
- `lib/tools/registry.ts` — register provider-neutral Cine tools
- `lib/tools/permissions.ts` — Cine permissions and CEO approval boundaries
- `lib/tools/executor.ts` — execute asynchronous provider jobs safely
- `lib/tools/persistence.ts` / `lib/tools/database.ts` — generation jobs, provider costs, assets, versions, and handoffs
- `app/api/cine/*` — project, generate, status, scene-regenerate, render, and handoff routes
- `app/page.tsx` or `components/dashboard/CineStudio.tsx` — Cine generation page
- `.env.example` — provider keys without real secrets

Cine should be provider-neutral. Provider adapters should be added behind a common interface so RoyalOS can route between OpenAI video, HeyGen, Runway, Google Veo, voice providers, and FFmpeg or a rendering service.

## Exact next files for Michael P

- `lib/employees/config.ts` — completed employee definition and safety rules
- `lib/tools/types.ts` — document intake, extraction, categorization, reconciliation, PDF report, and record-search contracts
- `lib/tools/registry.ts` — register Michael P tools
- `lib/tools/permissions.ts` — restrict payment, tax filing, deletion, and official-record changes
- `lib/tools/executor.ts` — execute approved bookkeeping/document actions
- `lib/tools/persistence.ts` / `lib/tools/database.ts` — receipts, invoices, transactions, records, documents, reports, and audit history
- `app/api/michael-p/*` — intake, classify, review, report, search, and export routes
- `app/page.tsx` or `components/dashboard/MichaelPRecordsCenter.tsx` — Michael P workspace
- Supabase migrations — private storage and row-level access controls

Michael P must preserve originals, mark uncertain classifications for review, detect duplicates, and create immutable audit events. It must never make payments, submit taxes, delete originals, or silently alter official records.

## Remaining duplicated or intentionally scoped employee lists

- `lib/developer/types.ts` and Orion developer components contain a deliberately restricted developer-team subset; Cine and Michael P should not be added unless their roles require developer access.
- `lib/tools/builtins/openai-image-tool.ts` has a deliberately restricted image-tool allowlist. Cine may later be added for storyboard frames and thumbnails after its tool permissions are defined.
- Avatar files for `/avatars/cine.jpg`, `/avatars/michael-p.jpg`, and `/avatars/orion.jpg` are not present in the transfer package. The current Avatar component falls back to initials, so the UI remains functional.
