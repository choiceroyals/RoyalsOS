-- RoyalOS Core Operations foundation
-- Review before applying. This migration creates database-ready tables for the
-- Workspaces, Missions, Approvals, Knowledge, Memory, Messages, and Settings modules.
-- RLS is enabled without public policies so browser clients cannot access records
-- until organization membership and authorization policies are added.

create extension if not exists pgcrypto;

create table if not exists public.royalos_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.royalos_workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.royalos_organizations(id) on delete cascade,
  name text not null,
  workspace_type text not null default 'Business Workspace',
  description text not null default '',
  status text not null default 'Active' check (status in ('Active', 'Paused', 'Archived')),
  accent text not null default '#f4b942',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.royalos_core_missions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.royalos_organizations(id) on delete cascade,
  workspace_id uuid references public.royalos_workspaces(id) on delete set null,
  title text not null,
  description text not null default '',
  lead_employee text not null,
  supporting_employees text[] not null default '{}',
  priority text not null default 'Normal' check (priority in ('Low', 'Normal', 'High', 'Critical')),
  status text not null default 'Planning' check (status in ('Planning', 'In Progress', 'Blocked', 'Review', 'Completed')),
  progress integer not null default 0 check (progress between 0 and 100),
  due_date date,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.royalos_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.royalos_organizations(id) on delete cascade,
  workspace_id uuid references public.royalos_workspaces(id) on delete set null,
  mission_id uuid references public.royalos_core_missions(id) on delete set null,
  title text not null,
  approval_type text not null,
  requested_by text not null,
  summary text not null default '',
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Changes Requested', 'Rejected')),
  decision_by uuid,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.royalos_knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.royalos_organizations(id) on delete cascade,
  workspace_id uuid references public.royalos_workspaces(id) on delete set null,
  title text not null,
  category text not null default 'Company knowledge',
  source text not null default 'Manual record',
  storage_path text,
  mime_type text,
  status text not null default 'Draft' check (status in ('Indexed', 'Processing', 'Draft')),
  employee_access text[] not null default '{}',
  notes text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.royalos_memory_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.royalos_organizations(id) on delete cascade,
  workspace_id uuid references public.royalos_workspaces(id) on delete set null,
  title text not null,
  memory_type text not null default 'Company decision',
  source text not null,
  content text not null,
  pinned boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.royalos_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.royalos_organizations(id) on delete cascade,
  workspace_id uuid references public.royalos_workspaces(id) on delete set null,
  mission_id uuid references public.royalos_core_missions(id) on delete set null,
  sender_name text not null,
  recipient_name text not null,
  subject text not null,
  body text not null,
  message_type text not null default 'Employee' check (message_type in ('Employee', 'System', 'Customer', 'Mission')),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.royalos_organization_settings (
  organization_id uuid primary key references public.royalos_organizations(id) on delete cascade,
  founder_name text not null default '',
  default_workspace_id uuid references public.royalos_workspaces(id) on delete set null,
  approval_required boolean not null default true,
  social_publishing_approval boolean not null default true,
  accounting_approval boolean not null default true,
  api_monthly_budget numeric(12,2) not null default 0,
  notifications_enabled boolean not null default true,
  auto_backup_enabled boolean not null default true,
  data_region text not null default 'United States',
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists royalos_workspaces_org_idx on public.royalos_workspaces(organization_id);
create index if not exists royalos_core_missions_workspace_idx on public.royalos_core_missions(workspace_id);
create index if not exists royalos_core_missions_status_idx on public.royalos_core_missions(status);
create index if not exists royalos_approvals_status_idx on public.royalos_approvals(status);
create index if not exists royalos_knowledge_workspace_idx on public.royalos_knowledge_documents(workspace_id);
create index if not exists royalos_memory_workspace_idx on public.royalos_memory_records(workspace_id);
create index if not exists royalos_messages_recipient_idx on public.royalos_messages(recipient_name, is_read);

alter table public.royalos_organizations enable row level security;
alter table public.royalos_workspaces enable row level security;
alter table public.royalos_core_missions enable row level security;
alter table public.royalos_approvals enable row level security;
alter table public.royalos_knowledge_documents enable row level security;
alter table public.royalos_memory_records enable row level security;
alter table public.royalos_messages enable row level security;
alter table public.royalos_organization_settings enable row level security;

comment on table public.royalos_organizations is 'Tenant organization boundary for the future public RoyalOS product.';
comment on table public.royalos_core_missions is 'Mission System 2.0 foundation for employee assignments and progress.';
comment on table public.royalos_approvals is 'Approval-controlled audit trail for sensitive employee actions.';
