-- DigiSol Hub — operator self-test checks
-- Run in: Supabase → SQL Editor → New query → Run
-- Email used: digisol2026@yahoo.com (and cam.r.brown82@gmail.com)

-- 1) Confirm your CRM contacts exist
select id, email, name, company, tags, client_id, created_at
from contacts
where lower(email) in (
  'digisol2026@yahoo.com',
  'cam.r.brown82@gmail.com'
)
order by created_at desc;

-- 2) If missing, insert Yahoo (safe — skips if email already there)
insert into contacts (email, name, company, source, tags, client_id)
select
  'digisol2026@yahoo.com',
  'Cameron Brown',
  'DigiSol',
  'manual',
  array['operator', 'self_test']::text[],
  (select id from clients order by created_at asc limit 1)
where not exists (
  select 1 from contacts where lower(email) = 'digisol2026@yahoo.com'
);

-- 3) Workflow runs for YOU (status + log steps)
select
  wr.id,
  wr.status,
  wr.started_at,
  wr.finished_at,
  wr.log,
  c.email,
  w.name as workflow_name
from workflow_runs wr
join contacts c on c.id = wr.contact_id
left join workflows w on w.id = wr.workflow_id
where lower(c.email) in (
  'digisol2026@yahoo.com',
  'cam.r.brown82@gmail.com'
)
order by wr.started_at desc
limit 20;

-- 4) Sends that hit Resend (resend_id should be non-null when delivered to Resend)
select
  s.id,
  s.status,
  s.resend_id,
  s.created_at,
  c.email,
  s.template_id
from sends s
join contacts c on c.id = s.contact_id
where lower(c.email) in (
  'digisol2026@yahoo.com',
  'cam.r.brown82@gmail.com'
)
order by s.created_at desc
limit 20;

-- 5) Last 20 sends overall (see the 9 audited-company run)
select
  s.id,
  s.status,
  s.resend_id,
  s.created_at,
  c.email,
  c.company
from sends s
left join contacts c on c.id = s.contact_id
order by s.created_at desc
limit 20;
