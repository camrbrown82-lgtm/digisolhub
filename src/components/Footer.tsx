import { Globe } from "lucide-react";
import { ContactInfo } from "@/components/ContactInfo";
import { FooterBadges } from "@/components/FooterBadges";
import { GoogleRating, ListingLinks } from "@/components/LocalListings";
import { Logo } from "@/components/Logo";
import { localizePath } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { LOCATION_PAGES, locationPath } from "@/lib/locations";
import { DIGISOL_ADDRESS_LINE, DIGISOL_REGION, DIGISOL_SITE_URL } from "@/lib/site";

const linkClass =
  "inline-flex items-center gap-1.5 text-sm text-indigo-100/85 transition hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400";

const headingClass = "text-xs font-semibold uppercase tracking-[0.18em] text-sky-300";

export function Footer() {
  const locale = getLocale();
  const t = getMessages(locale).footer;
  const localize = (href: string) => localizePath(href, locale);

  return (
    <footer className="border-t border-indigo-500/25 bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-12 lg:grid-cols-4 lg:gap-x-8">
          <div className="flex flex-col items-start gap-5">
            <Logo size="footer" className="[&_img]:h-14 [&_img]:w-auto sm:[&_img]:h-16" />
            <p className="max-w-xs text-sm leading-relaxed text-indigo-200/75">
              {t.tagline(DIGISOL_REGION)}
            </p>
            <ListingLinks location="footer" />
          </div>

          <nav aria-label={t.footerAria}>
            <p className={headingClass}>{t.jumpTo}</p>
            <ul className="mt-4 space-y-2">
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
            <p className={headingClass}>{t.serviceCities}</p>
            <ul className="mt-4 space-y-2">
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
            <p className={headingClass}>{t.contact}</p>
            <ContactInfo location="footer" />
            <p className="mt-4 text-sm leading-relaxed text-indigo-200/70">{DIGISOL_ADDRESS_LINE}</p>
            <a href={DIGISOL_SITE_URL} className={`${linkClass} mt-2`}>
              <Globe className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
              wwwdigisol.com
            </a>
            <div className="mt-5 flex flex-col items-start gap-3">
              <GoogleRating location="footer" />
            </div>
          </div>
        </div>

        <FooterBadges label={t.badges} />

        <div className="mt-12 space-y-2 border-t border-indigo-500/20 pt-5">
          <p className="text-sm text-indigo-100/90">{t.rights(new Date().getFullYear(), DIGISOL_REGION)}</p>
          <p className="max-w-3xl text-xs leading-5 text-indigo-200/75">{t.copyrightWarning}</p>
          <p className="max-w-3xl text-xs leading-5 text-indigo-200/75">{t.disclaimer}</p>
          <a href="/privacy" className={linkClass}>
            {t.privacy}
          </a>
        </div>
      </div>
    </footer>
  );
}
