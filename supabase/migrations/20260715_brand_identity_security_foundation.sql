-- RoyalOS Brand Identity, Credential Vault, and Security foundation
-- Review authentication and organization-membership policies before public deployment.

create extension if not exists pgcrypto;

create table if not exists public.brands (
  id text primary key,
  organization_id uuid null,
  workspace_id text not null,
  name text not null,
  slug text not null unique,
  description text not null default '',
  logo_url text null,
  primary_domain text null,
  accent_color text not null default '#e7b84f',
  status text not null default 'setup' check (status in ('active','paused','setup')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_connection_credentials (
  id uuid primary key default gen_random_uuid(),
  brand_id text not null references public.brands(id) on delete cascade,
  provider_id text not null,
  account_name text null,
  external_account_id text null,
  encrypted_payload text not null,
  encryption_iv text not null,
  encryption_tag text not null,
  token_expires_at timestamptz null,
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active','revoked','error','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, provider_id)
);

create table if not exists public.brand_websites (
  id uuid primary key default gen_random_uuid(),
  brand_id text not null references public.brands(id) on delete cascade,
  label text not null,
  url text not null,
  kind text not null,
  provider text null,
  health text not null default 'not_checked',
  ssl_status text not null default 'not_checked',
  assigned_employees text[] not null default '{}',
  last_checked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brand_employee_assignments (
  id uuid primary key default gen_random_uuid(),
  brand_id text not null references public.brands(id) on delete cascade,
  employee_name text not null,
  responsibility text not null default '',
  platform_ids text[] not null default '{}',
  can_draft boolean not null default false,
  can_schedule boolean not null default false,
  can_publish boolean not null default false,
  publish_requires_approval boolean not null default true,
  can_read_analytics boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, employee_name)
);

create table if not exists public.brand_publishing_jobs (
  id uuid primary key default gen_random_uuid(),
  brand_id text not null references public.brands(id) on delete cascade,
  title text not null,
  platform_ids text[] not null default '{}',
  content_type text not null,
  caption text not null default '',
  created_by text not null,
  approval_status text not null default 'draft',
  publish_status text not null default 'not_ready',
  scheduled_for timestamptz null,
  platform_post_ids jsonb not null default '{}'::jsonb,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  brand_id text null references public.brands(id) on delete set null,
  platform text not null,
  event_type text not null,
  actor text null,
  action text not null,
  target text null,
  result text not null,
  severity text not null,
  source_type text not null,
  evidence jsonb not null default '{}'::jsonb,
  source_ip inet null,
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now()
);

create table if not exists public.security_alerts (
  id uuid primary key default gen_random_uuid(),
  brand_id text null references public.brands(id) on delete set null,
  title text not null,
  platform text not null,
  severity text not null,
  status text not null default 'new',
  rule_id text not null,
  event_ids uuid[] not null default '{}',
  summary text not null default '',
  assigned_employee text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.security_incidents (
  id uuid primary key default gen_random_uuid(),
  brand_id text null references public.brands(id) on delete set null,
  alert_id uuid null references public.security_alerts(id) on delete set null,
  title text not null,
  platform text not null,
  severity text not null,
  status text not null default 'open',
  assigned_employee text not null default 'Sentinel',
  findings text not null default '',
  evidence jsonb not null default '[]'::jsonb,
  actions_taken jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  escalation text null,
  report_record_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_brand_credentials_brand on public.brand_connection_credentials(brand_id);
create index if not exists idx_security_events_brand_time on public.security_events(brand_id, occurred_at desc);
create index if not exists idx_security_alerts_status on public.security_alerts(status, severity);
create index if not exists idx_security_incidents_status on public.security_incidents(status, severity);

alter table public.brands enable row level security;
alter table public.brand_connection_credentials enable row level security;
alter table public.brand_websites enable row level security;
alter table public.brand_employee_assignments enable row level security;
alter table public.brand_publishing_jobs enable row level security;
alter table public.security_events enable row level security;
alter table public.security_alerts enable row level security;
alter table public.security_incidents enable row level security;

-- No permissive client policies are created here. Service-role server routes can operate,
-- but public/member policies must be added only after RoyalOS organizations and memberships
-- are finalized. Never expose brand_connection_credentials through a browser client.

insert into public.brands (id, workspace_id, name, slug, description, logo_url, primary_domain, accent_color, status)
values
  ('brand-choiceroyals','workspace-choice-royals','ChoiceRoyals','choiceroyals','Premium education, business growth, publishing, and AI-powered company systems.','/brands/choiceroyals/logo.png','https://choiceroyals.com','#e7b84f','active'),
  ('brand-xena-grace','workspace-xena-grace','Xena Grace','xena-grace','Cinematic music, healing, emotional strength, faith, and community.','/brands/xena-grace/logo.png','https://xgrace.net','#d89af5','active'),
  ('brand-td-talk','workspace-td-talk','TD Talk','td-talk','Deep conversations, interviews, testimony, learning, and community.','/brands/td-talk/logo.png',null,'#74dfb6','setup'),
  ('brand-triple-hay','workspace-triple-hay','Triple-Hay Concept LLC','triple-hay','Parent-company governance, shared operations, strategy, security, and RoyalOS.','/brands/triple-hay/logo.png',null,'#7aaeff','active')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  logo_url = excluded.logo_url,
  primary_domain = excluded.primary_domain,
  accent_color = excluded.accent_color,
  status = excluded.status,
  updated_at = now();
