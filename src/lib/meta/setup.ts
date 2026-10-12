import type { SupabaseClient } from "@supabase/supabase-js";
import { metaAccessToken, metaAdAccountId, metaPixelId } from "@/lib/meta/config";
import { metaGraph } from "@/lib/meta/graph";
import { isDigisolClient } from "@/lib/workspace";

/** Ad account, Page, Instagram, and pixel the Hub uses for one company. */
export type MetaTarget = {
  adAccountId: string;
  pageId: string;
  instagramUserId: string;
  pixelId: string;
};

export type MetaSetupIds = {
  adAccountId: string | null;
  pageId: string | null;
  instagramUserId: string | null;
  pixelId: string | null;
};

export type MetaSetupRecord = {
  needsMigration: boolean;
  saved: boolean;
  ids: MetaSetupIds;
};

export type MetaAdAccountOption = { id: string; name: string; currency: string };
export type MetaPageOption = {
  id: string;
  name: string;
  instagramUserId: string | null;
  instagramUsername: string | null;
};
export type MetaPixelOption = { id: string; name: string; adAccountId: string };

export type MetaDiscovery = {
  adAccounts: MetaAdAccountOption[];
  pages: MetaPageOption[];
  pixels: MetaPixelOption[];
  suggested: MetaSetupIds;
  errors: Record<string, string>;
};

const EMPTY_IDS: MetaSetupIds = {
  adAccountId: null,
  pageId: null,
  instagramUserId: null,
  pixelId: null,
};

export function metaBusinessId() {
  return process.env.META_BUSINESS_ID?.trim().replace(/\D/g, "") || "";
}

export function normalizeAdAccountId(raw: string | null | undefined) {
  const digits = (raw || "").trim().replace(/^act_/i, "").replace(/\D/g, "");
  return digits ? `act_${digits}` : "";
}

function digits(raw: string | null | undefined) {
  return (raw || "").replace(/\D/g, "");
}

export function houseMetaIds(): MetaSetupIds {
  return {
    adAccountId: metaAdAccountId() || null,
    pageId: digits(process.env.META_PAGE_ID) || null,
    instagramUserId: digits(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID) || null,
    pixelId: digits(metaPixelId()) || null,
  };
}

export function houseMetaTarget(): MetaTarget {
  return metaTargetFromIds(houseMetaIds());
}

export function metaTargetFromIds(ids: MetaSetupIds): MetaTarget {
  return {
    adAccountId: normalizeAdAccountId(ids.adAccountId),
    pageId: digits(ids.pageId),
    instagramUserId: digits(ids.instagramUserId),
    pixelId: digits(ids.pixelId),
  };
}

function mergeIds(saved: MetaSetupIds, defaults: MetaSetupIds): MetaSetupIds {
  const adAccountId = normalizeAdAccountId(saved.adAccountId) || defaults.adAccountId;
  const pageId = digits(saved.pageId) || defaults.pageId;
  const instagramUserId = digits(saved.instagramUserId) || defaults.instagramUserId;
  const pixelId = digits(saved.pixelId) || defaults.pixelId;
  return {
    adAccountId: adAccountId || null,
    pageId: pageId || null,
    instagramUserId: instagramUserId || null,
    pixelId: pixelId || null,
  };
}

const missingSchema = (message?: string) =>
  Boolean(message && /meta_setups|schema cache|does not exist/i.test(message));

export async function loadMetaSetup(
  db: SupabaseClient,
  clientId: string,
  defaults: MetaSetupIds = EMPTY_IDS,
): Promise<MetaSetupRecord> {
  const { data, error } = await db
    .from("meta_setups")
    .select("ad_account_id, page_id, instagram_user_id, pixel_id")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) {
    return { needsMigration: missingSchema(error.message), saved: false, ids: defaults };
  }
  if (!data) return { needsMigration: false, saved: false, ids: defaults };
  return {
    needsMigration: false,
    saved: true,
    ids: mergeIds(
      {
        adAccountId: data.ad_account_id || null,
        pageId: data.page_id || null,
        instagramUserId: data.instagram_user_id || null,
        pixelId: data.pixel_id || null,
      },
      defaults,
    ),
  };
}

export async function metaTargetForClientId(db: SupabaseClient, clientId: string): Promise<MetaTarget> {
  const { data } = await db.from("clients").select("name").eq("id", clientId).maybeSingle();
  const defaults = isDigisolClient(data) ? houseMetaIds() : EMPTY_IDS;
  const setup = await loadMetaSetup(db, clientId, defaults);
  return metaTargetFromIds(setup.ids);
}

export async function saveMetaIds(db: SupabaseClient, clientId: string, ids: MetaSetupIds) {
  const { error } = await db.from("meta_setups").upsert(
    {
      client_id: clientId,
      ad_account_id: normalizeAdAccountId(ids.adAccountId) || null,
      page_id: digits(ids.pageId) || null,
      instagram_user_id: digits(ids.instagramUserId) || null,
      pixel_id: digits(ids.pixelId) || null,
    },
    { onConflict: "client_id" },
  );
  if (error) throw new Error(error.message);
}

