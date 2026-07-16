# RoyalOS Brand, Security, Employee & Connections Pack

Build date: 2026-07-15

This full update extends the Orion Local Developer Edition and Core Operations Pack. It keeps all existing RoyalOS modules and adds a brand-aware business operating layer, complete employee directory, Sentinel Security & Audit Center, premium ChoiceRoyals identity, and provider authorization foundations.

## Major additions

### Brand operating system

- Brand Directory for ChoiceRoyals, Xena Grace, TD Talk, and Triple-Hay Concept LLC.
- Clickable brand profiles with Overview, Connections, Websites, Employees, Publishing, Analytics, Audit, and Settings.
- Global brand switcher with persistent selected-brand context.
- Premium ChoiceRoyals logo placement on brand pages and PDF-ready report flows.
- Per-brand platform, website, employee-assignment, publishing, Metricool, and audit records.
- Guided brand connection setup wizard.

### Provider connections

- OAuth start and callback routes for Meta, Google, LinkedIn, X, TikTok, and GitHub.
- Manual Application Password configuration for WordPress.
- Separate Metricool token/user/blog identifiers for every brand.
- AES-256-GCM encryption for OAuth token payloads.
- Server-only Supabase credential vault.
- Provider status, missing-variable list, permission display, employee access, and audit history.

### Employee Directory

- Every RoyalOS employee is listed and clickable.
- Full employee profile pages include responsibilities, capabilities, tools, permissions, reports, current work, and escalation paths.
- Direct Assign Task workflow without requiring Adedeji.
- Adedeji remains the coordinator for multi-employee and executive missions.
- Main dashboard remains uncluttered by showing only selected senior employees.

### Sentinel and Security & Audit Center

- Sentinel: Chief Cybersecurity, Risk & Audit Officer.
- Security overview, alerts, incidents, live events, platform health, rules, and reports.
- Assign-to-Sentinel workflow.
- Investigation report, findings, evidence, actions, recommendations, escalation, PDF storage, and audit trail.
- Protected external event-ingestion endpoint with optional production secret.
- Supabase tables for security events, alerts, and incidents.

### Privacy and dashboard

- Ifeoluwa dashboard chat is compact, closable, and privacy-aware.
- Message previews and personal titles can remain hidden on shared or large displays.
- View All Employees opens the full directory rather than crowding the dashboard.

## Important boundaries

This package includes production-shaped connection and credential infrastructure, but a platform is not live until its developer application, credentials, permissions, OAuth authorization, provider review, and endpoint testing are completed. RoyalOS must not show invented posting, analytics, security, payment, or health data.

External publishing remains approval-controlled. Autonomous publishing must only be enabled after each provider has been tested and its audit records verified.
