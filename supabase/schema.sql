-- DCB Expansion Radar
-- Supabase/Postgres schema prepared for the backend phase.
-- Not applied to any project yet.

create table if not exists public.markets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  country_code text not null unique check (char_length(country_code) between 2 and 3),
  name text not null,
  expansion_score integer check (expansion_score between 0 and 100),
  status text not null default 'research'
    check (status in ('research','live','paused','archived')),
  summary text,
  tags text[] not null default '{}',
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operators (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  name text not null,
  group_name text,
  market_share numeric(6,3) check (market_share is null or (market_share >= 0 and market_share <= 100)),
  rail_summary text,
  confidence text not null default 'unknown'
    check (confidence in ('verified','review','unknown')),
  note text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_id, name)
);

create table if not exists public.billing_rails (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  provider_name text not null,
  rail_type text not null,
  confidence text not null default 'unknown'
    check (confidence in ('verified','review','unknown')),
  evidence_summary text,
  source_label text,
  source_url text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_id, provider_name, rail_type)
);

create table if not exists public.commercial_targets (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  company_name text not null,
  commercial_role text,
  evidence_status text,
  website text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_id, company_name)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  commercial_target_id uuid references public.commercial_targets(id) on delete set null,
  full_name text not null,
  company_name text not null,
  title text,
  location text,
  profile_url text,
  source_label text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_id, full_name, company_name)
);

create table if not exists public.market_signals (
  id uuid primary key default gen_random_uuid(),
  external_key text unique,
  market_id uuid not null references public.markets(id) on delete cascade,
  signal_type text not null
    check (signal_type in ('billing_route','market_update','corporate_change','partnership','contact_change','pricing','other')),
  confidence text not null default 'unknown'
    check (confidence in ('verified','review','unknown')),
  title text not null,
  summary text,
  company_name text,
  source_label text,
  source_url text,
  observed_at timestamptz not null default now(),
  occurred_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.market_sources (
  id uuid primary key default gen_random_uuid(),
  external_key text unique,
  market_id uuid not null references public.markets(id) on delete cascade,
  label text not null,
  url text not null,
  source_type text,
  monitor_enabled boolean not null default true,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_id, url)
);

create table if not exists public.source_checks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.market_sources(id) on delete cascade,
  content_hash text not null,
  http_status integer,
  final_url text,
  page_title text,
  text_length integer,
  duration_ms integer,
  changed boolean not null default false,
  review_status text not null default 'unreviewed'
    check (review_status in ('unreviewed','confirmed-change','false-positive','ignored')),
  review_note text,
  checked_at timestamptz not null default now()
);

create table if not exists public.market_score_components (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  model_version text not null default '0.1',
  component_key text not null,
  label text not null,
  description text,
  score integer not null check (score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_id, model_version, component_key)
);

create table if not exists public.payment_partners (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  partner_type text not null,
  confidence text not null default 'unknown'
    check (confidence in ('verified','review','unknown')),
  summary text,
  capabilities text[] not null default '{}',
  source_label text,
  source_url text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_partner_routes (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.payment_partners(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  operator_scope text not null,
  route_status text not null
    check (route_status in ('verified','historical-recheck','route-discovery')),
  note text,
  evidence_url text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_id, market_id, operator_scope)
);

create table if not exists public.shortlisted_markets (
  user_id uuid not null references auth.users(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, market_id)
);

create table if not exists public.market_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, market_id)
);

create table if not exists public.pipeline_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  market_id uuid references public.markets(id) on delete set null,
  entity_type text not null check (entity_type in ('company','contact')),
  entity_name text not null,
  company_name text,
  title_or_role text,
  stage text not null default 'New'
    check (stage in ('New','Researching','Contacted','Follow-up','Partnering','Closed')),
  notes text,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operators_market_id_idx on public.operators(market_id);