/** Page token for posting. DigiSol's saved page token is used for its own Page. */
export async function pageAccessToken(pageId: string) {
  const id = digits(pageId);
  if (!id) return "";
  const housePage = digits(process.env.META_PAGE_ID);
  const houseToken =
    process.env.META_PAGE_ACCESS_TOKEN?.trim() || process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim() || "";
  if (housePage && id === housePage && houseToken) return houseToken;
  try {
    const row = await metaGraph<{ access_token?: string }>("GET", id, { fields: "access_token" });
    return row.access_token?.trim() || "";
  } catch {
    return "";
  }
}

type GraphPage = {
  id?: string;
  name?: string;
  instagram_business_account?: { id?: string; username?: string };
};

type GraphAccount = { id?: string; account_id?: string; name?: string; currency?: string };

async function graphList<T>(path: string, fields: string): Promise<{ data: T[]; error?: string }> {
  try {
    const json = await metaGraph<{ data?: T[] }>("GET", path, { fields, limit: 50 });
    return { data: json.data ?? [] };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Meta did not answer." };
  }
}

function asPages(rows: GraphPage[]): MetaPageOption[] {
  const seen = new Set<string>();
  const pages: MetaPageOption[] = [];
  for (const row of rows) {
    const id = digits(row.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    pages.push({
      id,
      name: row.name?.trim() || `Page ${id}`,
      instagramUserId: digits(row.instagram_business_account?.id) || null,
      instagramUsername: row.instagram_business_account?.username?.trim() || null,
    });
  }
  return pages;
}

function asAccounts(rows: GraphAccount[]): MetaAdAccountOption[] {
  const seen = new Set<string>();
  const accounts: MetaAdAccountOption[] = [];
  for (const row of rows) {
    const id = normalizeAdAccountId(row.account_id || row.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    accounts.push({
      id,
      name: row.name?.trim() || id,
      currency: row.currency?.trim() || "",
    });
  }
  return accounts;
}

function pickMatch<T extends { name: string }>(rows: T[], companyName: string) {
  const needle = companyName.trim().toLowerCase();
  if (!needle) return rows.length === 1 ? rows[0] : null;
  const named = rows.find((row) => row.name.toLowerCase().includes(needle));
  return named || (rows.length === 1 ? rows[0] : null);
}

/** Ad accounts, Pages, and pixels the Hub's Meta login can already see. */
export async function discoverMetaAccess(companyName: string): Promise<MetaDiscovery> {
  const errors: Record<string, string> = {};
  if (!metaAccessToken()) {
    return {
      adAccounts: [],
      pages: [],
      pixels: [],
      suggested: EMPTY_IDS,
      errors: { token: "Add META_CAPI_ACCESS_TOKEN in Vercel first." },
    };
  }

  const accountsResult = await graphList<GraphAccount>(
    "me/adaccounts",
    "name,account_id,currency",
  );
  let adAccounts = asAccounts(accountsResult.data);
  if (!adAccounts.length) {
    const assigned = await graphList<GraphAccount>("me/assigned_ad_accounts", "name,account_id,currency");
    adAccounts = asAccounts(assigned.data);
    if (!adAccounts.length && (accountsResult.error || assigned.error)) {
      errors.adAccounts = accountsResult.error || assigned.error || "No ad accounts are assigned to the Hub.";
    }
  }

  const pagesResult = await graphList<GraphPage>(
    "me/accounts",
    "id,name,instagram_business_account{id,username}",
  );
  let pages = asPages(pagesResult.data);
  if (!pages.length) {
    const assigned = await graphList<GraphPage>(
      "me/assigned_pages",
      "id,name,instagram_business_account{id,username}",
    );
    pages = asPages(assigned.data.length ? assigned.data : (await graphList<GraphPage>("me/assigned_pages", "id,name")).data);
    if (!pages.length && (pagesResult.error || assigned.error)) {
      errors.pages = pagesResult.error || assigned.error || "No Facebook Pages are assigned to the Hub.";
    }
  }

  const pixels: MetaPixelOption[] = [];
  for (const account of adAccounts.slice(0, 8)) {
    const found = await graphList<{ id?: string; name?: string }>(`${account.id}/adspixels`, "id,name");
    for (const pixel of found.data) {
      const id = digits(pixel.id);
      if (!id) continue;
      pixels.push({ id, name: pixel.name?.trim() || `Pixel ${id}`, adAccountId: account.id });
    }
  }

  const account = pickMatch(adAccounts, companyName);
  const page = pickMatch(pages, companyName);
  const accountPixels = pixels.filter((pixel) => pixel.adAccountId === account?.id);
  const pixel = accountPixels.length === 1 ? accountPixels[0] : null;

  return {
    adAccounts,
    pages,
    pixels,
    suggested: {
      adAccountId: account?.id || null,
      pageId: page?.id || null,
      instagramUserId: page?.instagramUserId || null,
      pixelId: pixel?.id || null,
    },
    errors,
  };
}

/** Fills a blank Instagram id from the Page when Meta has one linked. */
export async function instagramForPage(pageId: string) {
  const id = digits(pageId);
  if (!id) return "";
  try {
    const page = await metaGraph<GraphPage>("GET", id, { fields: "instagram_business_account{id,username}" });
    return digits(page.instagram_business_account?.id);
  } catch {
    return "";
  }
}
