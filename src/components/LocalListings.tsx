"use client";

import { Facebook, Instagram, Linkedin, Star } from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";
import {
  DIGISOL_FACEBOOK_URL,
  DIGISOL_GOOGLE_LISTING_URL,
  DIGISOL_INSTAGRAM_URL,
  DIGISOL_LINKEDIN_URL,
} from "@/lib/site";

type ListingLocation = "hero" | "footer" | "contact";

const heroLink =
  "inline-flex items-center gap-2 text-sm font-medium text-indigo-300 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400";

const footerLink =
  "inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.72.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
      />
    </svg>
  );
}

export function ListingLinks({ location }: { location: ListingLocation }) {
  const className = location === "footer" ? footerLink : heroLink;

  return (
    <div
      className={
        location === "footer"
          ? "mt-2 flex flex-col"
          : "mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-6"
      }
    >
      <TrackedLink
        href={DIGISOL_FACEBOOK_URL}
        eventName="social_click"
        eventParams={{ network: "facebook", location }}
        target="_blank"
        rel="noopener noreferrer me"
        className={className}
      >
        <Facebook className="h-4 w-4 shrink-0" aria-hidden="true" />
        Follow us on Facebook
      </TrackedLink>
      <TrackedLink
        href={DIGISOL_LINKEDIN_URL}
        eventName="social_click"
        eventParams={{ network: "linkedin", location }}
        target="_blank"
        rel="noopener noreferrer me"
        className={location === "footer" ? `mt-2 ${className}` : className}
      >
        <Linkedin className="h-4 w-4 shrink-0" aria-hidden="true" />
        Connect on LinkedIn
      </TrackedLink>
      <TrackedLink
        href={DIGISOL_INSTAGRAM_URL}
        eventName="social_click"
        eventParams={{ network: "instagram", location }}
        target="_blank"
        rel="noopener noreferrer me"
        className={location === "footer" ? `mt-2 ${className}` : className}
      >
        <Instagram className="h-4 w-4 shrink-0" aria-hidden="true" />
        Follow us on Instagram
      </TrackedLink>
      <TrackedLink
        href={DIGISOL_GOOGLE_LISTING_URL}
        eventName="social_click"
        eventParams={{ network: "google", location }}
        target="_blank"
        rel="noopener noreferrer"
        className={location === "footer" ? `mt-2 ${className}` : className}
      >
        <GoogleMark className="h-4 w-4 shrink-0" />
        Find us on Google
      </TrackedLink>
    </div>
  );
}

export function GoogleRating({ location }: { location: ListingLocation }) {
  const isFooter = location === "footer";

  return (
    <TrackedLink
      href={DIGISOL_GOOGLE_LISTING_URL}
      eventName="google_rating_click"
      eventParams={{ location }}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open DigiSol on Google to view ratings and leave a review"
      className={
        isFooter
          ? "mt-3 inline-flex items-center gap-3 rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-3 py-2 text-left transition hover:border-indigo-400/50 hover:bg-indigo-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          : "inline-flex items-center gap-3 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 text-left transition hover:border-indigo-400/50 hover:bg-indigo-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
      }
    >
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className="h-4 w-4 fill-amber-400 text-amber-400"
          />
        ))}
      </span>
      <span>
        <span
          className={
            isFooter
              ? "block text-sm font-medium text-zinc-200"
              : "block text-sm font-semibold text-white"
          }
        >
          Google rating
        </span>
        <span
          className={
            isFooter
              ? "block text-xs text-zinc-500"
              : "block text-xs text-zinc-400"
          }
        >
          See our listing and leave a review
        </span>
      </span>
    </TrackedLink>
  );
}
