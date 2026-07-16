-- RoyalOS Orion Local Developer + Company PDF Records
-- Apply this migration in Supabase after reviewing it.

create extension if not exists pgcrypto;

create table if not exists public.royalos_company_records (
  id uuid primary key default gen_random_uuid(),
  record_id text not null unique,
  organization_id uuid references public.royalos_organizations(id) on delete set null,
  workspace text not null,
  title text not null,
  employee text not null,
  mission_id text,
  conversation_id text,
  version integer not null default 1,
  storage_bucket text not null default 'royalos-assets',
  storage_path text not null,
  original_storage_path text not null,
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null default 0,
  tags text[] not null default '{}',
  sources jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists royalos_company_records_workspace_idx
  on public.royalos_company_records(workspace, created_at desc);

create index if not exists royalos_company_records_mission_idx
  on public.royalos_company_records(mission_id)
  where mission_id is not null;

alter table public.royalos_company_records enable row level security;

comment on table public.royalos_company_records is
  'Official PDF reports and their original editable research records generated inside RoyalOS.';

-- No browser-access RLS policies are added here. The current internal build writes
-- through server-only service-role routes. Add organization membership policies
-- before RoyalOS is released to external businesses.
