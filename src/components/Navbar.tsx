"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { ContactInfo } from "@/components/ContactInfo";
import { HeaderSocialLinks } from "@/components/HeaderSocialLinks";
import { Logo } from "@/components/Logo";
import { TrackedLink } from "@/components/TrackedLink";

const links = [
  { href: "/#services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#why-us", label: "Why Us" },
  { href: "/#dispatch", label: "Dispatch" },
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
      className="border-b border-white/10 bg-zinc-950"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-indigo-600 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <div className="grid w-full items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6 xl:grid-cols-[auto_minmax(0,1fr)_auto] lg:px-8 lg:py-5">
        <div className="flex items-center justify-between gap-3 lg:contents">
          <Logo />
          <div className="flex items-center gap-2 lg:hidden">
            <HeaderSocialLinks location="nav_mobile" />
            <button
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div className="header-contact hidden min-w-0 w-full xl:block">
          <ContactInfo location="hero" />
        </div>
        <nav
          className="hidden items-center justify-end gap-4 lg:flex xl:gap-6"
          aria-label="Primary"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-zinc-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              {link.label}
            </a>
          ))}
          <HeaderSocialLinks location="nav" />
          <TrackedLink
            href="/#contact"
            eventName="cta_click"
            eventParams={{ cta_name: "book_consultation", location: "nav" }}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Contact
          </TrackedLink>
          <a
            href="/hub"
            className="inline-flex items-center rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-indigo-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            Admin
          </a>
        </nav>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          className="border-t border-white/10 px-4 py-4 lg:hidden"
          aria-label="Mobile"
        >
          <ul className="flex flex-col gap-3">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/5"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li className="px-3 py-1">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Follow us
              </p>
              <HeaderSocialLinks location="nav_mobile" />
            </li>
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
                className="block rounded-lg px-3 py-2 text-zinc-200 hover:bg-white/5"
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
