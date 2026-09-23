import {
  Clock3,
  MessageCircle,
  Radar,
  Share2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { BrandCard, brandAccent, type BrandAccent } from "@/components/BrandCard";
import { TrackedLink } from "@/components/TrackedLink";

type Pillar = {
  icon: LucideIcon;
  title: string;
  body: string;
  accent: BrandAccent;
  featured?: boolean;
};

const PILLARS: Pillar[] = [
  {
    icon: MessageCircle,
    title: "24/7 Midnight Lead Capture",
    body: "Never miss a high-intent prospect. Kaylev catches social and website leads around the clock and engages them instantly—before interest cools down.",
    accent: "sky",
    featured: true,
  },
  {
    icon: Radar,
    title: "Autonomous Site Audits & Local SEO",
    body: "Kaylev scans your web presence, flags performance leaks, and strengthens local ranking so customers in your area find you first.",
    accent: "blue",
  },
  {
    icon: Share2,
    title: "Multi-Channel Campaign Orchestration",
    body: "From automated email follow-ups to coordinated social touchpoints, Kaylev runs outreach pipelines without a manual click for every step.",
    accent: "indigo",
  },
  {
    icon: Clock3,
    title: "15+ Hours/Week Recovered",
    body: "Cut repetitive data entry, manual posting, and basic follow-ups so you can focus on closing deals and running the business.",
    accent: "blue",
  },
];

type KaylevValuePropProps = {
  locationName?: string;
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
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="kaylev-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            DigiSol AI · Kaylev
          </p>
          <h2
            id="kaylev-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            Meet Kaylev: Your 24/7 Autonomous Growth Engine
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            Most websites just sit there. Yours should actively close deals.
            Lead capture, audits, campaigns, and hours back every week.
          </p>
        </div>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2">
          {PILLARS.map(({ icon: Icon, title, body, accent, featured }) => {
            const styles = brandAccent[accent];
            return (
              <li
                key={title}
                className={featured ? "h-full sm:col-span-2" : "h-full"}
              >
                <BrandCard accent={accent} className="h-full">
                  <div
                    className={
                      featured
                        ? "flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6"
                        : ""
                    }
                  >
                    <span
                      className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <div>
                      <h3
                        className={`text-xl font-semibold text-white ${featured ? "" : "mt-5"}`}
                      >
                        {title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-zinc-200">
                        {body}
                      </p>
                    </div>
                  </div>
                </BrandCard>
              </li>
            );
          })}
        </ul>

        <div className="mt-10">
          <BrandCard accent="indigo" className="h-full">
            <div className="text-center">
              <span
                className={`mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl ${brandAccent.indigo.icon}`}
              >
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl font-semibold text-white">
                The DigiSol Advantage
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-200">
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
                  className="inline-flex items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 px-6 py-3 text-sm font-semibold text-blue-200 transition hover:border-blue-300 hover:bg-blue-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                >
                  Book a consultation
                </TrackedLink>
              </div>
              <p className="mt-4 text-xs text-zinc-500">
                Prefer chat? Open Kaylev on this page and drop your URL for an
                instant audit walkthrough.
              </p>
            </div>
          </BrandCard>
        </div>
      </div>
    </section>
  );
}
