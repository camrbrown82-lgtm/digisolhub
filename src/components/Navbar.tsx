"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { TrackedLink } from "@/components/TrackedLink";

const links = [
  { href: "/#services", label: "Services" },
  { href: "/#why-us", label: "Why Us" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-indigo-600 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <div className="flex w-full items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-zinc-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
            >
              {link.label}
            </a>
          ))}
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
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-zinc-200 md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
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
          className="border-t border-white/10 px-4 py-4 md:hidden"
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
            <li>
              <TrackedLink
                href="/#contact"
                eventName="cta_click"
                eventParams={{ cta_name: "book_consultation", location: "nav_mobile" }}
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
