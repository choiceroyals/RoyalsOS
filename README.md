# RoyalOS

RoyalOS is the internal executive operating system for Triple-Hay Concept LLC, ChoiceRoyals, Xena Grace, and TD Talk. It combines AI employees, missions, company knowledge, creative tools, records, media production, and controlled business integrations in one dashboard.

## RoyalOS V3 plugin platform

RoyalOS now includes a Plugin Marketplace and a WordPress-style **Upload Plugin ZIP** flow. Compatible RoyalOS plugins register capabilities, permissions, employee assignments, configuration requirements, and safe actions without manual edits to application folders. See `ROYALOS_V3_PLUGIN_DEVELOPER_GUIDE.md`.

## Current working modules

- Executive dashboard and AI workforce
- Ifeoluwa private adviser with browser conversation history
- Nova Image Studio and Asset Gallery
- Cine Video Studio production planning and Cine-to-Emmy publishing handoff
- Michael P Records Center foundation
- Orion Local Developer Workbench with approval-controlled writes, validation, backups, rollback, and audit history
- Workspaces, missions, approvals, knowledge, memory, messages, analytics, and settings foundations
- Connections & Publishing Center
  - canonical provider registry
  - secure environment readiness checks
  - employee permission matrix
  - social publishing draft and approval queue
  - local development activity log

## Start RoyalOS

1. Copy `.env.example` to `.env.local`.
2. Enter real credentials only in `.env.local` on your computer.
3. Install and start:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Security

- Never upload or commit `.env.local`.
- Never place provider secrets in client components.
- The Connections Center only exposes safe status information and environment variable names.
- Publishing, sending, payment, deletion, deployment, and other high-impact actions remain approval controlled.
- A visual queue status is not proof that an external provider action succeeded.

## Orion Local Developer Edition

Orion can now inspect and search the repository, prepare complete-file proposals, and apply reviewed changes only after exact CEO approval. Every transaction uses protected paths, one-time proposal authorization, backups, atomic writes, an approved command allowlist, validation results, rollback, and an audit trail. See `ROYALOS_ORION_LOCAL_DEVELOPER_EDITION_20260714.md`.

Orion remains local and approval controlled. Package installation, deployment, arbitrary terminal commands, Git writes, and unattended production changes are intentionally disabled.

## Official company PDFs

Substantial Ifeoluwa responses and RoyalOS executive briefings can be converted into branded company PDFs. RoyalOS saves the original report and PDF with workspace, employee, mission, conversation, sources, tags, and version metadata. Michael P's Records Center includes a searchable official-record library.

## Current connection status

The Connections Center is the Phase 3 foundation. It can detect whether server-side configuration exists, organize employee access, and prepare publishing work. Provider-specific OAuth consent, encrypted token persistence, live health checks, real scheduling, and real publishing require the next adapter phase and provider developer credentials.

## Product roadmap

See `ROYALOS_PRODUCT_ROADMAP.md` for the approved Phase 2–6 sequence.

## Handoff

See `ROYALOS_HANDOFF.md` for architecture, completed work, validation results, and the next development steps.

## Core Operations Pack

The current build includes working local foundations for Workspaces, Missions, Approvals, Knowledge, Memory, Messages, Analytics, and Settings. See `ROYALOS_CORE_OPERATIONS_PACK_20260714.md` for scope, boundaries, and migration details.

## Current full edition: Brand, Security, Employee & Connections Pack

The current project includes premium per-brand operations, separate social/website/Metricool connection records, OAuth foundations, encrypted credential storage, Employee Directory, direct task assignment, Sentinel Security & Audit Center, curated dashboard employees, and private/collapsible Ifeoluwa chat.

Start with `START_HERE_BRAND_SECURITY_CONNECTIONS.txt`, then use `.env.example` and `ROYALOS_API_AND_CONNECTION_SETUP.md` as the private connection checklist.
