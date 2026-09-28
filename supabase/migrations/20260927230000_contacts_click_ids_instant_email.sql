-- Google Ads click ids on contacts, and the Kaylev one-instant-email-per-24h claim.
alter table public.contacts
  add column if not exists gclid text,
  add column if not exists gbraid text,
  add column if not exists wbraid text,
  add column if not exists instant_email_at timestamptz;

notify pgrst, 'reload schema';
