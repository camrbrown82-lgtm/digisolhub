import { BarChart3, CalendarCheck, Search, ShieldCheck, Target, type LucideIcon } from "lucide-react";
import { BrandCard, brandAccent, type BrandAccent } from "@/components/BrandCard";
import { TrackedLink } from "@/components/TrackedLink";
import { localizePath } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

const LOOK: Record<string, { icon: LucideIcon; accent: BrandAccent }> = {
  analytics: { icon: BarChart3, accent: "sky" },
  search: { icon: Search, accent: "blue" },
  ads: { icon: Target, accent: "indigo" },
  report: { icon: CalendarCheck, accent: "blue" },
};

export function GoogleAutopilot() {
  const locale = getLocale();
  const t = getMessages(locale).googleAutopilot;
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
            {t.eyebrow}
          </p>
          <h2
            id="google-autopilot-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            {t.title}
          </h2>
          <p className="mt-4 text-zinc-400">{t.intro}</p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {t.pillars.map(({ id, title, body }) => {
            const { icon: Icon, accent } = LOOK[id] ?? LOOK.report;
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
            href={localizePath("/#contact", locale)}
            eventName="cta_click"
            eventParams={{ cta_name: "google_autopilot_check", location: "google_autopilot" }}
            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            {t.cta}
          </TrackedLink>
          <p className="max-w-xl text-xs text-zinc-500">{t.ownership}</p>
        </div>
      </div>
    </section>
  );
}
