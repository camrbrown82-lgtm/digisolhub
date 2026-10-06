import { TrackedLink } from "@/components/TrackedLink";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { ADS_ROBOT_PAGE_PATH } from "@/lib/media";

/** Short invite on the home page. The videos themselves live on /media. */
export function WebsiteAudit() {
  const locale = getLocale();
  const t = getMessages(locale).websiteAudit;
  return (
    <section
      id="media"
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="media-heading"
    >
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
          {t.eyebrow}
        </p>
        <h2
          id="media-heading"
          className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
        >
          {t.title}
        </h2>
        <p className="mt-4 text-zinc-400">{t.intro}</p>
        <TrackedLink
          href={ADS_ROBOT_PAGE_PATH}
          eventName="cta_click"
          eventParams={{ cta_name: "watch_media", location: "homepage_media" }}
          className="mt-8 inline-flex items-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
        >
          {t.watchVideos}
        </TrackedLink>
      </div>
    </section>
  );
}
