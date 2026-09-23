import type { LocationPage } from "@/lib/locations";
import { DIGISOL_ADDRESS_LINE, DIGISOL_PHONE } from "@/lib/site";

type LocalCitySeoProps = {
  page: LocationPage;
};

/**
 * Unique local-intent copy so city landers are not thin homepage clones.
 * Targets map-pack + organic queries like “{City} web design”.
 */
export function LocalCitySeo({ page }: LocalCitySeoProps) {
  const isHomeBase = page.slug === "airdrie";

  return (
    <section
      id="local-search"
      className="border-t border-white/10 px-4 py-16 sm:px-6 lg:px-8"
      aria-labelledby="local-search-heading"
    >
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
          Local search · {page.name}
        </p>
        <h2
          id="local-search-heading"
          className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
        >
          {isHomeBase
            ? "Airdrie web design, development & marketing"
            : `${page.name} website design, development & marketing`}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-zinc-300">
          {isHomeBase
            ? "DigiSol is headquartered in Airdrie. When someone searches for Airdrie web design, Airdrie web development, or Airdrie marketing, they should find a real local studio — not a national template shop. We design and build the site, then run the SEO and campaigns that help nearby customers book you."
            : page.intro}
        </p>

        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {isHomeBase
                ? "Website design & development in Airdrie"
                : `Website design & development in ${page.name}`}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Custom Next.js sites — not page-builder templates. Fast load times,
              clear service pages, mobile-first layouts, and conversion paths
              built around how {page.name} customers actually inquire.{" "}
              {isHomeBase
                ? "Whether you need a rebuild for a trades company, a professional-services site, or a storefront for an Airdrie retailer, engineering and design stay under one roof."
                : `We work with ${page.name} companies from DigiSol’s Airdrie base, with the same NAP and Google Business Profile signals that support local rankings.`}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">
              {isHomeBase
                ? "Airdrie marketing, SEO & paid campaigns"
                : `${page.name} marketing, SEO & paid campaigns`}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Local SEO for map-pack and organic visibility, Google Ads and Meta
              campaigns geotargeted to {page.name} and {page.nearby}, plus CRO so
              traffic turns into booked calls. Off-page work — citations,
              reviews, and consistent name/address/phone — is part of the plan,
              not an afterthought.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">
              Why local businesses choose DigiSol
            </h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-400">
              {page.focus.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-indigo-400/25 bg-indigo-500/10 px-5 py-4">
            <p className="text-sm font-medium text-sky-200">
              DigiSol · {DIGISOL_ADDRESS_LINE}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Call{" "}
              <a
                href={`tel:${DIGISOL_PHONE.replace(/[^\d+]/g, "")}`}
                className="text-sky-300 underline-offset-2 hover:underline"
              >
                {DIGISOL_PHONE}
              </a>{" "}
              or use the form below for a free strategy consult
              {isHomeBase ? " — coffee in Airdrie welcome." : "."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
