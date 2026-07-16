# RoyalOS Orion Local Developer Edition

Updated: 2026-07-14

## Purpose

This edition upgrades Orion from a read-only code adviser into an approval-controlled local developer employee. Orion can inspect the RoyalOS repository, search code, prepare implementation plans, generate complete file proposals, apply approved changes, run safe validation commands, preserve backups, and roll back a transaction.

It is intentionally not an unrestricted autonomous agent. CEO approval, protected paths, a command allowlist, secret scanning, backups, validation, and audit records remain mandatory.

## Orion workflow

1. Open **Orion Developer Workbench**.
2. Inspect or search the repository before requesting a change.
3. Ask Orion to prepare a code proposal.
4. Review the plan, affected files, risks, complete proposed file content, validation commands, and rollback instructions.
5. Type `APPROVE` exactly.
6. Orion verifies a one-time server approval token and proposal integrity.
7. Orion creates timestamped backups and atomically applies the reviewed changes.
8. Orion runs only approved validation commands.
9. Orion reports the transaction result and records an audit trail.
10. Type `ROLLBACK` exactly to restore the transaction when needed.

## Local capabilities

- Full approved repository inspection and code search
- Architecture and dependency analysis
- Complete-file code proposals
- Create, modify, replace, and delete operations when permitted
- Stale-file SHA-256 protection
- Secret-path and hard-coded-secret protection
- Atomic writes
- Timestamped backups before every write
- One-click transaction rollback
- Manual and post-change validation
- Local transaction history and audit trail

## Allowed validation commands

Orion's terminal access is intentionally limited to:

```text
npx tsc --noEmit
npm run lint
npm run build
```

Arbitrary shell commands, package installation, deployment, payment actions, credential changes, and production operations are not enabled.

## Runtime folders

Orion creates these folders locally while operating:

```text
.royalos-orion/       proposals, transactions, and audit events
.royalos-backups/     timestamped file backups
```

They are intentionally excluded by `.gitignore` and by transfer packages.

## Environment controls

```env
ORION_LOCAL_WRITES_ENABLED=true
ORION_LOCAL_VALIDATION_ENABLED=true
ORION_LOCAL_DELETES_ENABLED=true
ROYALOS_PROJECT_ROOT=
```

In local development, the first three features default to enabled when omitted. Set any value to `false` to disable that capability. `ROYALOS_PROJECT_ROOT` is optional and should normally remain blank.

## Security boundaries

- `.env`, `.env.local`, secrets, credentials, keys, tokens, Git internals, build output, dependencies, and protected operating-system paths cannot be changed.
- Every write requires the exact approval phrase and a valid one-time approval token.
- Proposals expire after six hours.
- A proposal is rejected if a target file changed after the proposal was prepared.
- Proposed content is scanned for likely secrets before writing.
- Validation failure can trigger automatic rollback.
- Orion cannot install packages, deploy the application, alter production, or manage Git branches in this pre-Git edition.

## API routes

```text
GET/POST /api/developer/inspect
GET/POST /api/developer/search
GET/POST /api/developer/plan
GET/POST /api/developer/propose
POST     /api/developer/apply
POST     /api/developer/rollback
GET/POST /api/developer/validate
GET      /api/developer/history
GET      /api/developer/health
```

## Company PDF records

This edition also adds **Save as Company PDF** to substantial Ifeoluwa responses and RoyalOS executive briefings. The reusable report system:

- creates a branded PDF and original JSON record;
- captures title, workspace, employee, mission, conversation, tags, sources, version, and timestamps;
- saves to Supabase Storage and `royalos_company_records` when configured;
- falls back to local company-record storage during development;
- displays searchable official records in Michael P's Records Center.

Apply `supabase/migrations/20260714_orion_company_records.sql` only after authentication and RLS policies are reviewed for the intended environment.

## Honest readiness statement

Orion is ready for approval-controlled local RoyalOS development. It is not yet configured for Git commits, branches, pull requests, cloud deployment, or unattended production changes. Those capabilities belong to the Git phase after this local edition is proven stable.
