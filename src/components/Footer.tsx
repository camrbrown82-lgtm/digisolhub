import { Globe } from "lucide-react";
import { ContactInfo } from "@/components/ContactInfo";
import { GoogleRating, ListingLinks } from "@/components/LocalListings";
import { Logo } from "@/components/Logo";
import { localizePath } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { LOCATION_PAGES, locationPath } from "@/lib/locations";
import { DIGISOL_ADDRESS_LINE, DIGISOL_REGION } from "@/lib/site";

const linkClass =
  "inline-flex items-center gap-1.5 text-sm text-indigo-300/90 transition hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400";

export function Footer() {
  const locale = getLocale();
  const t = getMessages(locale).footer;
  const localize = (href: string) => localizePath(href, locale);

  return (
    <footer className="border-t border-indigo-500/25 bg-zinc-950 px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-8">
          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-44 md:w-52">
            <Logo
              size="footer"
              className="[&_img]:h-16 [&_img]:w-auto sm:[&_img]:h-20"
            />
            <ListingLinks location="footer" />
            <GoogleRating location="footer" />
            <a href="/award/digisol" className="block w-fit" title="Verify our website audit score">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/award/digisol/badge.svg"
                alt="DigiSol passes its own website audit. Verify the score."
                width={192}
                height={72}
                loading="lazy"
              />
            </a>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <nav aria-label={t.footerAria}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                {t.jumpTo}
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1">
                {t.jumps.map((link) => (
                  <li key={link.href}>
                    <a href={localize(link.href)} className={linkClass}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label={t.serviceCities}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                {t.serviceCities}
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1">
                {LOCATION_PAGES.map((city) => (
                  <li key={city.slug}>
                    <a href={localize(locationPath(city.slug))} className={linkClass}>
                      {city.name}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                {t.contact}
              </p>
              <ContactInfo location="footer" />
            </div>

            <p className="text-sm leading-snug text-indigo-200/70">{t.tagline(DIGISOL_REGION)}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="text-xs text-sky-300/70">{DIGISOL_ADDRESS_LINE}</p>
              <a href="https://wwwdigisol.com" className={linkClass}>
                <Globe className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
                wwwdigisol.com
              </a>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-indigo-500/20 pt-3">
          <p className="text-xs text-indigo-200/55">{t.rights(new Date().getFullYear(), DIGISOL_REGION)}</p>
          <a href="/privacy" className={linkClass}>
            {t.privacy}
          </a>
        </div>
      </div>
    </footer>
  );
}
