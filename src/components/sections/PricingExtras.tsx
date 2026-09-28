import { ArrowRight, Check, ChevronDown, Minus } from "lucide-react";
import { BrandCard, type BrandAccent } from "@/components/BrandCard";
import { ALBERTA_GST_PERCENT, PRICING_PACKAGES, formatCad } from "@/lib/pricing";
import {
  LOCAL_PRICE_COMPARISON,
  PACKAGE_COMPARISON,
  PRICING_FAQ,
  PRICING_FROM,
  PRICING_VALUE_POINTS,
} from "@/lib/pricingContent";

const section = "border-t border-white/10 px-4 py-16 sm:px-6 lg:px-8";
const eyebrow = "text-sm font-semibold uppercase tracking-wider text-indigo-400";
const heading = "mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl";

export function PricingIntro() {
  return (
    <section className="px-4 pb-12 pt-10 text-center sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <p className={eyebrow}>Transparent pricing</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Custom websites from {PRICING_FROM}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-300">
          Clear packages for design, build, local SEO and ads, with every price
          published. No templates, no surprise invoices. Prices in CAD, plus{" "}
          {ALBERTA_GST_PERCENT}% GST.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="#compare"
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500"
          >
            Compare packages
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <a
            href="#quote"
            className="inline-flex items-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/5"
          >
            Get a free quote
          </a>
        </div>
      </div>
    </section>
  );
}

const valueAccents: BrandAccent[] = ["sky", "blue", "indigo", "blue"];

export function PricingValue() {
  return (
    <section className="px-4 pb-16 sm:px-6 lg:px-8" aria-label="Why DigiSol">
      <ul className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRICING_VALUE_POINTS.map((point, i) => (
          <li key={point.title} className="h-full">
            <BrandCard as="div" accent={valueAccents[i]} className="h-full" innerClassName="p-6">
              <h2 className="text-base font-semibold text-white">{point.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{point.body}</p>
            </BrandCard>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <>
        <Check className="mx-auto h-4 w-4 text-sky-300" aria-hidden="true" />
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <Minus className="mx-auto h-4 w-4 text-zinc-600" aria-hidden="true" />
        <span className="sr-only">Not included</span>
      </>
    );
  }
  return <span className="text-sm text-zinc-200">{value}</span>;
}

export function PackageComparison() {
  return (
    <section id="compare" className={`${section} scroll-mt-24`} aria-labelledby="compare-heading">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className={eyebrow}>Packages at a glance</p>
          <h2 id="compare-heading" className={heading}>
            What each package includes
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            Every package is a custom design and build. Higher tiers add local
            SEO, automated follow-up and paid ads on top.
          </p>
        </div>
        <p className="mt-8 text-center text-xs text-zinc-500 sm:hidden">
          Swipe the table sideways to compare all three.
        </p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-900/40 sm:mt-10">
          <table className="w-full min-w-[36rem] text-left">
            <caption className="sr-only">DigiSol website packages compared</caption>
            <thead>
              <tr className="border-b border-white/10">
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-[34%] bg-zinc-950 p-4 text-sm font-medium text-zinc-400 sm:bg-transparent"
                >
                  Package
                </th>
                {PRICING_PACKAGES.map((pkg) => (
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
                      {formatCad(pkg.amount)}
                    </span>
                    <span className="block text-xs font-normal text-zinc-500">one-time, plus GST</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PACKAGE_COMPARISON.map((row) => (
                <tr key={row.label} className="border-b border-white/5 last:border-0">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-zinc-950 p-3 text-sm font-normal text-zinc-300 sm:bg-transparent sm:p-4"
                  >
                    {row.label}
                  </th>
                  {row.cells.map((cell, i) => (
                    <td
                      key={PRICING_PACKAGES[i].id}
                      className={`p-4 text-center ${PRICING_PACKAGES[i].featured ? "bg-indigo-500/10" : ""}`}
                    >
                      <CellValue value={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-center text-sm text-zinc-500">
          Pick a package, monthly growth and add-ons in the builder below, or{" "}
          <a href="#quote" className="font-medium text-indigo-300 hover:text-indigo-200">
            get a free quote
          </a>{" "}
          if you&apos;re not sure.
        </p>
      </div>
    </section>
  );
}

export function LocalPriceComparison() {
  return (
    <section className={section} aria-labelledby="local-pricing-heading">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className={eyebrow}>How we compare</p>
          <h2 id="local-pricing-heading" className={heading}>
            What websites typically cost in Alberta
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
            Growth Engine includes local SEO and lead follow-up that are usually
            billed separately, at a price below a typical agency build.
          </p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LOCAL_PRICE_COMPARISON.map((item) => (
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
        <p className="mt-4 text-center text-xs text-zinc-500">
          Typical ranges from 2026 Calgary and Canadian website pricing guides,
          before tax. Every project differs, so compare what&apos;s included, not
          just the price.
        </p>
      </div>
    </section>
  );
}

export function PricingFaq() {
  return (
    <section id="pricing-faq" className={section} aria-labelledby="pricing-faq-heading">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className={eyebrow}>Questions</p>
          <h2 id="pricing-faq-heading" className={heading}>
            Pricing and process FAQ
          </h2>
        </div>
        <div className="mt-10 space-y-3">
          {PRICING_FAQ.map((item) => (
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

export function pricingFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PRICING_FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
