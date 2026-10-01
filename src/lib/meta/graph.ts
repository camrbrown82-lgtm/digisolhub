import { metaAccessToken, metaGraphVersion } from "@/lib/meta/config";

export class MetaApiError extends Error {}

type GraphError = { message?: string; error_user_title?: string; error_user_msg?: string; code?: number };

export async function metaGraph<T>(method: "GET" | "POST" | "DELETE", path: string, params: Record<string, unknown> = {}) {
  const token = metaAccessToken();
  if (!token) throw new MetaApiError("Meta access token is not set. Add META_CAPI_ACCESS_TOKEN in Vercel.");
  const url = new URL(`https://graph.facebook.com/${metaGraphVersion()}/${path.replace(/^\//, "")}`);
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, access_token: token })) {
    if (value === undefined || value === null) continue;
    const text = typeof value === "string" ? value : JSON.stringify(value);
    if (method === "GET") url.searchParams.set(key, text);
    else body.set(key, text);
  }
  const response = await fetch(url, {
    method,
    ...(method === "GET" ? {} : { body, headers: { "Content-Type": "application/x-www-form-urlencoded" } }),
  });
  const json = (await response.json().catch(() => ({}))) as T & { error?: GraphError };
  if (!response.ok || json.error) {
    const error = json.error;
    const detail = [error?.error_user_title, error?.error_user_msg || error?.message].filter(Boolean).join(": ");
    throw new MetaApiError(detail || `Meta API HTTP ${response.status}`);
  }
  return json as T;
}
