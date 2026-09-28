import { ArrowRight, Check, ChevronDown, Minus } from "lucide-react";
import { BrandCard, type BrandAccent } from "@/components/BrandCard";
import { LOCALE_META, type Locale } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { localizePricingItem } from "@/lib/i18n/pricing";
import { ALBERTA_GST_PERCENT, PRICING_PACKAGES, formatCad } from "@/lib/pricing";
import { pricingFrom } from "@/lib/pricingContent";

const section = "border-t border-white/10 px-4 py-16 sm:px-6 lg:px-8";
const eyebrow = "text-sm font-semibold uppercase tracking-wider text-indigo-400";
const heading = "mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl";

export function PricingIntro() {
  const locale = getLocale();
  const t = getMessages(locale).pricingPage;
  return (
    <section className="px-4 pb-12 pt-10 text-center sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className={eyebrow}>{t.introEyebrow}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {t.introTitle(pricingFrom(LOCALE_META[locale].intl))}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-300">
          {t.introBody(ALBERTA_GST_PERCENT)}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="#compare"
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500"
          >
            {t.compareCta}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <a
            href="#quote"
            className="inline-flex items-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/5"
          >
            {t.quoteCta}
          </a>
        </div>
      </div>
    </section>
  );
}

const valueAccents: BrandAccent[] = ["sky", "blue", "indigo", "blue"];

export function PricingValue() {
  const t = getMessages(getLocale()).pricingPage;
  return (
    <section className="px-4 pb-16 sm:px-6 lg:px-8" aria-label={t.valueAria}>
      <ul className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {t.valuePoints.map((point, i) => (
          <li key={point.title} className="h-full">
            <BrandCard as="div" accent={valueAccents[i % valueAccents.length]} className="h-full" innerClassName="p-6">
              <h2 className="text-base font-semibold text-white">{point.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{point.body}</p>
            </BrandCard>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CellValue({ value, included, notIncluded }: { value: boolean | string; included: string; notIncluded: string }) {
  if (value === true) {
    return (
      <>
        <Check className="mx-auto h-4 w-4 text-sky-300" aria-hidden="true" />
        <span className="sr-only">{included}</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <Minus className="mx-auto h-4 w-4 text-zinc-600" aria-hidden="true" />
        <span className="sr-only">{notIncluded}</span>
      </>
    );
  }
  return <span className="text-sm text-zinc-200">{value}</span>;
}

export function PackageComparison() {
  const locale = getLocale();
  const t = getMessages(locale).pricingPage;
  const packages = PRICING_PACKAGES.map((pkg) => localizePricingItem(pkg, locale));
  return (
    <section id="compare" className={`${section} scroll-mt-24`} aria-labelledby="compare-heading">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className={eyebrow}>{t.compareEyebrow}</p>
          <h2 id="compare-heading" className={heading}>
            {t.compareTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">{t.compareBody}</p>
        </div>
        <p className="mt-8 text-center text-xs text-zinc-500 sm:hidden">{t.swipe}</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-900/40 sm:mt-10">
          <table className="w-full min-w-[36rem] text-left">
            <caption className="sr-only">{t.tableCaption}</caption>
            <thead>
              <tr className="border-b border-white/10">
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-[34%] bg-zinc-950 p-4 text-sm font-medium text-zinc-400 sm:bg-transparent"
                >
                  {t.packageHeader}
                </th>
                {packages.map((pkg) => (
                  <th
                    key={pkg.id}
                    scope="col"
                    className={`p-4 text-center ${pkg.featured ? "bg-indigo-500/10" : ""}`}
                  >
                    {pkg.badge ? (
                      <span className="block text-xs font-semibold uppercase tracking-wider text-indigo-300">
                        {pkg.badge}
                      </span>
                    ) : null}
                    <span className="mt-1 block text-lg font-semibold text-white">{pkg.name}</span>
                    <span className="mt-1 block text-2xl font-semibold text-white">
                      {formatCad(pkg.amount, 0, LOCALE_META[locale].intl)}
                    </span>
                    <span className="block text-xs font-normal text-zinc-500">{t.oneTimePlusGst}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((row) => (
                <tr key={row.label} className="border-b border-white/5 last:border-0">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-zinc-950 p-3 text-sm font-normal text-zinc-300 sm:bg-transparent sm:p-4"
                  >
                    {row.label}
                  </th>
                  {row.cells.map((cell, i) => (
                    <td
                      key={packages[i].id}
                      className={`p-4 text-center ${packages[i].featured ? "bg-indigo-500/10" : ""}`}
                    >
                      <CellValue value={cell} included={t.included} notIncluded={t.notIncluded} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-center text-sm text-zinc-500">
          {t.compareFooterPre}{" "}
          <a href="#quote" className="font-medium text-indigo-300 hover:text-indigo-200">
            {t.compareFooterLink}
          </a>{" "}
          {t.compareFooterPost}
        </p>
      </div>
    </section>
  );
}

export function LocalPriceComparison() {
  const t = getMessages(getLocale()).pricingPage;
  return (
    <section className={section} aria-labelledby="local-pricing-heading">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className={eyebrow}>{t.localEyebrow}</p>
          <h2 id="local-pricing-heading" className={heading}>
            {t.localTitle}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">{t.localBody}</p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.localItems.map((item) => (
            <li
              key={item.option}
              className={`rounded-2xl border p-5 ${
                item.highlight
                  ? "border-indigo-400/60 bg-indigo-500/15 shadow-lg shadow-indigo-500/10"
                  : "border-white/10 bg-zinc-900/40"
              }`}
            >
              <h3 className="text-base font-semibold text-white">{item.option}</h3>
              <p className={`mt-2 text-xl font-semibold ${item.highlight ? "text-sky-300" : "text-zinc-100"}`}>
                {item.price}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.note}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-center text-xs text-zinc-500">{t.localNote}</p>
      </div>
    </section>
  );
}

export function PricingFaq() {
  const t = getMessages(getLocale()).pricingPage;
  return (
    <section id="pricing-faq" className={section} aria-labelledby="pricing-faq-heading">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className={eyebrow}>{t.faqEyebrow}</p>
          <h2 id="pricing-faq-heading" className={heading}>
            {t.faqTitle}
          </h2>
        </div>
        <div className="mt-10 space-y-3">
          {t.faq.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border border-white/10 bg-zinc-900/40 p-5 open:border-indigo-400/30"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-white [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-indigo-300 transition group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function pricingFaqJsonLd(locale: Locale = getLocale()) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: LOCALE_META[locale].intl,
    mainEntity: getMessages(locale).pricingPage.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
