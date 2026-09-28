import { BarChart3, CalendarCheck, Search, ShieldCheck, Target, type LucideIcon } from "lucide-react";
import { BrandCard, brandAccent, type BrandAccent } from "@/components/BrandCard";
import { TrackedLink } from "@/components/TrackedLink";
import { GOOGLE_AUTOPILOT_PILLARS } from "@/lib/googleAutopilot";

const LOOK: Record<(typeof GOOGLE_AUTOPILOT_PILLARS)[number]["id"], { icon: LucideIcon; accent: BrandAccent }> = {
  analytics: { icon: BarChart3, accent: "sky" },
  search: { icon: Search, accent: "blue" },
  ads: { icon: Target, accent: "indigo" },
  report: { icon: CalendarCheck, accent: "blue" },
};

export function GoogleAutopilot() {
  return (
    <section
      id="google-autopilot"
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="google-autopilot-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-indigo-400">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Google, checked every week
          </p>
          <h2
            id="google-autopilot-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            Your Analytics, Search Console and Ads, Tuned Every Monday
          </h2>
          <p className="mt-4 text-zinc-400">
            Most businesses set up Google once and never look again. Settings drift, tracking
            breaks and ad money leaks. We check your Google accounts every week and fix what&apos;s
            wrong, usually in one click.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {GOOGLE_AUTOPILOT_PILLARS.map(({ id, title, body }) => {
            const { icon: Icon, accent } = LOOK[id];
            return (
              <li key={id} className="h-full">
                <BrandCard accent={accent} className="h-full">
                  <span
                    className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${brandAccent[accent].icon}`}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-200">{body}</p>
                </BrandCard>
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <TrackedLink
            href="/#contact"
            eventName="cta_click"
            eventParams={{ cta_name: "google_autopilot_check", location: "google_autopilot" }}
            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Ask for a Google setup check
          </TrackedLink>
          <p className="max-w-xl text-xs text-zinc-500">
            You stay the owner of every Google account. You just add DigiSol as a user, and you
            can remove us anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
