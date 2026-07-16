# RoyalOS Core Operations Pack

Updated: July 14, 2026

This package replaces the placeholder screens for Workspaces, Missions, Approvals, Knowledge, Memory, Messages, Analytics, and Settings with interactive RoyalOS foundations.

## Included modules

### Workspaces

- Displays Triple-Hay Concept LLC, ChoiceRoyals, Xena Grace, and TD Talk.
- Shows workspace-specific mission and knowledge counts.
- Creates additional local workspaces for new businesses, departments, clients, or projects.
- Establishes the future tenant boundary for a commercial multi-company RoyalOS product.

### Missions

- Lists active missions with workspace, lead employee, priority, due date, status, and progress.
- Creates new missions and assigns a lead employee.
- Advances mission progress and automatically completes missions at 100 percent.
- Supports searching by title, description, employee, or workspace.

### Approvals

- Centralizes sensitive actions awaiting CEO approval.
- Supports Approve, Request changes, and Reject decisions.
- Preserves approval status for future audit-history migration.

### Knowledge

- Displays company knowledge records by workspace, category, status, source, and employee access.
- Adds local document metadata and selected filenames to the knowledge index.
- Does not store uploaded file bytes yet; secure Supabase Storage remains the next phase.

### Memory

- Stores company decisions, CEO preferences, product requirements, milestones, and lessons.
- Records workspace, source, type, content, date, and pinned status.
- Supports pinning and deleting individual memories.

### Messages

- Displays employee, system, mission, and future customer messages.
- Marks messages as read.
- Converts a message into a new mission.
- Sends internal messages from the CEO to an employee.

### Analytics

- Shows mission progress, approvals, unread messages, API budget, workspace health, and record counts.
- Uses current Core Operations data and is ready for future Supabase, social, finance, Cine, and website metrics.

### Settings

- Configures organization identity, default workspace, API budget, approval requirements, notification settings, backups, and data region.
- Exports a JSON company-data backup.
- Keeps real secrets out of the browser and out of shared ZIP packages.

## Persistence

The current implementation uses browser localStorage under:

`royalos:core-operations:v1`

This makes the pages immediately useful during local development and preserves changes between browser sessions. It is not the final multi-user storage architecture.

## Supabase foundation

A review-first migration is included at:

`supabase/migrations/20260714_core_operations_foundation.sql`

It defines organization, workspace, mission, approval, knowledge, memory, message, and settings tables. Row Level Security is enabled without public policies. Do not apply it until authentication, organization membership, and policy rules have been reviewed.

## Main files

- `components/dashboard/CoreOperationsCenter.tsx`
- `components/dashboard/CoreOperationsCenter.module.css`
- `lib/core-operations/types.ts`
- `lib/core-operations/seed.ts`
- `lib/core-operations/storage.ts`
- `supabase/migrations/20260714_core_operations_foundation.sql`

## Important boundaries

- Local document intake records metadata only; it does not yet upload private files.
- Analytics are operational prototype metrics, not external provider analytics.
- Messages are internal browser records, not email or social direct messages.
- Approvals do not execute external actions until provider adapters are connected.
- Multi-user and multi-company isolation still require Supabase authentication and RLS policies.
