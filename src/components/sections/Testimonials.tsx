import { ExternalLink, Quote, Star } from "lucide-react";
import { BrandCard, type BrandAccent } from "@/components/BrandCard";
import { LOCALE_META } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { TESTIMONIALS } from "@/lib/testimonials";

const accents: BrandAccent[] = ["indigo", "sky", "blue"];

export function Testimonials() {
  const locale = getLocale();
  const t = getMessages(locale).testimonials;
  if (TESTIMONIALS.length === 0) return null;

  const translated = TESTIMONIALS.some((item) => t.quotes[item.id]);

  return (
    <section
      id="testimonials"
      className="border-t border-white/10 px-4 py-16 sm:px-6 lg:px-8"
      aria-labelledby="testimonials-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-indigo-400">
            <Quote className="h-4 w-4" aria-hidden="true" />
            {t.eyebrow}
          </p>
          <h2
            id="testimonials-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            {t.title}
          </h2>
          <p className="mt-4 text-zinc-300">{t.intro}</p>
        </div>
        <ul className="mx-auto mt-10 grid max-w-4xl gap-4 md:grid-cols-2">
          {TESTIMONIALS.map((item, i) => {
            const quote = t.quotes[item.id];
            return (
              <li key={item.id} className="h-full">
                <BrandCard
                  as="div"
                  accent={accents[i % accents.length]}
                  className="h-full"
                  innerClassName="flex h-full flex-col p-6"
                >
                  <div className="flex min-h-[1.5rem] items-center justify-between gap-3">
                    {item.rating ? (
                      <span className="flex gap-0.5" role="img" aria-label={t.stars(item.rating)}>
                        {Array.from({ length: 5 }, (_, n) => (
                          <Star
                            key={n}
                            className={`h-4 w-4 ${n < item.rating! ? "fill-amber-400 text-amber-400" : "text-zinc-600"}`}
                            aria-hidden="true"
                          />
                        ))}
                      </span>
                    ) : (
                      <span />
                    )}
                    {item.status === "in_progress" ? (
                      <span className="rounded-full border border-sky-400/40 bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-200">
                        {t.inProgress}
                      </span>
                    ) : null}
                  </div>
                  <blockquote
                    className="mt-4 flex-1 text-base leading-relaxed text-zinc-200"
                    lang={quote ? LOCALE_META[locale].intl : "en-CA"}
                  >
                    <p>“{quote ?? item.quote}”</p>
                  </blockquote>
                  <footer className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.name ?? item.company}</p>
                      {item.name ? <p className="text-xs text-zinc-400">{t.owner(item.company)}</p> : null}
                    </div>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-300 transition hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                      >
                        {t.visitSite}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : null}
                  </footer>
                </BrandCard>
              </li>
            );
          })}
        </ul>
        {translated && t.translatedNote ? (
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-zinc-500">{t.translatedNote}</p>
        ) : null}
      </div>
    </section>
  );
}
