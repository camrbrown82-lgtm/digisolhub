import { TrackedLink } from "@/components/TrackedLink";
import { WebsiteAuditExport } from "@/components/WebsiteAuditExport";
import { WebsiteAuditVideo } from "@/components/WebsiteAuditVideo";
import { WEBSITE_AUDIT_PAGE_PATH } from "@/lib/media";

export function WebsiteAudit() {
  return (
    <section
      id="media"
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="website-audit-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            Media
          </p>
          <h2
            id="website-audit-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            See How DigiSol Audits Your Website
          </h2>
          <p className="mt-4 text-zinc-400">
            A short presentation on what Alberta businesses should fix first —
            design, speed, local SEO, and the path from visit to booked work.
            Export ready captions for Facebook, LinkedIn, and Instagram below.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-4xl space-y-6">
          <WebsiteAuditVideo />
          <WebsiteAuditExport location="homepage_website_audit" />
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <TrackedLink
              href="/#contact"
              eventName="cta_click"
              eventParams={{
                cta_name: "book_consultation",
                location: "homepage_website_audit",
              }}
              className="inline-flex items-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              Book a consultation
            </TrackedLink>
            <a
              href={WEBSITE_AUDIT_PAGE_PATH}
              className="text-sm font-medium text-indigo-300 transition hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              Full media page &amp; transcript
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
