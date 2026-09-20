import { ArrowRight, Newspaper } from "lucide-react";
import { BrandCard } from "@/components/BrandCard";
import { TrackedLink } from "@/components/TrackedLink";
import { DISPATCH_ISSUES, dispatchPath } from "@/lib/dispatch";

export function DispatchArchive() {
  return (
    <section
      id="dispatch"
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="dispatch-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            DigiSol Dispatch
          </p>
          <h2
            id="dispatch-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            Monthly off-page SEO for Alberta companies
          </h2>
          <p className="mt-4 text-zinc-400">
            Local SEO, citations, reviews, and Next.js engineering notes for
            Airdrie, Calgary, Edmonton, and Red Deer. Read the issue, then
            export it to your socials.
          </p>
        </div>
        <ul className="mt-12 grid gap-6 lg:grid-cols-1">
          {DISPATCH_ISSUES.map((issue, index) => (
            <li key={issue.slug}>
              <BrandCard accent={index % 2 === 0 ? "indigo" : "blue"}>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-3xl">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
                      <Newspaper className="h-4 w-4" aria-hidden="true" />
                      Volume {issue.volume} · {issue.month} {issue.year}
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                      {issue.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-200">
                      {issue.excerpt}
                    </p>
                    <p className="mt-3 text-xs text-zinc-500">
                      {issue.readingMinutes} min read
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <TrackedLink
                      href={dispatchPath(issue.slug)}
                      eventName="dispatch_click"
                      eventParams={{ slug: issue.slug, location: "home" }}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500"
                    >
                      Read the issue
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </TrackedLink>
                    <TrackedLink
                      href={`${dispatchPath(issue.slug)}#export`}
                      eventName="dispatch_click"
                      eventParams={{ slug: issue.slug, location: "home_export" }}
                      className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
                    >
                      Export to socials
                    </TrackedLink>
                  </div>
                </div>
              </BrandCard>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
