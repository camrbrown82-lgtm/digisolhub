-- Allow DigiSol business inbox to pass is_hub_user() RLS checks.
insert into public.hub_allowlist (email)
values ('digisol2026@yahoo.com')
on conflict (email) do nothing;
