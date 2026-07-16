# RoyalOS Integration Engine

The RoyalOS Integration Engine is the controlled bridge between AI employees and external company platforms.

## Core rules

- Provider secrets stay in server-side environment variables or an approved encrypted secret store.
- The browser may receive connection status and missing variable names, but never secret values.
- Each integration defines allowed employees, capabilities, workspace scope, approval policy, and audit requirements.
- External publishing, sending, payment, deletion, refund, deployment, and account changes are high-impact actions and require explicit approval until the CEO grants a narrower autonomous permission.
- A visual connection status must never be treated as proof that a real external action succeeded. Provider responses must be captured before RoyalOS reports completion.

## Initial integration registry

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
- GitHub
- Supabase
- Stripe
- Printful
- DistroKid planning workflow

## Publishing workflow

1. Emmy, Cine, Jack, or Nova creates or hands off a content item.
2. RoyalOS stores it in the publishing queue with workspace, source employee, caption, channels, media reference, and status.
3. The CEO reviews and approves the item.
4. A connected provider adapter schedules or publishes it.
5. RoyalOS stores the provider response, external content ID, cost, timestamp, and result in the audit log.
6. Atlas and Emmy read engagement after publication and report performance.

The July 14, 2026 Connections Center implements the canonical registry, environment readiness checks, employee permission display, local development publishing queue, Cine-to-Emmy handoff, and development activity log. Provider-specific OAuth callbacks, encrypted token persistence, real scheduling, real publishing, and Supabase audit persistence remain future implementation work.
