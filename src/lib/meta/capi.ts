import {
  hashEmailForMeta,
  hashPhoneForMeta,
  metaAccessToken,
  metaCapiConfigured,
  metaGraphVersion,
  metaPixelId,
} from "@/lib/meta/config";

export type CapIUserData = {
  email?: string | null;
  phone?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
};

export type CapILeadInput = {
  eventId: string;
  eventSourceUrl?: string | null;
  user: CapIUserData;
  customData?: Record<string, string | number | boolean | undefined>;
};

export type CapIResult = {
  ok: boolean;
  skipped?: boolean;
  eventsReceived?: number;
  error?: string;
  raw?: unknown;
};

/**
 * Send a Lead event to Meta Conversions API (server-side).
 * Pair with browser Pixel Lead using the same eventId for deduplication.
 */
export async function sendMetaLeadEvent(input: CapILeadInput): Promise<CapIResult> {
  if (!metaCapiConfigured()) {
    return { ok: false, skipped: true, error: "Meta CAPI is not configured." };
  }

  const pixelId = metaPixelId();
  const token = metaAccessToken();
  const emailHash = input.user.email ? hashEmailForMeta(input.user.email) : "";
  const phoneHash = input.user.phone ? hashPhoneForMeta(input.user.phone) : "";

  const userData: Record<string, string | string[]> = {};
  if (emailHash) userData.em = [emailHash];
  if (phoneHash) userData.ph = [phoneHash];
  if (input.user.fbp) userData.fbp = input.user.fbp;
  if (input.user.fbc) userData.fbc = input.user.fbc;
  if (input.user.clientIpAddress) {
    userData.client_ip_address = input.user.clientIpAddress;
  }
  if (input.user.clientUserAgent) {
    userData.client_user_agent = input.user.clientUserAgent;
  }

  const customData: Record<string, string | number> = {
    content_name: "consultation_request",
  };
  if (input.customData) {
    for (const [key, value] of Object.entries(input.customData)) {
      if (value === undefined || value === null || value === "") continue;
      customData[key] = typeof value === "boolean" ? Number(value) : value;
    }
  }

  const event = {
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    event_source_url:
      input.eventSourceUrl || process.env.SITE_URL || "https://wwwdigisol.com",
    action_source: "website",
    user_data: userData,
    custom_data: customData,
  };

  const url = `https://graph.facebook.com/${metaGraphVersion()}/${pixelId}/events`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [event],
        access_token: token,
      }),
    });
    const raw = (await response.json().catch(() => ({}))) as {
      events_received?: number;
      error?: { message?: string };
    };
    if (!response.ok || raw.error) {
      return {
        ok: false,
        error: raw.error?.message || `Meta CAPI HTTP ${response.status}`,
        raw,
      };
    }
    return {
      ok: true,
      eventsReceived: raw.events_received ?? 1,
      raw,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Meta CAPI request failed",
    };
  }
}
