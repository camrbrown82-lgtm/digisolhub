import { ArrowRight, Code2, Megaphone, Palette, TrendingUp, ShoppingBag, type LucideIcon } from "lucide-react";
import { BrandCard, brandAccent, type BrandAccent } from "@/components/BrandCard";
import { LOCALE_META, localizePath } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { pricingFrom } from "@/lib/pricingContent";
import type { HomeCopy } from "@/lib/visitorRegion";

export function Services({ copy }: { copy: HomeCopy }) {
  const locale = getLocale();
  const t = getMessages(locale).services;
  const services: {
    icon: LucideIcon;
    title: string;
    body: string;
    accent: BrandAccent;
    featured?: boolean;
  }[] = [
    {
      icon: Palette,
      title: t.design.title,
      body: t.design.body,
      accent: "sky",
      featured: true,
    },
    {
      icon: Code2,
      title: t.dev.title,
      body: t.dev.body,
      accent: "blue",
    },
    {
      icon: Megaphone,
      title: t.paidTitle,
      body: copy.servicesPaid,
      accent: "indigo",
    },
    {
      icon: TrendingUp,
      title: t.cro.title,
      body: t.cro.body,
      accent: "blue",
    },
    {
      icon: ShoppingBag,
      title: t.commerceTitle,
      body: copy.servicesCommerce,
      accent: "indigo",
    },
  ];

  return (
    <section
      id="services"
      className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8"
      aria-labelledby="services-heading"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            {t.eyebrow}
          </p>
          <h2
            id="services-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          >
            {t.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-400">{t.intro}</p>
        </div>
        <ul className="mt-12 grid gap-6 sm:grid-cols-2">
          {services.map(({ icon: Icon, title, body, accent, featured }) => {
            const styles = brandAccent[accent];
            return (
              <li
                key={title}
                className={featured ? "h-full sm:col-span-2" : "h-full"}
              >
                <BrandCard accent={accent} className="h-full">
                  <div
                    className={
                      featured
                        ? "flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6"
                        : ""
                    }
                  >
                    <span
                      className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
                    >
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <div>
                      <h3
                        className={`text-xl font-semibold text-white ${featured ? "" : "mt-5"}`}
                      >
                        {title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-zinc-200">
                        {body}
                      </p>
                    </div>
                  </div>
                </BrandCard>
              </li>
            );
          })}
        </ul>
        <p className="mt-10 text-center text-sm text-zinc-400">
          {t.pricingLine(pricingFrom(LOCALE_META[locale].intl))}{" "}
          <a
            href={localizePath("/pricing", locale)}
            className="inline-flex items-center gap-1 font-semibold text-indigo-300 hover:text-sky-300"
          >
            {t.seePackages}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </p>
      </div>
    </section>
  );
}
