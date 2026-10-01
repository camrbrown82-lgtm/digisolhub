import { metaAdAccountId, metaPixelId } from "@/lib/meta/config";
import { metaGraph } from "@/lib/meta/graph";

/** Meta will not build a lookalike until the source audience has about this many people. */
const MIN_SEED = 100;
const SEED_DAYS = 180;
const SEED_NAME = "DigiSol Hub · website visitors";

export type LookalikeStatus = {
  audienceId: string | null;
  country: string;
  seedCount: number | null;
  note: string;
};

type CustomAudience = {
  id?: string;
  name?: string;
  approximate_count?: number;
  approximate_count_lower_bound?: number;
  delivery_status?: { code?: number };
};

function lookalikeName(country: string) {
  return `DigiSol Hub · 1% lookalike ${country}`;
}

function seedCount(audience: CustomAudience) {
  const count = Number(audience.approximate_count);
  if (Number.isFinite(count) && count >= 0) return count;
  const lower = Number(audience.approximate_count_lower_bound);
  return Number.isFinite(lower) && lower >= 0 ? lower : null;
}

async function listAudiences() {
  const account = metaAdAccountId();
  const page = await metaGraph<{ data?: CustomAudience[] }>("GET", `${account}/customaudiences`, {
    fields: "id,name,approximate_count,approximate_count_lower_bound,delivery_status",
    limit: 200,
  });
  return page.data ?? [];
}

function websiteRule(pixelId: string) {
  return {
    inclusions: {
      operator: "or",
      rules: [
        {
          event_sources: [{ id: pixelId, type: "pixel" }],
          retention_seconds: SEED_DAYS * 24 * 60 * 60,
          filter: {
            operator: "and",
            filters: [{ field: "event", operator: "eq", value: "PageView" }],
          },
        },
      ],
    },
  };
}

/**
 * Reuses the pixel's website visitors as a 1% lookalike in one country.
 * The ad still has to match the cities and ages on the draft; this only ranks people inside that box.
 */
export async function lookalikeForCountry(country: string): Promise<LookalikeStatus> {
  const code = /^[A-Z]{2}$/.test(country) ? country : "CA";
  const account = metaAdAccountId();
  const pixelId = metaPixelId();
  if (!account) {
    return { audienceId: null, country: code, seedCount: null, note: "No ad account is connected, so no lookalike was added." };
  }
  if (!pixelId) {
    return { audienceId: null, country: code, seedCount: null, note: "No pixel is connected, so no lookalike was added." };
  }

  const existing = await listAudiences();
  let seed = existing.find((row) => row.name === SEED_NAME && row.id);
  if (!seed?.id) {
    seed = await metaGraph<CustomAudience>("POST", `${account}/customaudiences`, {
      name: SEED_NAME,
      subtype: "WEBSITE",
      retention_days: SEED_DAYS,
      rule: websiteRule(pixelId),
      prefill: 1,
    });
  }

  const counted = seed.id ? existing.find((row) => row.id === seed?.id) || seed : seed;
  const count = seedCount(counted);
  const ready = existing.find((row) => row.name === lookalikeName(code) && row.id);
  if (ready?.id) {
    return {
      audienceId: ready.id,
      country: code,
      seedCount: count,
      note: `1% lookalike of ${code} website visitors is on this ad, still limited to the cities and ages you set.`,
    };
  }

  const tooSmall = counted.delivery_status?.code === 300 || (count != null && count < MIN_SEED);
  if (tooSmall || count == null) {
    const have = count == null ? "still counting" : String(count);
    return {
      audienceId: null,
      country: code,
      seedCount: count,
      note: `Lookalike waits until the pixel has at least ${MIN_SEED} visitors in ${code} (now ${have}). This ad uses your cities and ages only.`,
    };
  }

  try {
    const created = await metaGraph<CustomAudience>("POST", `${account}/customaudiences`, {
      name: lookalikeName(code),
      subtype: "LOOKALIKE",
      origin_audience_id: seed.id,
      lookalike_spec: { type: "similarity", ratio: 0.01, country: code },
    });
    return {
      audienceId: created.id || null,
      country: code,
      seedCount: count,
      note: created.id
        ? `1% lookalike of ${code} website visitors is on this ad, still limited to the cities and ages you set.`
        : `Lookalike was not created. This ad uses your cities and ages only.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lookalike was not created.";
    return {
      audienceId: null,
      country: code,
      seedCount: count,
      note: `Lookalike was not added (${message}). This ad uses your cities and ages only.`,
    };
  }
}
