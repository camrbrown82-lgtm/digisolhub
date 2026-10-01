import {
  Clock3,
  MessageCircle,
  Radar,
  Share2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { BrandCard, brandAccent, type BrandAccent } from "@/components/BrandCard";
import { OpenKaylevAuditButton } from "@/components/OpenKaylevAuditButton";
import { TrackedLink } from "@/components/TrackedLink";
import { localizePath } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

/** Balanced 2×2 pillars — no featured full-width gap. Order matches `kaylev.pillars`. */
const PILLAR_STYLE: { icon: LucideIcon; accent: BrandAccent }[] = [
  { icon: MessageCircle, accent: "sky" },
  { icon: Radar, accent: "blue" },
  { icon: Share2, accent: "indigo" },
  { icon: Clock3, accent: "blue" },
];

type KaylevValuePropProps = {
  locationName?: string;
  analyticsLocation?: string;
};

export function KaylevValueProp({
  locationName,
  analyticsLocation = "homepage_kaylev",
}: KaylevValuePropProps) {
  const locale = getLocale();
  const t = getMessages(locale).kaylev;
  const contactHref = localizePath("/#contact", locale);
  const advantageLine = locationName ? t.advantageCity(locationName) : t.advantage;

  return (
    <section
      id="kaylev"
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="kaylev-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            {t.eyebrow}
          </p>
          <h2
            id="kaylev-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            {t.title}
          </h2>
          <p className="mt-4 text-zinc-400">{t.intro}</p>
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          {t.pillars.map(({ title, body }, index) => {
            const { icon: Icon, accent } = PILLAR_STYLE[index % PILLAR_STYLE.length];
            const styles = brandAccent[accent];
            return (
              <li key={title} className="h-full">
                <BrandCard accent={accent} className="h-full">
                  <span
                    className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold text-white">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-200">
                    {body}
                  </p>
                </BrandCard>
              </li>
            );
          })}

          <li className="col-span-full">
            <BrandCard accent="indigo" className="h-full">
              <div className="text-center">
                <span
                  className={`mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl ${brandAccent.indigo.icon}`}
                >
                  <Sparkles className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-xl font-semibold text-white">
                  {t.advantageTitle}
                </h3>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-200">
                  {advantageLine}
                </p>
                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <OpenKaylevAuditButton
                    location={analyticsLocation}
                    className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                  >
                    {t.freeAudit}
                  </OpenKaylevAuditButton>
                  <TrackedLink
                    href={contactHref}
                    eventName="cta_click"
                    eventParams={{
                      cta_name: "kaylev_book_consult",
                      location: analyticsLocation,
                    }}
                    className="inline-flex items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 px-6 py-3 text-sm font-semibold text-blue-200 transition hover:border-blue-300 hover:bg-blue-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
                  >
                    {t.bookConsult}
                  </TrackedLink>
                </div>
                <p className="mt-4 text-xs text-zinc-500">{t.chatHint}</p>
              </div>
            </BrandCard>
          </li>
        </ul>
      </div>
    </section>
  );
}
