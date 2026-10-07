-- Allow the professional DigiSol inbox to pass is_hub_user() RLS checks.
insert into public.hub_allowlist (email)
values ('cam@wwwdigisol.com')
on conflict (email) do nothing;
