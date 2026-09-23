"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import {
  DIGISOL_LOGO_BADGE,
  DIGISOL_LOGO_WORDMARK,
} from "@/components/Logo";
import { TrackedLink } from "@/components/TrackedLink";

const links = [
  { href: "/#services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#why-us", label: "Why Us" },
  { href: "/#dispatch", label: "Dispatch" },
  { href: "/media/website-audit", label: "Media" },
  { href: "/about", label: "About" },
];

/**
 * Header: wordmark left · centered page links + Contact · badge right.
 */
export function Navbar() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const setHeaderHeight = () => {
      const h = Math.ceil(header.getBoundingClientRect().height);
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };

    setHeaderHeight();
    const observer = new ResizeObserver(setHeaderHeight);
    observer.observe(header);
    window.addEventListener("resize", setHeaderHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", setHeaderHeight);
    };
  }, [open]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b border-indigo-500/25 bg-zinc-950/95 backdrop-blur"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-indigo-600 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <div className="relative mx-auto flex h-20 w-full max-w-7xl items-center px-4 sm:h-24 sm:px-6 lg:h-[6.5rem] lg:px-8">
        {/* Left — primary wordmark */}
        <a
          href="/"
          className="relative z-10 inline-flex shrink-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          aria-label="DigiSol home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DIGISOL_LOGO_WORDMARK}
            alt="DigiSol — Engineering & Growth"
            width={480}
            height={156}
            className="h-12 w-auto max-w-[min(100%,16rem)] object-contain object-left sm:h-14 lg:h-16"
          />
        </a>

        {/* Center — page links + Contact + Admin */}
        <nav
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-4 lg:flex xl:gap-5"
          aria-label="Primary"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-sm font-medium text-indigo-200 transition-colors hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              {link.label}
            </a>
          ))}
          <TrackedLink
            href="/#contact"
            eventName="cta_click"
            eventParams={{ cta_name: "book_consultation", location: "nav" }}
            className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          >
            Contact
          </TrackedLink>
        </nav>

        {/* Right — secondary badge */}
        <a
          href="/"
          className="relative z-10 ml-auto hidden shrink-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 lg:inline-flex"
          aria-label="DigiSol"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={DIGISOL_LOGO_BADGE}
            alt=""
            width={256}
            height={256}
            className="h-12 w-12 rounded-full object-cover ring-1 ring-indigo-400/30 sm:h-14 sm:w-14 lg:h-16 lg:w-16"
            aria-hidden="true"
          />
        </a>

        <button
          type="button"
          className="relative z-10 ml-auto inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-indigo-400/30 text-indigo-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          className="border-t border-indigo-500/20 px-4 py-4 lg:hidden"
          aria-label="Mobile"
        >
          <div className="mx-auto mb-3 flex max-w-7xl justify-center lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DIGISOL_LOGO_BADGE}
              alt=""
              width={256}
              height={256}
              className="h-14 w-14 rounded-full object-cover ring-1 ring-indigo-400/30"
              aria-hidden="true"
            />
          </div>
          <ul className="mx-auto flex max-w-7xl flex-col gap-2">
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
          </ul>
        </nav>
      )}
    </header>
  );
}
