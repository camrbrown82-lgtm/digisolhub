import { Audience } from "@/components/sections/Audience";
import { Contact } from "@/components/sections/Contact";
import { DispatchArchive } from "@/components/sections/DispatchArchive";
import { DualThreat } from "@/components/sections/DualThreat";
import { Hero } from "@/components/sections/Hero";
import { KaylevValueProp } from "@/components/sections/KaylevValueProp";
import { LocalCitySeo } from "@/components/sections/LocalCitySeo";
import { Services } from "@/components/sections/Services";
import { WebsiteAudit } from "@/components/sections/WebsiteAudit";
import type { LocationPage } from "@/lib/locations";
import type { HomeCopy } from "@/lib/visitorRegion";

type MarketingHomeStackProps = {
  copy: HomeCopy;
  /** Optional city label for Kaylev Advantage line */
  kaylevLocationName?: string;
  analyticsKaylev: string;
  /**
   * `general` = worldwide / non-city framing (default).
   * `alberta` = city landers + /locations hub.
   */
  market?: "general" | "alberta";
  /** When set, injects unique local-intent SEO content for that city. */
  locationPage?: LocationPage;
};

/**
 * Exact public marketing section stack used by `/`, `/locations`, and
 * `/locations/[city]`. Layout is identical; only `copy` / market framing change.
 */
export function MarketingHomeStack({
  copy,
  kaylevLocationName,
  analyticsKaylev,
  market = "general",
  locationPage,
}: MarketingHomeStackProps) {
  return (
    <>
      <Hero copy={copy} />
      <DualThreat copy={copy} />
      {locationPage ? <LocalCitySeo page={locationPage} /> : null}
      <KaylevValueProp
        locationName={kaylevLocationName}
        analyticsLocation={analyticsKaylev}
      />
      <Services copy={copy} />
      <WebsiteAudit copy={copy} />
      <Audience copy={copy} />
      <DispatchArchive market={market} />
      <Contact title={copy.contactTitle} body={copy.contactBody} />
    </>
  );
}
