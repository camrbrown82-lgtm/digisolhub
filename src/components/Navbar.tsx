"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { ContactInfo } from "@/components/ContactInfo";
import { Logo } from "@/components/Logo";
import { TrackedLink } from "@/components/TrackedLink";

const links = [
  { href: "/#services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#why-us", label: "Why Us" },
  { href: "/#dispatch", label: "Dispatch" },
  { href: "/media/website-audit", label: "Media" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const setHeaderHeight = () => {
      document.documentElement.style.setProperty(
        "--header-h",
        `${header.offsetHeight}px`,
      );
    };

    setHeaderHeight();
    const observer = new ResizeObserver(setHeaderHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, [open]);

  return (
    <header
      ref={headerRef}
      className="border-b border-indigo-500/25 bg-zinc-950"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-indigo-600 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <div className="grid w-full items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-5 xl:grid-cols-[auto_minmax(0,1fr)_auto] lg:px-6 lg:py-2.5">
        <div className="flex min-w-0 items-center justify-between gap-3 lg:contents">
          <Logo />
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-400/30 text-indigo-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div className="header-contact hidden min-w-0 overflow-hidden xl:block">
          <ContactInfo location="hero" />
        </div>
        <nav
          className="hidden items-center justify-end gap-2.5 whitespace-nowrap lg:flex xl:gap-3"
          aria-label="Primary"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-medium text-indigo-200 transition-colors hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 xl:text-sm"
            >
              {link.label}
            </a>
          ))}
          <TrackedLink
            href="/#contact"
            eventName="cta_click"
            eventParams={{ cta_name: "book_consultation", location: "nav" }}
            className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 xl:px-4 xl:text-sm"
          >
            Contact
          </TrackedLink>
          <a
            href="/hub"
            className="inline-flex items-center rounded-full border border-sky-400/40 px-3 py-1.5 text-xs font-medium text-sky-300 transition hover:border-indigo-400 hover:bg-indigo-500/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 xl:px-4 xl:text-sm"
          >
            Admin
          </a>
        </nav>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          className="border-t border-indigo-500/20 px-4 py-4 lg:hidden"
          aria-label="Mobile"
        >
          <ul className="flex flex-col gap-2">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block rounded-lg px-3 py-2 text-indigo-100 hover:bg-indigo-500/10 hover:text-sky-300"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <TrackedLink
                href="/#contact"
                eventName="cta_click"
                eventParams={{
                  cta_name: "book_consultation",
                  location: "nav_mobile",
                }}
                className="block rounded-full bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
                onClick={() => setOpen(false)}
              >
                Contact
              </TrackedLink>
            </li>
            <li>
              <a
                href="/hub"
                className="block rounded-lg px-3 py-2 text-sky-300 hover:bg-indigo-500/10"
                onClick={() => setOpen(false)}
              >
                Admin
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
