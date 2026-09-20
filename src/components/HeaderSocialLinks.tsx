"use client";

import { Facebook, Instagram } from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";
import {
  DIGISOL_FACEBOOK_URL,
  DIGISOL_INSTAGRAM_HANDLE,
  DIGISOL_INSTAGRAM_URL,
} from "@/lib/site";

const iconLink =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-zinc-300 transition hover:border-indigo-400/50 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400";

export function HeaderSocialLinks({
  location = "nav",
}: {
  location?: "nav" | "nav_mobile";
}) {
  return (
    <div className="flex items-center gap-2" aria-label="Follow DigiSol">
      <TrackedLink
        href={DIGISOL_FACEBOOK_URL}
        eventName="social_click"
        eventParams={{ network: "facebook", location }}
        target="_blank"
        rel="noopener noreferrer me"
        aria-label="Follow DigiSol on Facebook"
        title="Follow us on Facebook"
        className={iconLink}
      >
        <Facebook className="h-4 w-4" aria-hidden="true" />
      </TrackedLink>
      <TrackedLink
        href={DIGISOL_INSTAGRAM_URL}
        eventName="social_click"
        eventParams={{ network: "instagram", location }}
        target="_blank"
        rel="noopener noreferrer me"
        aria-label={`Follow DigiSol on Instagram @${DIGISOL_INSTAGRAM_HANDLE}`}
        title={`Follow us on Instagram @${DIGISOL_INSTAGRAM_HANDLE}`}
        className={iconLink}
      >
        <Instagram className="h-4 w-4" aria-hidden="true" />
      </TrackedLink>
    </div>
  );
}
