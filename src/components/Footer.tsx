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
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <nav aria-label="Footer">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                Jump to
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1">
                {jumps.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className={linkClass}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Service cities">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                Alberta cities
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1">
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

            <p className="text-sm leading-snug text-indigo-200/70">
              {`Design, development, SEO & marketing for Alberta companies · ${DIGISOL_SERVICE_CITIES.join(", ")}`}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="text-xs text-sky-300/70">{DIGISOL_ADDRESS_LINE}</p>
              <a href="https://wwwdigisol.com" className={linkClass}>
                <Globe className="h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
                wwwdigisol.com
              </a>
            </div>
          </div>
        </div>

        <p className="mt-4 border-t border-indigo-500/20 pt-3 text-xs text-indigo-200/55">
          © {new Date().getFullYear()} DigiSol. {DIGISOL_REGION}. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}
