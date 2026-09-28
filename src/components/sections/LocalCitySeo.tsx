import { getServerMessages } from "@/lib/i18n/server";
import type { LocationPage } from "@/lib/locations";
import { DIGISOL_ADDRESS_LINE, DIGISOL_PHONE } from "@/lib/site";

type LocalCitySeoProps = {
  /** Already localized (see `localizedLocationPage`). */
  page: LocationPage;
};

/**
 * Unique local-intent copy so city landers are not thin homepage clones.
 * Targets map-pack + organic queries like “{City} web design”.
 */
export function LocalCitySeo({ page }: LocalCitySeoProps) {
  const isHomeBase = page.slug === "airdrie";
  const t = getServerMessages().localSeo;

  return (
    <section
      id="local-search"
      className="border-t border-white/10 px-4 py-16 sm:px-6 lg:px-8"
      aria-labelledby="local-search-heading"
    >
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
          {t.eyebrow(page.name)}
        </p>
        <h2
          id="local-search-heading"
          className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
        >
          {isHomeBase ? t.headingHome : t.heading(page.name)}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-zinc-300">
          {isHomeBase ? t.bodyHome : page.intro}
        </p>

        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-white">{t.designHeading(page.name)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {t.designBody(page.name)}{" "}
              {isHomeBase ? t.designHome : t.designCity(page.name)}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">{t.marketingHeading(page.name)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {t.marketingBody(page.name, page.nearby)}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">{t.whyTitle}</h3>
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
              {t.call}{" "}
              <a
                href={`tel:${DIGISOL_PHONE.replace(/[^\d+]/g, "")}`}
                className="text-sky-300 underline-offset-2 hover:underline"
              >
                {DIGISOL_PHONE}
              </a>{" "}
              {t.orForm}
              {isHomeBase ? t.coffee : "."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
