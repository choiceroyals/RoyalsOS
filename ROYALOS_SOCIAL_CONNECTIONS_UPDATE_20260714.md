# RoyalOS Connections & Publishing Update — July 14, 2026

## Purpose

This update adds the first full Phase 3 integration foundation to RoyalOS. It gives the dashboard a central place for social accounts, business systems, employee permissions, publishing preparation, approvals, and activity records.

## New navigation module

- `Connections`

## New files

- `components/dashboard/IntegrationsCenter.tsx`
- `components/dashboard/IntegrationsCenter.module.css`
- `app/api/integrations/route.ts`
- `lib/integrations/config.ts`
- `lib/integrations/types.ts`
- `lib/integrations/client.ts`
- `lib/integrations/server.ts`
- `Knowledge/system/integration-engine.md`

## Connections represented

Social and publishing:

- Facebook
- Instagram
- LinkedIn
- X
- TikTok
- YouTube
- WordPress
- Metricool

Company systems:

- Gmail
- Google Drive
- Google Calendar
- Stripe
- Printful
- GitHub
- Supabase
- DistroKid planning workflow

## Features implemented

- Safe connection status reporting
- Required environment variable display without secret values
- Workspace selector
- Connection capability cards
- Employee access matrix
- Approval policies
- Emmy publishing queue
- Manual social draft creation
- Draft-to-approval workflow
- Cine production-plan handoff into Emmy's queue
- Local development activity log
- Updated roadmap, handoff, knowledge, and environment template

## Important boundary

This package does not pretend that external accounts are connected when they are not. A provider is only marked connected when a server-side credential or token is detected. Real OAuth authorization, encrypted token storage, provider health checks, media upload, scheduling, publishing, and analytics retrieval remain adapter work.

## Recommended next adapter

Start with one provider that matches the immediate business need. Implement:

1. Developer application credentials
2. OAuth start route
3. Callback route with state validation
4. Encrypted Supabase token storage
5. Connection health check
6. Approved publishing action
7. Provider response and external content ID storage
8. Audit event and error handling
