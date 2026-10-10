import { GoogleApiError, googleFetch } from "@/lib/google/auth";

const VERSION = process.env.GOOGLE_ADS_API_VERSION?.trim() || "v25";
const BASE = `https://googleads.googleapis.com/${VERSION}`;

export const cleanCustomerId = (value: string | null | undefined) =>
  (value || "").replace(/\D/g, "");

function developerToken() {
  return process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim() || "";
}

/** DigiSol's Google Ads manager account. Client accounts linked under it are reachable. */
export function managerCustomerId() {
  return cleanCustomerId(process.env.GOOGLE_ADS_MANAGER_ID || process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
}

/** Manager account number is enough. Google stopped requiring a developer token on 9 Sep 2026. */
export function adsApiReady() {
  return Boolean(managerCustomerId());
}

function headers(loginCustomerId: string) {
  const token = developerToken();
  return {
    ...(token ? { "developer-token": token } : {}),
    "login-customer-id": loginCustomerId,
  };
}

/** Accounts the robot was added to directly (not linked under the manager) only answer with their own login id. */
const directLogin = new Set<string>();

async function adsCall<T>(customerId: string, path: string, body: unknown): Promise<T> {
  const cid = cleanCustomerId(customerId);
  const url = `${BASE}/customers/${cid}${path}`;
  const manager = managerCustomerId();
  if (directLogin.has(cid) || cid === manager) {
    return googleFetch<T>(url, { body, headers: headers(cid) });
  }
  try {
    return await googleFetch<T>(url, { body, headers: headers(manager) });
  } catch (error) {
    if (!(error instanceof GoogleApiError) || error.adsCode !== "USER_PERMISSION_DENIED") throw error;
    try {
      const result = await googleFetch<T>(url, { body, headers: headers(cid) });
      directLogin.add(cid);
      return result;
    } catch {
      throw error;
    }
  }
}

export async function adsSearch<T>(customerId: string, query: string): Promise<T[]> {
  const rows: T[] = [];
  let pageToken: string | undefined;
  do {
    const json = await adsCall<{ results?: T[]; nextPageToken?: string }>(
      customerId,
      "/googleAds:search",
      { query, ...(pageToken ? { pageToken } : {}) },
    );
    rows.push(...(json.results ?? []));
    pageToken = json.nextPageToken;
  } while (pageToken && rows.length < 2000);
  return rows;
}

async function adsMutate(customerId: string, path: string, body: unknown) {
  return adsCall(customerId, path, body);
}

export function enableAutoTagging(customerId: string) {
  const id = cleanCustomerId(customerId);
  return adsMutate(id, ":mutate", {
    operation: { update: { resourceName: `customers/${id}`, autoTaggingEnabled: true } },
    updateMask: "autoTaggingEnabled",
  });
}

export function searchOnlyNetworks(customerId: string, campaignResource: string) {
  return adsMutate(customerId, "/campaigns:mutate", {
    operations: [
      {
        update: {
          resourceName: campaignResource,
          networkSettings: { targetContentNetwork: false, targetPartnerSearchNetwork: false },
        },
        updateMask: "networkSettings.targetContentNetwork,networkSettings.targetPartnerSearchNetwork",
      },
    ],
  });
}

export function addCampaignNegative(customerId: string, campaignResource: string, text: string) {
  return adsMutate(customerId, "/campaignCriteria:mutate", {
    operations: [
      {
        create: {
          campaign: campaignResource,
          negative: true,
          keyword: { text: text.slice(0, 80), matchType: "EXACT" },
        },
      },
    ],
  });
}

export async function listManagedAccounts() {
  const rows = await adsSearch<{
    customerClient?: { id?: string; descriptiveName?: string; manager?: boolean; status?: string };
  }>(
    managerCustomerId(),
    "SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager, customer_client.status FROM customer_client WHERE customer_client.level <= 1",
  );
  return rows
    .map((r) => r.customerClient ?? {})
    .filter((c) => !c.manager && c.status === "ENABLED" && c.id)
    .map((c) => ({ customerId: String(c.id), name: c.descriptiveName || String(c.id) }));
}

export const micros = (value: string | number | undefined) => Number(value || 0) / 1_000_000;
export const toMicros = (dollars: number) => String(Math.round(dollars * 100) * 10_000);

export type KeywordIdeaRow = {
  text?: string;
  keywordIdeaMetrics?: {
    avgMonthlySearches?: string;
    competition?: string;
    competitionIndex?: string;
    monthlySearchVolumes?: { year?: string; month?: string; monthlySearches?: string }[];
    lowTopOfPageBidMicros?: string;
    highTopOfPageBidMicros?: string;
    averageCpcMicros?: string;
  };
};

/** Keyword Planner ideas for this account's market. Seeds are phrases plus the company's own site. */
export async function generateKeywordIdeas(
  customerId: string,
  input: { seeds: string[]; url?: string | null; geoTargets: string[]; language?: string },
) {
  const seeds = input.seeds.map((s) => s.trim()).filter(Boolean).slice(0, 20);
  const body = {
    language: `languageConstants/${input.language || "1000"}`,
    geoTargetConstants: input.geoTargets.map((id) => `geoTargetConstants/${id}`),
    keywordPlanNetwork: "GOOGLE_SEARCH",
    includeAdultKeywords: false,
    pageSize: 300,
    historicalMetricsOptions: { includeAverageCpc: true },
    ...(input.url && seeds.length
      ? { keywordAndUrlSeed: { url: input.url, keywords: seeds } }
      : input.url
        ? { urlSeed: { url: input.url } }
        : { keywordSeed: { keywords: seeds } }),
  };
  const json = await adsCall<{ results?: KeywordIdeaRow[] }>(customerId, ":generateKeywordIdeas", body);
  return json.results ?? [];
}

export type KeywordMatchType = "PHRASE" | "EXACT" | "BROAD";

/** Adds keywords to one ad group. Bids only apply on Manual CPC campaigns. */
export async function addAdGroupKeywords(
  customerId: string,
  adGroupResource: string,
  keywords: { text: string; cpcBidMicros?: string }[],
  matchType: KeywordMatchType,
) {
  const json = await adsMutate(customerId, "/adGroupCriteria:mutate", {
    partialFailure: true,
    operations: keywords.map((k) => ({
      create: {
        adGroup: adGroupResource,
        status: "ENABLED",
        keyword: { text: k.text.slice(0, 80), matchType },
        ...(k.cpcBidMicros ? { cpcBidMicros: k.cpcBidMicros } : {}),
      },
    })),
  }) as { results?: { resourceName?: string }[]; partialFailureError?: { message?: string } };
  return {
    added: (json.results ?? []).filter((r) => r.resourceName).length,
    error: json.partialFailureError?.message || "",
  };
}

/** One Search campaign, budget, ad group, keywords and a responsive search ad in a single all-or-nothing call. */
export async function createSearchCampaign(
  customerId: string,
  input: {
    name: string;
    dailyBudgetMicros: string;
    defaultCpcMicros: string;
    geoTargets: string[];
    keywords: { text: string; cpcBidMicros: string }[];
    matchType: KeywordMatchType;
    finalUrl: string;
    headlines: string[];
    descriptions: string[];
    enabled: boolean;
  },
) {
  const cid = cleanCustomerId(customerId);
  const budget = `customers/${cid}/campaignBudgets/-1`;
  const campaign = `customers/${cid}/campaigns/-2`;
  const adGroup = `customers/${cid}/adGroups/-3`;
  const json = await adsMutate(cid, "/googleAds:mutate", {
    mutateOperations: [
      {
        campaignBudgetOperation: {
          create: {
            resourceName: budget,
            name: `${input.name} budget ${Date.now()}`,
            amountMicros: input.dailyBudgetMicros,
            deliveryMethod: "STANDARD",
            explicitlyShared: false,
          },
        },
      },
      {
        campaignOperation: {
          create: {
            resourceName: campaign,
            name: input.name,
            status: input.enabled ? "ENABLED" : "PAUSED",
            advertisingChannelType: "SEARCH",
            manualCpc: {},
            campaignBudget: budget,
            networkSettings: {
              targetGoogleSearch: true,
              targetSearchNetwork: false,
              targetContentNetwork: false,
              targetPartnerSearchNetwork: false,
            },
            geoTargetTypeSetting: { positiveGeoTargetType: "PRESENCE" },
            containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
          },
        },
      },
      ...input.geoTargets.map((id) => ({
        campaignCriterionOperation: {
          create: { campaign, location: { geoTargetConstant: `geoTargetConstants/${id}` } },
        },
      })),
      {
        campaignCriterionOperation: {
          create: { campaign, language: { languageConstant: "languageConstants/1000" } },
        },
      },
      {
        adGroupOperation: {
          create: {
            resourceName: adGroup,
            campaign,
            name: input.name,
            status: "ENABLED",
            type: "SEARCH_STANDARD",
            cpcBidMicros: input.defaultCpcMicros,
          },
        },
      },
      ...input.keywords.map((k) => ({
        adGroupCriterionOperation: {
          create: {
            adGroup,
            status: "ENABLED",
            keyword: { text: k.text.slice(0, 80), matchType: input.matchType },
            cpcBidMicros: k.cpcBidMicros,
          },
        },
      })),
      {
        adGroupAdOperation: {
          create: {
            adGroup,
            status: "ENABLED",
            ad: {
              finalUrls: [input.finalUrl],
              responsiveSearchAd: {
                headlines: input.headlines.map((text) => ({ text })),
                descriptions: input.descriptions.map((text) => ({ text })),
              },
            },
          },
        },
      },
    ],
  }) as { mutateOperationResponses?: { campaignResult?: { resourceName?: string } }[] };
  const created = json.mutateOperationResponses?.find((r) => r.campaignResult)?.campaignResult?.resourceName || "";
  return { campaignId: created.split("/").pop() || "" };
}
