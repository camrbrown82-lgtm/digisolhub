-- Field and conversation lead pipeline for DigiSol hub.
-- Tracks a lead from first touch through close, with an activity timeline.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  name text,
  email text,
  phone text,
  company text,
  service text,
  source text not null default 'door_to_door',
  channel text not null default 'in_person',
  location text,
  campaign text,
  stage text not null default 'new',
  estimated_value numeric(12, 2),
  actual_value numeric(12, 2),
  lost_reason text,
  next_follow_up_at timestamptz,
  first_touch_at timestamptz not null default now(),
  last_touch_at timestamptz not null default now(),
  closed_at timestamptz,
  notes_preview text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_has_identity check (
    coalesce(
      nullif(btrim(name), ''),
      nullif(btrim(email), ''),
      nullif(btrim(phone), ''),
      nullif(btrim(company), '')
    ) is not null
  )
);

create index if not exists leads_client_id_idx on public.leads (client_id);
create index if not exists leads_stage_idx on public.leads (stage);
create index if not exists leads_source_idx on public.leads (source);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_email_lower_idx on public.leads (lower(email));
create index if not exists leads_contact_id_idx on public.leads (contact_id);

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute procedure public.set_updated_at();

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  type text not null default 'note',
  body text,
  from_stage text,
  to_stage text,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists lead_activities_lead_id_idx
  on public.lead_activities (lead_id, occurred_at desc);

create or replace function public.touch_lead_from_activity()
returns trigger
language plpgsql
as $$
begin
  update public.leads
  set last_touch_at = coalesce(new.occurred_at, now())
  where id = new.lead_id;
  return new;
end;
$$;

drop trigger if exists lead_activities_touch_lead on public.lead_activities;
create trigger lead_activities_touch_lead
  after insert on public.lead_activities
  for each row execute procedure public.touch_lead_from_activity();

alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

drop policy if exists "hub leads" on public.leads;
create policy "hub leads" on public.leads
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());

drop policy if exists "hub lead_activities" on public.lead_activities;
create policy "hub lead_activities" on public.lead_activities
  for all to authenticated
  using (public.is_hub_user())
  with check (public.is_hub_user());