create index if not exists billing_rails_market_id_idx on public.billing_rails(market_id);
create index if not exists billing_rails_confidence_idx on public.billing_rails(confidence);
create index if not exists commercial_targets_market_id_idx on public.commercial_targets(market_id);
create index if not exists contacts_market_id_idx on public.contacts(market_id);
create index if not exists contacts_company_name_idx on public.contacts(company_name);
create index if not exists market_signals_market_observed_idx on public.market_signals(market_id, observed_at desc);
create index if not exists market_signals_type_idx on public.market_signals(signal_type);
create index if not exists source_checks_source_checked_idx on public.source_checks(source_id, checked_at desc);
create index if not exists payment_partner_routes_market_idx on public.payment_partner_routes(market_id);
create index if not exists pipeline_items_user_stage_idx on public.pipeline_items(user_id, stage);

-- Every Data API-exposed table gets RLS.
alter table public.markets enable row level security;
alter table public.operators enable row level security;
alter table public.billing_rails enable row level security;
alter table public.commercial_targets enable row level security;
alter table public.contacts enable row level security;
alter table public.market_signals enable row level security;
alter table public.market_sources enable row level security;
alter table public.source_checks enable row level security;
alter table public.market_score_components enable row level security;
alter table public.payment_partners enable row level security;
alter table public.payment_partner_routes enable row level security;
alter table public.shortlisted_markets enable row level security;
alter table public.market_notes enable row level security;
alter table public.pipeline_items enable row level security;

-- Intelligence is private by default. Authenticated users can read it.
create policy "Authenticated users can read markets"
on public.markets for select to authenticated using (true);

create policy "Authenticated users can read operators"
on public.operators for select to authenticated using (true);

create policy "Authenticated users can read billing rails"
on public.billing_rails for select to authenticated using (true);

create policy "Authenticated users can read commercial targets"
on public.commercial_targets for select to authenticated using (true);

create policy "Authenticated users can read contacts"
on public.contacts for select to authenticated using (true);

create policy "Authenticated users can read market signals"
on public.market_signals for select to authenticated using (true);

create policy "Authenticated users can read market sources"
on public.market_sources for select to authenticated using (true);

create policy "Authenticated users can read source checks"
on public.source_checks for select to authenticated using (true);

create policy "Authenticated users can read score components"
on public.market_score_components for select to authenticated using (true);

create policy "Authenticated users can read payment partners"
on public.payment_partners for select to authenticated using (true);

create policy "Authenticated users can read payment partner routes"
on public.payment_partner_routes for select to authenticated using (true);

-- Per-user shortlist.
create policy "Users can read their own shortlist"
on public.shortlisted_markets for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own shortlist"
on public.shortlisted_markets for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own shortlist"
on public.shortlisted_markets for delete to authenticated
using ((select auth.uid()) = user_id);

-- Per-user market notes.
create policy "Users can read their own market notes"
on public.market_notes for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own market notes"
on public.market_notes for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own market notes"
on public.market_notes for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own market notes"
on public.market_notes for delete to authenticated
using ((select auth.uid()) = user_id);

-- Per-user commercial pipeline.
create policy "Users can read their own pipeline"
on public.pipeline_items for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add their own pipeline items"
on public.pipeline_items for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own pipeline items"
on public.pipeline_items for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own pipeline items"
on public.pipeline_items for delete to authenticated
using ((select auth.uid()) = user_id);

-- Explicit grants. No anon access is granted to intelligence.
grant select on public.markets to authenticated;
grant select on public.operators to authenticated;
grant select on public.billing_rails to authenticated;
grant select on public.commercial_targets to authenticated;
grant select on public.contacts to authenticated;
grant select on public.market_signals to authenticated;
grant select on public.market_sources to authenticated;
grant select on public.source_checks to authenticated;
grant select on public.market_score_components to authenticated;
grant select on public.payment_partners to authenticated;
grant select on public.payment_partner_routes to authenticated;

