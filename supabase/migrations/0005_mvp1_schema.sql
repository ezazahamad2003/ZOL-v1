-- 0005_mvp1_schema.sql
-- ZOL MVP1: rename shops→workspaces, new tables, drop obsolete tables

-- ─── Helper: rename shops → workspaces ───────────────────────────────────────
-- Drop old RLS policies that reference shops before renaming
drop policy if exists "shops_owner_select"   on public.shops;
drop policy if exists "shops_owner_insert"   on public.shops;
drop policy if exists "shops_owner_update"   on public.shops;
drop policy if exists "shops_owner_delete"   on public.shops;
drop policy if exists "customers_shop_select" on public.customers;
drop policy if exists "customers_shop_insert" on public.customers;
drop policy if exists "customers_shop_update" on public.customers;
drop policy if exists "customers_shop_delete" on public.customers;
drop policy if exists "calls_shop_select"    on public.calls;
drop policy if exists "calls_shop_insert"    on public.calls;
drop policy if exists "calls_shop_update"    on public.calls;
drop policy if exists "calls_shop_delete"    on public.calls;
drop policy if exists "call_extractions_select" on public.call_extractions;
drop policy if exists "call_extractions_insert" on public.call_extractions;
drop policy if exists "call_extractions_update" on public.call_extractions;
drop policy if exists "call_extractions_delete" on public.call_extractions;
drop policy if exists "quotes_shop_select"   on public.quotes;
drop policy if exists "quotes_shop_insert"   on public.quotes;
drop policy if exists "quotes_shop_update"   on public.quotes;
drop policy if exists "quotes_shop_delete"   on public.quotes;
drop policy if exists "agent_runs_shop_select" on public.agent_runs;
drop policy if exists "agent_runs_shop_insert" on public.agent_runs;
drop policy if exists "agent_runs_shop_update" on public.agent_runs;
drop policy if exists "followups_shop_select"  on public.followups;
drop policy if exists "followups_shop_insert"  on public.followups;
drop policy if exists "followups_shop_update"  on public.followups;
drop policy if exists "followups_shop_delete"  on public.followups;

-- Drop is_shop_owner function (will recreate as is_workspace_owner)
drop function if exists public.is_shop_owner(uuid);

-- Drop obsolete tables
drop table if exists public.followups cascade;
drop table if exists public.call_extractions cascade;
drop table if exists public.quotes cascade;
drop table if exists public.customers cascade;

-- Rename shops → workspaces
alter table public.shops rename to workspaces;

-- Rename PK/constraint names to match (aesthetic, not required)
alter table public.workspaces rename column owner_user_id to owner_id;

-- Rename calls.shop_id → workspace_id
alter table public.calls rename column shop_id to workspace_id;

-- Rename agent_runs.shop_id → workspace_id
alter table public.agent_runs rename column shop_id to workspace_id;
-- Also rename trigger_ref_id → trigger_ref (text), drop old steps/input/result/error JSONB
alter table public.agent_runs rename column trigger_ref_id to trigger_ref_old;

-- ─── ALTER workspaces: add new columns ───────────────────────────────────────
alter table public.workspaces
  add column if not exists vapi_phone_number   text,
  add column if not exists timezone             text not null default 'America/Los_Angeles',
  add column if not exists ai_greeting          text,
  add column if not exists ai_tone              text not null default 'professional',
  add column if not exists status               text not null default 'onboarding',
  add column if not exists updated_at           timestamptz not null default now();

-- Migrate onboarding_status → status
update public.workspaces
set status = case
  when onboarding_status = 'active'            then 'active'
  when onboarding_status = 'phone_provisioned' then 'active'
  when onboarding_status = 'google_connected'  then 'onboarding'
  else 'onboarding'
end;

-- Drop old columns no longer in schema
alter table public.workspaces
  drop column if exists onboarding_status,
  drop column if exists phone_provisioning_type,
  drop column if exists google_email,
  drop column if exists google_refresh_token_encrypted,
  drop column if exists google_calendar_id,
  drop column if exists pricing_config;

-- Copy phone_number from old field to new vapi_phone_number field if present
update public.workspaces
set vapi_phone_number = phone_number
where phone_number is not null and vapi_phone_number is null;

