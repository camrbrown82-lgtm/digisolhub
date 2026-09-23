import {
  Clock3,
  MessageCircle,
  Radar,
  Share2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";

type Pillar = {
  icon: LucideIcon;
  title: string;
  body: string;
};

const PILLARS: Pillar[] = [
  {
    icon: MessageCircle,
    title: "24/7 Midnight Lead Capture",
    body: "Never miss a high-intent prospect. Kaylev catches social and website leads around the clock and engages them instantly—before interest cools down.",
  },
  {
    icon: Radar,
    title: "Autonomous Site Audits & Local SEO",
    body: "Kaylev scans your web presence, flags performance leaks, and strengthens local ranking so customers in your area find you first.",
  },
  {
    icon: Share2,
    title: "Multi-Channel Campaign Orchestration",
    body: "From automated email follow-ups to coordinated social touchpoints, Kaylev runs outreach pipelines without a manual click for every step.",
  },
  {
    icon: Clock3,
    title: "15+ Hours/Week Recovered",
    body: "Cut repetitive data entry, manual posting, and basic follow-ups so you can focus on closing deals and running the business.",
  },
];

type KaylevValuePropProps = {
  /** Optional city/region label for geo landing pages */
  locationName?: string;
  /** Analytics location tag */
  analyticsLocation?: string;
};

export function KaylevValueProp({
  locationName,
  analyticsLocation = "homepage_kaylev",
}: KaylevValuePropProps) {
  const advantageLine = locationName
    ? `You get a world-class, custom-built website plus a dedicated AI employee on day one—built to grow ${locationName} businesses. No bloated monthly SaaS fees—just pure, automated growth.`
    : "You get a world-class, custom-built website plus a dedicated AI employee on day one. No bloated monthly SaaS fees—just pure, automated growth.";

  return (
    <section
      id="kaylev"
      className="relative border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="kaylev-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.12),_transparent_55%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-indigo-400">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            DigiSol AI · Kaylev
          </p>
          <h2
            id="kaylev-heading"
            className="mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight"
          >
            Meet Kaylev: Your 24/7 Autonomous Growth Engine
          </h2>
          <p className="mt-4 text-lg text-zinc-300">
            Most websites just sit there. Yours should actively close deals.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
            How Kaylev drives real revenue for your business—lead capture, audits,
            campaigns, and hours back every week.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <li
                key={pillar.title}
                className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition hover:border-indigo-400/30"
              >
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-white">
                      {pillar.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      {pillar.body}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 rounded-2xl border border-indigo-400/25 bg-gradient-to-br from-indigo-500/10 via-zinc-950/40 to-sky-500/5 p-6 text-center sm:p-8">
          <p className="text-sm font-medium text-indigo-200">The DigiSol Advantage</p>
          <p className="mx-auto mt-2 max-w-2xl text-base leading-relaxed text-zinc-300">
            {advantageLine}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedLink
              href="/#contact"
              eventName="cta_click"
              eventParams={{
                cta_name: "kaylev_free_audit",
                location: analyticsLocation,
              }}
              className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Get a free website audit
            </TrackedLink>
            <TrackedLink
              href="/#contact"
              eventName="cta_click"
              eventParams={{
                cta_name: "kaylev_book_consult",
                location: analyticsLocation,
              }}
              className="inline-flex items-center justify-center rounded-full border border-indigo-400/40 bg-transparent px-6 py-3 text-sm font-semibold text-indigo-200 transition hover:border-indigo-300 hover:bg-indigo-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Book a consultation
            </TrackedLink>
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            Prefer chat? Open Kaylev on this page and drop your URL for an instant
            audit walkthrough.
          </p>
        </div>
      </div>
    </section>
  );
}