grant select, insert, delete on public.shortlisted_markets to authenticated;
grant select, insert, update, delete on public.market_notes to authenticated;
grant select, insert, update, delete on public.pipeline_items to authenticated;


-- Keep mutable records timestamped consistently.
create or replace function public.radar_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.radar_set_updated_at() from public;
grant execute on function public.radar_set_updated_at() to authenticated, service_role;

drop trigger if exists markets_updated_at on public.markets;
create trigger markets_updated_at before update on public.markets
for each row execute function public.radar_set_updated_at();

drop trigger if exists operators_updated_at on public.operators;
create trigger operators_updated_at before update on public.operators
for each row execute function public.radar_set_updated_at();

drop trigger if exists billing_rails_updated_at on public.billing_rails;
create trigger billing_rails_updated_at before update on public.billing_rails
for each row execute function public.radar_set_updated_at();

drop trigger if exists commercial_targets_updated_at on public.commercial_targets;
create trigger commercial_targets_updated_at before update on public.commercial_targets
for each row execute function public.radar_set_updated_at();

drop trigger if exists contacts_updated_at on public.contacts;
create trigger contacts_updated_at before update on public.contacts
for each row execute function public.radar_set_updated_at();

drop trigger if exists market_sources_updated_at on public.market_sources;
create trigger market_sources_updated_at before update on public.market_sources
for each row execute function public.radar_set_updated_at();

drop trigger if exists market_score_components_updated_at on public.market_score_components;
create trigger market_score_components_updated_at before update on public.market_score_components
for each row execute function public.radar_set_updated_at();

drop trigger if exists payment_partners_updated_at on public.payment_partners;
create trigger payment_partners_updated_at before update on public.payment_partners
for each row execute function public.radar_set_updated_at();

drop trigger if exists payment_partner_routes_updated_at on public.payment_partner_routes;
create trigger payment_partner_routes_updated_at before update on public.payment_partner_routes
for each row execute function public.radar_set_updated_at();

drop trigger if exists market_notes_updated_at on public.market_notes;
create trigger market_notes_updated_at before update on public.market_notes
for each row execute function public.radar_set_updated_at();

drop trigger if exists pipeline_items_updated_at on public.pipeline_items;
create trigger pipeline_items_updated_at before update on public.pipeline_items
for each row execute function public.radar_set_updated_at();

-- The Cloudflare Worker will use a Supabase secret key server-side.
-- Explicit object grants keep backend writes intentional while the secret/service role bypasses RLS.
grant select, insert, update, delete on public.markets to service_role;
grant select, insert, update, delete on public.operators to service_role;
grant select, insert, update, delete on public.billing_rails to service_role;
grant select, insert, update, delete on public.commercial_targets to service_role;
grant select, insert, update, delete on public.contacts to service_role;
grant select, insert, update, delete on public.market_signals to service_role;
grant select, insert, update, delete on public.market_sources to service_role;
grant select, insert, update, delete on public.source_checks to service_role;
grant select, insert, update, delete on public.market_score_components to service_role;
grant select, insert, update, delete on public.payment_partners to service_role;
grant select, insert, update, delete on public.payment_partner_routes to service_role;
grant select, insert, update, delete on public.shortlisted_markets to service_role;
grant select, insert, update, delete on public.market_notes to service_role;
grant select, insert, update, delete on public.pipeline_items to service_role;

-- Keep anonymous access closed until a deliberate public-data API is designed.
revoke all on public.markets from anon;
revoke all on public.operators from anon;
revoke all on public.billing_rails from anon;
revoke all on public.commercial_targets from anon;
revoke all on public.contacts from anon;
revoke all on public.market_signals from anon;
revoke all on public.market_sources from anon;
revoke all on public.source_checks from anon;
revoke all on public.market_score_components from anon;
revoke all on public.payment_partners from anon;
revoke all on public.payment_partner_routes from anon;
revoke all on public.shortlisted_markets from anon;
revoke all on public.market_notes from anon;
revoke all on public.pipeline_items from anon;
