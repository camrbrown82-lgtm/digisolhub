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
