import { Globe } from "lucide-react";
import { ContactInfo } from "@/components/ContactInfo";
import { GoogleRating, ListingLinks } from "@/components/LocalListings";
import { Logo } from "@/components/Logo";
import { DIGISOL_ADDRESS_LINE, DIGISOL_REGION, DIGISOL_SERVICE_CITIES } from "@/lib/site";

const jumps = [
  { href: "/#top", label: "Top" },
  { href: "/#why-us", label: "Why Us" },
  { href: "/#services", label: "Services" },
  { href: "/#audience", label: "Who We Help" },
  { href: "/#dispatch", label: "Dispatch" },
  { href: "/#contact", label: "Contact" },
  { href: "/hub", label: "Admin" },
];

const linkClass =
  "inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-start">
        <div>
          <Logo size="footer" />
          <p className="mt-3 max-w-sm text-sm text-zinc-500">
            {`Web development, local SEO, and digital marketing for Alberta companies. Based in Airdrie. Serving ${DIGISOL_SERVICE_CITIES.join(", ")}, and local businesses across the province.`}
          </p>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">
            {DIGISOL_ADDRESS_LINE}
          </p>
          <a href="https://wwwdigisol.com" className={`mt-3 ${linkClass}`}>
            <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
            wwwdigisol.com
          </a>
          <ListingLinks location="footer" />
          <GoogleRating location="footer" />
        </div>

        <div className="space-y-8">
          <nav aria-label="Footer">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Jump to
            </p>
            <ul className="mt-3 space-y-2">
              {jumps.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={linkClass}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Contact
            </p>
            <ContactInfo location="footer" />
          </div>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-6xl border-t border-zinc-800 pt-6 text-sm text-zinc-500">
        © {new Date().getFullYear()} DigiSol. {DIGISOL_REGION}. All rights
        reserved.
      </p>
    </footer>
  );
}
