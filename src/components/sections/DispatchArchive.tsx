import { ArrowRight, Newspaper } from "lucide-react";
import { BrandCard } from "@/components/BrandCard";
import {
  DispatchEyebrow,
  DispatchTitle,
  DISPATCH_GRADIENT,
} from "@/components/DispatchHeadings";
import { DispatchSubscribe } from "@/components/DispatchSubscribe";
import { TrackedLink } from "@/components/TrackedLink";
import { dispatchArchiveIssues, dispatchPath } from "@/lib/dispatch";
import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

const ENGLISH_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Issue months are stored as English names ("September"). */
function monthName(month: string, locale: Locale) {
  const index = ENGLISH_MONTHS.indexOf(month);
  if (index < 0) return month;
  return new Date(Date.UTC(2000, index, 15)).toLocaleString(LOCALE_META[locale].intl, {
    month: "long",
    timeZone: "UTC",
  });
}

type DispatchArchiveProps = {
  /** Alberta landers keep local SEO framing; everywhere else stays general. */
  market?: "general" | "alberta";
};

export function DispatchArchive({ market = "general" }: DispatchArchiveProps) {
  const isAlberta = market === "alberta";
  const locale = getLocale();
  const t = getMessages(locale).dispatchArchive;

  return (
    <section
      id="dispatch"
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="dispatch-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <DispatchEyebrow>DigiSol Dispatch</DispatchEyebrow>
          <DispatchTitle as="h2" id="dispatch-heading" className="mt-3">
            {isAlberta ? t.titleAlberta : t.titleGeneral}
          </DispatchTitle>
          <p className="mt-4 text-zinc-400">{isAlberta ? t.introAlberta : t.introGeneral}</p>
        </div>
        <ul className="mt-12 grid gap-6 lg:grid-cols-1">
          {dispatchArchiveIssues().map((issue, index) => (
            <li key={issue.slug}>
              <BrandCard accent={index % 2 === 0 ? "indigo" : "blue"}>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-3xl">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                      <Newspaper className="h-4 w-4" aria-hidden="true" />
                      {t.volume(issue.volume, monthName(issue.month, locale), issue.year)}
                    </p>
                    <h3
                      className={`mt-3 text-2xl font-semibold tracking-tight ${DISPATCH_GRADIENT}`}
                    >
                      {issue.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-200">
                      {issue.excerpt}
                    </p>
                    <p className="mt-3 text-xs text-zinc-500">
                      {t.minRead(issue.readingMinutes)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <TrackedLink
                      href={dispatchPath(issue.slug)}
                      eventName="dispatch_click"
                      eventParams={{ slug: issue.slug, location: "home" }}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500"
                    >
                      {t.readIssue}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </TrackedLink>
                    <TrackedLink
                      href={`${dispatchPath(issue.slug)}#export`}
                      eventName="dispatch_click"
                      eventParams={{
                        slug: issue.slug,
                        location: "home_export",
                      }}
                      className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
                    >
                      {t.exportSocials}
                    </TrackedLink>
                  </div>
                </div>
              </BrandCard>
            </li>
          ))}
        </ul>
        <div className="mx-auto mt-12 max-w-2xl">
          <DispatchSubscribe />
        </div>
      </div>
    </section>
  );
}
