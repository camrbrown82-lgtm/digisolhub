/**
 * Curated Alberta SMB websites for DigiSol cold prospect audits.
 * Emails are NEVER hard-coded — CASL requires a conspicuously published
 * address discovered on the live site at audit time.
 */

export type ProspectSeed = {
  businessName: string;
  url: string;
  trade: "hvac" | "electrical" | "plumbing" | "general";
  city: string;
  region?: string;
};

/** Rotating inventory — worker tops up the pending queue from this list. */
export const ALBERTA_PROSPECT_SEED: ProspectSeed[] = [
  {
    businessName: "YYC Heating & Cooling Pros",
    url: "https://yychvac.com/",
    trade: "hvac",
    city: "Calgary",
  },
  {
    businessName: "Blaze Heating and Air Conditioning",
    url: "https://www.blazehvac.com/",
    trade: "hvac",
    city: "Calgary",
  },
  {
    businessName: "Arpi's Industries",
    url: "https://www.arpis.com/",
    trade: "hvac",
    city: "Calgary",
  },
  {
    businessName: "Northstar Heating & Cooling",
    url: "https://northstarheatingandcooling.ca/",
    trade: "hvac",
    city: "Calgary",
  },
  {
    businessName: "Comfort Environment",
    url: "https://comfortenvironment.ca/",
    trade: "hvac",
    city: "Calgary",
  },
  {
    businessName: "Always Plumbing & Heating",
    url: "https://www.alwaysplumbing.ca/",
    trade: "plumbing",
    city: "Edmonton",
  },
  {
    businessName: "Sparks and Drips",
    url: "https://sparksanddrips.ca/",
    trade: "electrical",
    city: "Edmonton",
  },
  {
    businessName: "Advantage Installations",
    url: "https://advantageinstallations.ca/",
    trade: "plumbing",
    city: "Edmonton",
  },
  {
    businessName: "Action Furnace",
    url: "https://www.actionfurnace.ca/",
    trade: "hvac",
    city: "Calgary",
  },
  {
    businessName: "Mr. Furnace",
    url: "https://www.mrfurnace.com/",
    trade: "hvac",
    city: "Edmonton",
  },
  {
    businessName: "Canyon Plumbing & Heating",
    url: "https://www.canyonplumbing.ca/",
    trade: "plumbing",
    city: "Calgary",
  },
  {
    businessName: "Hearth & Home Shoppe",
    url: "https://hearthandhomeshoppe.com/",
    trade: "hvac",
    city: "Edmonton",
  },
  {
    businessName: "Enercare Alberta",
    url: "https://www.enercare.ca/alberta/plumbing-electrical",
    trade: "plumbing",
    city: "Calgary",
  },
  {
    businessName: "Reliance Home Comfort Alberta",
    url: "https://www.reliancehomecomfort.com/ab/",
    trade: "plumbing",
    city: "Calgary",
  },
  {
    businessName: "Bing HVAC",
    url: "https://binghvac.com/",
    trade: "hvac",
    city: "Calgary",
  },
  {
    businessName: "Wagner Mechanical",
    url: "https://wagner-mechanical.com/",
    trade: "hvac",
    city: "Calgary",
  },
  {
    businessName: "All One Heating & Cooling",
    url: "https://alloneheatingandcooling.com/",
    trade: "hvac",
    city: "Calgary",
  },
  {
    businessName: "Infills Mechanical",
    url: "https://infillsmechanical.ca/",
    trade: "hvac",
    city: "Calgary",
  },
];

export function normalizeProspectUrl(raw: string) {
  try {
    const u = new URL(raw.trim());
    u.hash = "";
    u.search = "";
    let path = u.pathname.replace(/\/+$/, "") || "/";
    if (path !== "/") path = `${path}/`;
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    return `https://${host}${path === "/" ? "/" : path}`;
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function prospectHostKey(raw: string) {
  try {
    return new URL(raw).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return raw.trim().toLowerCase();
  }
}
