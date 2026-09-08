import { Globe, Mail, Phone } from "lucide-react";
import { Logo } from "@/components/Logo";
import { TrackedLink } from "@/components/TrackedLink";

const jumps = [
  { href: "/#top", label: "Top" },
  { href: "/#why-us", label: "Why Us" },
  { href: "/#services", label: "Services" },
  { href: "/#audience", label: "Who We Help" },
  { href: "/#contact", label: "Contact" },
  { href: "/hub", label: "Admin" },
];

const linkClass =
  "inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400";

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-start">
        <div>
          <Logo size="footer" />
          <p className="mt-3 max-w-sm text-sm text-zinc-500">
            Digital marketing and web development serving Alberta, Canada.
            Custom platforms and growth, built under one roof.
          </p>
          <a href="https://wwwdigisol.com" className={`mt-3 ${linkClass}`}>
            <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
            wwwdigisol.com
          </a>
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
            <ul className="mt-3 space-y-2">
              <li className="text-sm text-zinc-400">
                Owner{" "}
                <span className="font-medium text-zinc-200">Cameron Brown</span>
              </li>
              <li>
                <TrackedLink
                  href="tel:+15875770782"
                  eventName="contact_click"
                  eventParams={{ method: "phone", location: "footer" }}
                  className={linkClass}
                >
                  <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                  1-587-577-0782
                </TrackedLink>
              </li>
              <li>
                <TrackedLink
                  href="mailto:cam.r.brown82@gmail.com"
                  eventName="contact_click"
                  eventParams={{ method: "email_gmail", location: "footer" }}
                  className={linkClass}
                >
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  cam.r.brown82@gmail.com
                </TrackedLink>
              </li>
              <li>
                <TrackedLink
                  href="mailto:digisol2026@yahoo.com"
                  eventName="contact_click"
                  eventParams={{ method: "email_yahoo", location: "footer" }}
                  className={linkClass}
                >
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  digisol2026@yahoo.com
                </TrackedLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-6xl border-t border-zinc-800 pt-6 text-sm text-zinc-500">
        © {new Date().getFullYear()} DigiSol. All rights reserved.
      </p>
    </footer>
  );
}