-- ─── ALTER calls: add new columns ────────────────────────────────────────────
alter table public.calls
  add column if not exists caller_phone      text,
  add column if not exists caller_name       text,
  add column if not exists caller_email      text,
  add column if not exists vehicle_info      jsonb,
  add column if not exists duration_seconds  int,
  add column if not exists summary           text,
  add column if not exists sentiment         text,
  add column if not exists action_items      jsonb;

-- Rename calls.transcript from text → jsonb by adding new column
alter table public.calls
  add column if not exists transcript_jsonb jsonb;

-- Drop old columns not in new schema
alter table public.calls
  drop column if exists customer_id,
  drop column if exists direction,
  drop column if exists raw_payload,
  drop column if exists started_at,
  drop column if exists ended_at;

-- Rename status values to new spec (completed/missed/voicemail)
update public.calls set status = 'completed' where status in ('active', 'done');

-- ─── ALTER agent_runs: new columns ───────────────────────────────────────────
alter table public.agent_runs
  add column if not exists user_prompt        text,
  add column if not exists trigger_ref        text,
  add column if not exists total_tool_calls   int not null default 0;

-- Migrate trigger_ref_old (uuid) to trigger_ref (text)
update public.agent_runs
set trigger_ref = trigger_ref_old::text
where trigger_ref_old is not null;

alter table public.agent_runs
  drop column if exists trigger_ref_old,
  drop column if exists input,
  drop column if exists result,
  drop column if exists error,
  drop column if exists steps;

-- Rename status values
update public.agent_runs set status = 'completed' where status = 'done';

-- ─── NEW TABLES ──────────────────────────────────────────────────────────────

