import { JWT } from "google-auth-library";

export const GOOGLE_SCOPES = {
  analyticsEdit: "https://www.googleapis.com/auth/analytics.edit",
  analyticsRead: "https://www.googleapis.com/auth/analytics.readonly",
  searchConsole: "https://www.googleapis.com/auth/webmasters",
  ads: "https://www.googleapis.com/auth/adwords",
} as const;

const ALL_SCOPES = Object.values(GOOGLE_SCOPES);

function readPrivateKey() {
  const raw =
    process.env.GA4_PRIVATE_KEY?.trim() || process.env.GOOGLE_PRIVATE_KEY?.trim() || "";
  return raw.replace(/\\n/g, "\n");
}

/** The DigiSol robot login clients add as a user in GA4, Search Console and Google Ads. */
export function serviceAccountEmail() {
  return (process.env.GA4_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || "").trim();
}

export function serviceAccountReady() {
  return Boolean(serviceAccountEmail() && readPrivateKey());
}

let jwt: JWT | null = null;

async function accessToken() {
  if (!serviceAccountReady()) {
    throw new GoogleApiError(
      "Add GA4_CLIENT_EMAIL and GA4_PRIVATE_KEY (the Google service account) on Vercel.",
      0,
      "NOT_CONFIGURED",
    );
  }
  jwt ??= new JWT({ email: serviceAccountEmail(), key: readPrivateKey(), scopes: ALL_SCOPES });
  const { token } = await jwt.getAccessToken();
  if (!token) throw new GoogleApiError("Google did not return an access token.", 0, "NO_TOKEN");
  return token;
}

export class GoogleApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public reason: string,
    public helpUrl?: string,
    public adsCode?: string,
  ) {
    super(message);
  }

  get disabledApi() {
    return (
      this.reason === "SERVICE_DISABLED" ||
      this.reason === "accessNotConfigured" ||
      this.adsCode === "PROJECT_DISABLED"
    );
  }

  get noAccess() {
    return this.status === 403 && !this.disabledApi;
  }
}

type GoogleErrorBody = {
  error?: {
    message?: string;
    status?: string;
    errors?: { reason?: string }[];
    details?: {
      reason?: string;
      metadata?: { activationUrl?: string };
      links?: { url?: string }[];
      errors?: {
        message?: string;
        errorCode?: { authorizationError?: string; authenticationError?: string };
      }[];
    }[];
  };
};

function parseError(status: number, body: GoogleErrorBody) {
  const err = body.error ?? {};
  const details = err.details ?? [];
  const adsErrors = details.flatMap((d) => d.errors ?? []);
  const reason =
    details.find((d) => d.reason)?.reason || err.errors?.[0]?.reason || err.status || "ERROR";
  const helpUrl =
    details.find((d) => d.metadata?.activationUrl)?.metadata?.activationUrl ||
    details.flatMap((d) => d.links ?? []).find((l) => l.url)?.url;
  const adsMessage = adsErrors.find((e) => e.message)?.message;
  const adsCode = adsErrors
    .map((e) => e.errorCode?.authorizationError || e.errorCode?.authenticationError || "")
    .find((code) => code);
  return new GoogleApiError(
    adsMessage || err.message || `Google API ${status}`,
    status,
    reason,
    helpUrl,
    adsCode,
  );
}

export async function googleFetch<T>(
  url: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string>; timeoutMs?: number } = {},
): Promise<T> {
  const token = await accessToken();
  const res = await fetch(url, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(init.timeoutMs ?? 15000),
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : {};
  if (!res.ok) throw parseError(res.status, json as GoogleErrorBody);
  return json as T;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
