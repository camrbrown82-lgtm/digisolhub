import { Globe } from "lucide-react";
import { ContactInfo } from "@/components/ContactInfo";
import { GoogleRating, ListingLinks } from "@/components/LocalListings";
import { Logo } from "@/components/Logo";
import { LOCATION_PAGES, locationPath } from "@/lib/locations";
import { DIGISOL_ADDRESS_LINE, DIGISOL_REGION, DIGISOL_SERVICE_CITIES } from "@/lib/site";

const jumps = [
  { href: "/#top", label: "Top" },
  { href: "/#why-us", label: "Why Us" },
  { href: "/#services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#audience", label: "Who We Help" },
  { href: "/#dispatch", label: "Dispatch" },
  { href: "/media/website-audit", label: "Media" },
  { href: "/about", label: "About" },
  { href: "/locations", label: "Locations" },
  { href: "/#contact", label: "Contact" },
  { href: "/hub", label: "Admin" },
];

const linkClass =
  "inline-flex items-center gap-1.5 text-sm text-indigo-300/90 transition hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400";

export function Footer() {
  return (
    <footer className="border-t border-indigo-500/25 bg-zinc-950 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <div className="min-w-0 space-y-3">
            <Logo size="footer" />
            <GoogleRating location="footer" />
            <p className="text-sm leading-snug text-indigo-200/70">
              {`Design, development, SEO & marketing for Alberta companies · Airdrie · ${DIGISOL_SERVICE_CITIES.join(", ")}`}
            </p>
            <p className="text-xs text-sky-300/70">{DIGISOL_ADDRESS_LINE}</p>
            <a href="https://wwwdigisol.com" className={linkClass}>
              <Globe className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
              wwwdigisol.com
            </a>
            <ListingLinks location="footer" />
          </div>

          <div className="min-w-0 space-y-4">
            <nav aria-label="Footer" className="w-full">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                Jump to
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                {jumps.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className={linkClass}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Service cities" className="w-full">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                Alberta cities
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                {LOCATION_PAGES.map((city) => (
                  <li key={city.slug}>
                    <a href={locationPath(city.slug)} className={linkClass}>
                      {city.name}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                Contact
              </p>
              <ContactInfo location="footer" />
            </div>
          </div>
        </div>

        <p className="border-t border-indigo-500/20 pt-4 text-xs text-indigo-200/55">
          © {new Date().getFullYear()} DigiSol. {DIGISOL_REGION}. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}
