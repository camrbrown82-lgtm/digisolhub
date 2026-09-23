import { Audience } from "@/components/sections/Audience";
import { Contact } from "@/components/sections/Contact";
import { DispatchArchive } from "@/components/sections/DispatchArchive";
import { DualThreat } from "@/components/sections/DualThreat";
import { Hero } from "@/components/sections/Hero";
import { KaylevValueProp } from "@/components/sections/KaylevValueProp";
import { Services } from "@/components/sections/Services";
import { WebsiteAudit } from "@/components/sections/WebsiteAudit";
import type { HomeCopy } from "@/lib/visitorRegion";

type MarketingHomeStackProps = {
  copy: HomeCopy;
  /** Optional city label for Kaylev Advantage line */
  kaylevLocationName?: string;
  analyticsKaylev: string;
};

/**
 * Exact public marketing section stack used by `/`, `/locations`, and
 * `/locations/[city]`. Layout is identical; only `copy` / analytics tags change.
 */
export function MarketingHomeStack({
  copy,
  kaylevLocationName,
  analyticsKaylev,
}: MarketingHomeStackProps) {
  return (
    <>
      <Hero copy={copy} />
      <DualThreat copy={copy} />
      <KaylevValueProp
        locationName={kaylevLocationName}
        analyticsLocation={analyticsKaylev}
      />
      <Services copy={copy} />
      <WebsiteAudit copy={copy} />
      <Audience copy={copy} />
      <DispatchArchive />
      <Contact title={copy.contactTitle} body={copy.contactBody} />
    </>
  );
}
