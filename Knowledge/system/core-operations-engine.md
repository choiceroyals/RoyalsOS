# RoyalOS Core Operations Engine

The Core Operations Engine connects the internal company systems that make RoyalOS an operating system rather than a collection of AI screens.

It includes:

- Workspaces as company and brand boundaries
- Missions as trackable assignments
- Approvals as human-control gates
- Knowledge as official company information
- Memory as learned context and decisions
- Messages as employee handoffs and reports
- Analytics as executive operating visibility
- Settings as organization-level controls

## Current implementation

The current UI uses typed local persistence for fast internal testing. Each record includes a workspace and enough structure to migrate into Supabase.

## Future architecture

Every record must belong to an organization. Row Level Security must prevent one customer from reading another customer’s records. Employee permissions, connected accounts, API budgets, and approval thresholds must be scoped to the organization and workspace.

No external action should be reported complete until the provider confirms it and RoyalOS records the result in an audit log.