-- integrations
create table if not exists public.integrations (
  id              uuid primary key default uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  provider        text not null,               -- 'google_calendar'|'gmail'|'vapi'
  access_token    text,                        -- AES-256-GCM encrypted
  refresh_token   text,                        -- AES-256-GCM encrypted
  expires_at      timestamptz,
  metadata        jsonb default '{}'::jsonb,   -- e.g. {calendar_id, email}
  status          text not null default 'connected',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- call_insights
create table if not exists public.call_insights (
  id           uuid primary key default uuid_generate_v4(),
  call_id      uuid not null references public.calls(id) on delete cascade,
  insight_type text not null,   -- 'pain_point'|'service_request'|'feedback'
  content      text not null,
  urgency      text not null default 'medium',  -- 'low'|'medium'|'high'|'emergency'
  created_at   timestamptz not null default now()
);

-- appointments
create table if not exists public.appointments (
  id               uuid primary key default uuid_generate_v4(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  call_id          uuid references public.calls(id) on delete set null,
  customer_name    text,
  customer_phone   text,
  customer_email   text,
  vehicle_info     jsonb,
  service_type     text,
  scheduled_at     timestamptz not null,
  duration_minutes int not null default 60,
  google_event_id  text,
  status           text not null default 'scheduled',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- emails
create table if not exists public.emails (
  id               uuid primary key default uuid_generate_v4(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  call_id          uuid references public.calls(id) on delete set null,
  to_email         text not null,
  subject          text not null,
  body_html        text not null,
  gmail_message_id text,
  status           text not null default 'draft',
  sent_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- follow_ups
create table if not exists public.follow_ups (
  id               uuid primary key default uuid_generate_v4(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  call_id          uuid not null references public.calls(id) on delete cascade,
  customer_phone   text,
  customer_email   text,
  follow_up_number int not null default 1,
  scheduled_for    timestamptz not null,
  sent_at          timestamptz,
  email_id         uuid references public.emails(id) on delete set null,
  status           text not null default 'pending',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- agent_steps
create table if not exists public.agent_steps (
  id            uuid primary key default uuid_generate_v4(),
  run_id        uuid not null references public.agent_runs(id) on delete cascade,
  step_number   int not null,
  step_type     text not null,   -- 'plan'|'tool_call'|'observe'|'finish'
  tool_name     text,
  tool_input    jsonb,
  tool_output   jsonb,
  duration_ms   int,
  status        text not null default 'success',
  error_message text,
  created_at    timestamptz not null default now()
);

-- ─── RLS: re-create helper function ──────────────────────────────────────────
create or replace function public.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspaces
    where id = p_workspace_id and owner_id = (select auth.uid())
  );
$$;

-- ─── RLS: enable on all tables ───────────────────────────────────────────────
alter table public.workspaces   enable row level security;
alter table public.calls        enable row level security;
alter table public.agent_runs   enable row level security;
alter table public.integrations enable row level security;
alter table public.call_insights enable row level security;
alter table public.appointments enable row level security;
alter table public.emails       enable row level security;
alter table public.follow_ups   enable row level security;
alter table public.agent_steps  enable row level security;

-- ─── RLS: workspaces ─────────────────────────────────────────────────────────
create policy "workspaces_owner_select" on public.workspaces
  for select using (owner_id = (select auth.uid()));

create policy "workspaces_owner_insert" on public.workspaces
  for insert with check (owner_id = (select auth.uid()));

create policy "workspaces_owner_update" on public.workspaces
  for update using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "workspaces_owner_delete" on public.workspaces
  for delete using (owner_id = (select auth.uid()));

-- ─── RLS: calls ──────────────────────────────────────────────────────────────
create policy "calls_workspace_select" on public.calls
  for select using (public.is_workspace_owner(workspace_id));

create policy "calls_workspace_insert" on public.calls
  for insert with check (public.is_workspace_owner(workspace_id));

create policy "calls_workspace_update" on public.calls
  for update using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

create policy "calls_workspace_delete" on public.calls
  for delete using (public.is_workspace_owner(workspace_id));

-- ─── RLS: agent_runs ─────────────────────────────────────────────────────────
create policy "agent_runs_workspace_select" on public.agent_runs
  for select using (public.is_workspace_owner(workspace_id));

create policy "agent_runs_workspace_insert" on public.agent_runs
  for insert with check (public.is_workspace_owner(workspace_id));

create policy "agent_runs_workspace_update" on public.agent_runs
  for update using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

-- ─── RLS: integrations ───────────────────────────────────────────────────────
create policy "integrations_workspace_select" on public.integrations
  for select using (public.is_workspace_owner(workspace_id));

create policy "integrations_workspace_insert" on public.integrations
  for insert with check (public.is_workspace_owner(workspace_id));

create policy "integrations_workspace_update" on public.integrations
  for update using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

create policy "integrations_workspace_delete" on public.integrations
  for delete using (public.is_workspace_owner(workspace_id));

-- ─── RLS: call_insights ──────────────────────────────────────────────────────
create policy "call_insights_select" on public.call_insights
  for select using (
    exists (
      select 1 from public.calls c
      where c.id = call_id and public.is_workspace_owner(c.workspace_id)
    )
  );

create policy "call_insights_insert" on public.call_insights
  for insert with check (
    exists (
      select 1 from public.calls c
      where c.id = call_id and public.is_workspace_owner(c.workspace_id)
    )
  );

create policy "call_insights_update" on public.call_insights
  for update using (
    exists (
      select 1 from public.calls c
      where c.id = call_id and public.is_workspace_owner(c.workspace_id)
    )
  );

create policy "call_insights_delete" on public.call_insights
  for delete using (
    exists (
      select 1 from public.calls c
      where c.id = call_id and public.is_workspace_owner(c.workspace_id)
    )
  );

-- ─── RLS: appointments ───────────────────────────────────────────────────────
create policy "appointments_workspace_select" on public.appointments
  for select using (public.is_workspace_owner(workspace_id));

create policy "appointments_workspace_insert" on public.appointments
  for insert with check (public.is_workspace_owner(workspace_id));

create policy "appointments_workspace_update" on public.appointments
  for update using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

create policy "appointments_workspace_delete" on public.appointments
  for delete using (public.is_workspace_owner(workspace_id));

-- ─── RLS: emails ─────────────────────────────────────────────────────────────
create policy "emails_workspace_select" on public.emails
  for select using (public.is_workspace_owner(workspace_id));

create policy "emails_workspace_insert" on public.emails
  for insert with check (public.is_workspace_owner(workspace_id));

create policy "emails_workspace_update" on public.emails
  for update using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

create policy "emails_workspace_delete" on public.emails
  for delete using (public.is_workspace_owner(workspace_id));

-- ─── RLS: follow_ups ─────────────────────────────────────────────────────────
create policy "follow_ups_workspace_select" on public.follow_ups
  for select using (public.is_workspace_owner(workspace_id));

create policy "follow_ups_workspace_insert" on public.follow_ups
  for insert with check (public.is_workspace_owner(workspace_id));

create policy "follow_ups_workspace_update" on public.follow_ups
  for update using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

create policy "follow_ups_workspace_delete" on public.follow_ups
  for delete using (public.is_workspace_owner(workspace_id));

-- ─── RLS: agent_steps ────────────────────────────────────────────────────────
create policy "agent_steps_select" on public.agent_steps
  for select using (
    exists (
      select 1 from public.agent_runs r
      where r.id = run_id and public.is_workspace_owner(r.workspace_id)
    )
  );

create policy "agent_steps_insert" on public.agent_steps
  for insert with check (
    exists (
      select 1 from public.agent_runs r
      where r.id = run_id and public.is_workspace_owner(r.workspace_id)
    )
  );

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
-- Drop old shop-based indexes (may not exist but IF EXISTS is safe)
drop index if exists idx_shops_owner_user_id;
drop index if exists idx_shops_vapi_phone_number_id;
drop index if exists idx_shops_onboarding_status;
drop index if exists idx_customers_shop_id;
drop index if exists idx_customers_shop_phone;
drop index if exists idx_customers_shop_email;
drop index if exists idx_calls_shop_id_created;
drop index if exists idx_calls_customer_id;
drop index if exists idx_quotes_shop_id_created;
drop index if exists idx_quotes_customer_id;
drop index if exists idx_quotes_status;
drop index if exists idx_quotes_call_id;
drop index if exists idx_agent_runs_shop_id_started;
drop index if exists idx_agent_runs_trigger_ref;
drop index if exists idx_agent_runs_status;
drop index if exists idx_followups_shop_id_scheduled;
drop index if exists idx_followups_status;
drop index if exists idx_followups_customer_id;
drop index if exists idx_call_extractions_call_id;

-- workspaces
create index if not exists idx_workspaces_owner_id on public.workspaces(owner_id);
create index if not exists idx_workspaces_status on public.workspaces(status);
create index if not exists idx_workspaces_vapi_phone_number_id on public.workspaces(vapi_phone_number_id) where vapi_phone_number_id is not null;

-- calls
create index if not exists idx_calls_workspace_id_created on public.calls(workspace_id, created_at desc);
create index if not exists idx_calls_vapi_call_id on public.calls(vapi_call_id) where vapi_call_id is not null;
create index if not exists idx_calls_status on public.calls(workspace_id, status);

-- integrations
create index if not exists idx_integrations_workspace_id on public.integrations(workspace_id);
create index if not exists idx_integrations_workspace_provider on public.integrations(workspace_id, provider);

-- call_insights
create index if not exists idx_call_insights_call_id on public.call_insights(call_id);
create index if not exists idx_call_insights_type on public.call_insights(insight_type);

-- appointments
create index if not exists idx_appointments_workspace_id on public.appointments(workspace_id, scheduled_at);
create index if not exists idx_appointments_status on public.appointments(workspace_id, status);
create index if not exists idx_appointments_call_id on public.appointments(call_id) where call_id is not null;

-- emails
create index if not exists idx_emails_workspace_id on public.emails(workspace_id, created_at desc);
create index if not exists idx_emails_call_id on public.emails(call_id) where call_id is not null;

-- follow_ups
create index if not exists idx_follow_ups_workspace_id on public.follow_ups(workspace_id, scheduled_for);
create index if not exists idx_follow_ups_status on public.follow_ups(workspace_id, status);
create index if not exists idx_follow_ups_call_id on public.follow_ups(call_id);

-- agent_runs
create index if not exists idx_agent_runs_workspace_id_started on public.agent_runs(workspace_id, started_at desc);
create index if not exists idx_agent_runs_status on public.agent_runs(workspace_id, status);

-- agent_steps
create index if not exists idx_agent_steps_run_id on public.agent_steps(run_id, step_number);
