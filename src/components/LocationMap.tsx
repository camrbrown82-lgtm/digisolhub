import { ExternalLink, MapPin, Navigation } from "lucide-react";
import { BrandCard } from "@/components/BrandCard";
import {
  DIGISOL_ADDRESS_LINE,
  DIGISOL_DIRECTIONS_URL,
  DIGISOL_GOOGLE_LISTING_URL,
  digisolMapEmbedUrl,
} from "@/lib/site";

type LocationMapProps = {
  heading: string;
  mapTitle: string;
  directions: string;
  openInMaps: string;
  /** Google Maps UI language, e.g. "en" or "fr". */
  lang: string;
  onLinkClick?: (link: "directions" | "google_listing") => void;
};

export function LocationMap({
  heading,
  mapTitle,
  directions,
  openInMaps,
  lang,
  onLinkClick,
}: LocationMapProps) {
  const linkClass =
    "inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 px-3 py-1.5 text-xs font-medium text-indigo-200 transition hover:border-sky-400/50 hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400";

  return (
    <BrandCard as="div" accent="sky" className="mt-8" innerClassName="overflow-hidden">
      <iframe
        title={mapTitle}
        src={digisolMapEmbedUrl(lang)}
        className="block h-72 w-full border-0 sm:h-80"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-white">{heading}</p>
            <p className="text-sm text-zinc-400">{DIGISOL_ADDRESS_LINE}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={DIGISOL_DIRECTIONS_URL}
            target="_blank"
            rel="noopener"
            className={linkClass}
            onClick={() => onLinkClick?.("directions")}
          >
            <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
            {directions}
          </a>
          <a
            href={DIGISOL_GOOGLE_LISTING_URL}
            target="_blank"
            rel="noopener"
            className={linkClass}
            onClick={() => onLinkClick?.("google_listing")}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            {openInMaps}
          </a>
        </div>
      </div>
    </BrandCard>
  );
}
