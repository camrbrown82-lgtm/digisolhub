-- Contact marketing channel + sticky A/B test assignment.

alter table public.contacts
  add column if not exists campaign_channel text;

alter table public.contacts
  add column if not exists ab_variant text;

create index if not exists contacts_campaign_channel_idx
  on public.contacts (campaign_channel);

create index if not exists contacts_ab_variant_idx
  on public.contacts (ab_variant);

alter table public.contacts
  drop constraint if exists contacts_campaign_channel_check;

alter table public.contacts
  add constraint contacts_campaign_channel_check
  check (
    campaign_channel is null
    or campaign_channel in ('email', 'cold_call', 'door_to_door')
  );

alter table public.contacts
  drop constraint if exists contacts_ab_variant_check;

alter table public.contacts
  add constraint contacts_ab_variant_check
  check (
    ab_variant is null
    or ab_variant in ('A', 'B')
  );

notify pgrst, 'reload schema';
