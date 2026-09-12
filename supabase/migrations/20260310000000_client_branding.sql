-- Per-company brand kit used by emails, AI copy, and posters.

alter table public.clients
  add column if not exists branding jsonb not null default '{}'::jsonb;

insert into public.clients (name, domain, notes, branding)
select
  'DigiSol',
  'wwwdigisol.com',
  'House brand for DigiSol.',
  '{
    "tagline": "Where engineering meets growth",
    "voice": "Direct, human, and specific. Talk like a builder who also understands the sale. No corporate fog, no agency theater. Proud of the craft without sounding stiff. Short sentences. One clear next step.",
    "audience": "Alberta and Canadian owners, operators, and auction or service businesses who need a site that converts — not a template that looks busy.",
    "primaryColor": "#4f46e5",
    "secondaryColor": "#09090b",
    "accentColor": "#60a5fa",
    "backgroundColor": "#09090b",
    "fonts": "Inter, Arial, Helvetica, sans-serif",
    "doSay": "engineering meets growth, high-converting, custom build, no template bloat, one roof, first click to closed deal, ship, convert, clear next step",
    "dontSay": "synergy, leverage, world-class, cutting-edge, full-service solutions, digital transformation, utilize, unlock your potential",
    "extra": "House brand for DigiSol (wwwdigisol.com). Dual threat: custom Next.js / React engineering plus growth marketing. Fast pages, strong SEO, forms that become leads. Based in Alberta, Canada. Contact cam.r.brown82@gmail.com or +1-587-577-0782. Logo is the DigiSol wordmark on /logo.jpg. Emails and posters should feel dark zinc with indigo/blue glow, not comic or pastel."
  }'::jsonb
where not exists (
  select 1 from public.clients where lower(name) = 'digisol'
);
