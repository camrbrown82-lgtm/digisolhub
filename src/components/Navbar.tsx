"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import {
  DIGISOL_LOGO_BADGE,
  DIGISOL_LOGO_WORDMARK,
} from "@/components/Logo";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { QUOTE_HREF, jumpToQuote } from "@/components/QuickQuote";
import { TrackedLink } from "@/components/TrackedLink";
import { useLocalizedHref, useMessages } from "@/lib/i18n/client";

/**
 * Header: wordmark left · centered page links + Contact · badge right.
 */
export function Navbar() {
  const t = useMessages().nav;
  const localize = useLocalizedHref();
  const links = t.links.map((link) => ({ ...link, href: localize(link.href) }));
  const quoteHref = localize(QUOTE_HREF);
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
  }, []);

  useEffect(() => {
    if (!open) return;
    // Lock <html> only: overflow on <body> too would unstick the sticky header.
    const html = document.documentElement;
    const prev = {
      overflow: html.style.overflow,
      overscroll: html.style.overscrollBehavior,
    };
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onDesktop);
    return () => {
      html.style.overflow = prev.overflow;
      html.style.overscrollBehavior = prev.overscroll;
      window.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [open]);

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-50 border-b border-indigo-500/25 bg-zinc-950/95 backdrop-blur"
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-indigo-600 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          {t.skip}
        </a>

        <div className="relative mx-auto flex h-20 w-full max-w-7xl items-center px-4 sm:h-24 sm:px-6 lg:h-[6.5rem] lg:px-8">
          {/* Left — primary wordmark */}
          <a
            href={localize("/")}
            className="relative z-10 inline-flex shrink-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            aria-label={t.homeAria}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DIGISOL_LOGO_WORDMARK}
              alt={t.logoAlt}
              width={480}
              height={156}
              className="h-12 w-auto max-w-[min(100%,16rem)] object-contain object-left sm:h-14 lg:h-16"
            />
          </a>

          {/* Center — page links + Contact */}
          <nav
            className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-4 lg:flex xl:gap-5"
            aria-label={t.primaryAria}
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
              href={quoteHref}
              eventName="cta_click"
              eventParams={{ cta_name: "get_quote", location: "nav" }}
              onClick={jumpToQuote}
              className="inline-flex items-center whitespace-nowrap rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              {t.getQuote}
            </TrackedLink>
          </nav>

          <LanguageSwitch className="relative z-10 ml-auto mr-3 lg:mr-4" />

          {/* Right — badge opens Hub login (hidden entry; public sees a logo) */}
          <a
            href="/hub/login"
            className="relative z-10 hidden shrink-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 lg:inline-flex"
            aria-label="DigiSol Hub"
            title="Hub"
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
            className="relative z-10 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-indigo-400/30 text-indigo-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? t.closeMenu : t.openMenu}</span>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Outside <header>: backdrop-blur would trap a fixed panel inside it. */}
      {open && (
        <nav
          id="mobile-nav"
          className="fixed inset-x-0 bottom-0 top-[var(--header-h,5rem)] z-50 overflow-y-auto overscroll-contain border-t border-indigo-500/20 bg-zinc-950 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 lg:hidden"
          aria-label={t.mobileAria}
        >
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
              <a
                href={localize("/#contact")}
                className="block rounded-lg px-3 py-2 text-indigo-100 hover:bg-indigo-500/10 hover:text-sky-300"
                onClick={() => setOpen(false)}
              >
                {t.contact}
              </a>
            </li>
            <li>
              <TrackedLink
                href={quoteHref}
                eventName="cta_click"
                eventParams={{ cta_name: "get_quote", location: "nav_mobile" }}
                className="block rounded-full bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
                onClick={(event) => {
                  setOpen(false);
                  // Wait for the menu to close and release its scroll lock.
                  jumpToQuote(event, 80);
                }}
              >
                {t.getQuote}
              </TrackedLink>
            </li>
            <li className="mt-4 border-t border-indigo-500/20 pt-4">
              <a
                href="/hub/login"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-indigo-100 hover:bg-indigo-500/10 hover:text-sky-300"
                onClick={() => setOpen(false)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={DIGISOL_LOGO_BADGE}
                  alt=""
                  width={256}
                  height={256}
                  className="h-9 w-9 rounded-full object-cover ring-1 ring-indigo-400/30"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">{t.hubLogin}</span>
              </a>
            </li>
          </ul>
        </nav>
      )}
    </>
  );
}
