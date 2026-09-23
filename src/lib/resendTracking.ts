import { Resend } from "resend";
import { getResendApiKey, getResendFrom, parseFromAddress } from "@/lib/email";

export type ResendTrackingStatus = {
  configured: boolean;
  domain: string | null;
  domainId: string | null;
  openTracking: boolean;
  clickTracking: boolean;
  trackingSubdomain: string | null;
  domainStatus: string | null;
  trackingReady: boolean;
  dnsHint: string | null;
  error?: string;
  updated?: boolean;
};

type DomainRow = {
  id?: string;
  name?: string;
  status?: string;
  open_tracking?: boolean;
  click_tracking?: boolean;
  tracking_subdomain?: string | null;
  records?: Array<{
    record?: string;
    name?: string;
    type?: string;
    value?: string;
    status?: string;
  }>;
};

let ensuredForDomain: string | null = null;
let ensuredAt = 0;
const ENSURE_TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Resend open/click tracking is OFF by default.
 * Without open_tracking + a verified tracking CNAME, opens never fire
 * webhooks and last_event stays "delivered" — Hub open rate stays 0%.
 */
export async function getResendTrackingStatus(): Promise<ResendTrackingStatus> {
  const apiKey = getResendApiKey();
  const from = parseFromAddress(getResendFrom());
  const domainName = from.domain || null;

  if (!apiKey) {
    return {
      configured: false,
      domain: domainName,
      domainId: null,
      openTracking: false,
      clickTracking: false,
      trackingSubdomain: null,
      domainStatus: null,
      trackingReady: false,
      dnsHint: null,
      error: "RESEND_API_KEY missing",
    };
  }

  if (!domainName || from.isTest) {
    return {
      configured: true,
      domain: domainName,
      domainId: null,
      openTracking: false,
      clickTracking: false,
      trackingSubdomain: null,
      domainStatus: null,
      trackingReady: false,
      dnsHint: null,
      error: from.isTest
        ? "Using Resend test sender — open tracking needs your verified domain."
        : "RESEND_FROM domain missing",
    };
  }

  try {
    const resend = new Resend(apiKey);
    const listed = await resend.domains.list();
    if (listed.error) {
      return {
        configured: true,
        domain: domainName,
        domainId: null,
        openTracking: false,
        clickTracking: false,
        trackingSubdomain: null,
        domainStatus: null,
        trackingReady: false,
        dnsHint: null,
        error: listed.error.message || "Could not list Resend domains",
      };
    }

    const raw = listed.data as unknown;
    const rows: DomainRow[] = Array.isArray(raw)
      ? (raw as DomainRow[])
      : Array.isArray((raw as { data?: DomainRow[] })?.data)
        ? ((raw as { data: DomainRow[] }).data)
        : [];

    const match =
      rows.find(
        (d) =>
          (d.name || "").toLowerCase() === domainName.toLowerCase() ||
          domainName.toLowerCase().endsWith(`.${(d.name || "").toLowerCase()}`),
      ) || null;

    if (!match?.id) {
      return {
        configured: true,
        domain: domainName,
        domainId: null,
        openTracking: false,
        clickTracking: false,
        trackingSubdomain: null,
        domainStatus: null,
        trackingReady: false,
        dnsHint: null,
        error: `Domain ${domainName} not found in this Resend account.`,
      };
    }

    const detail = await resend.domains.get(match.id);
    const domain = (detail.data || match) as DomainRow;
    const openTracking = Boolean(domain.open_tracking);
    const clickTracking = Boolean(domain.click_tracking);
    const trackingSubdomain = domain.tracking_subdomain || null;
    const trackingRecord = (domain.records || []).find(
      (r) => /tracking/i.test(String(r.record || "")) || r.type === "CNAME",
    );
    const trackingDnsOk =
      !trackingRecord ||
      String(trackingRecord.status || "").toLowerCase() === "verified" ||
      String(domain.status || "").toLowerCase() === "verified";

    const trackingReady =
      openTracking && Boolean(trackingSubdomain) && trackingDnsOk;

    let dnsHint: string | null = null;
    if (trackingSubdomain && trackingRecord && !trackingDnsOk) {
      dnsHint = `Add CNAME ${trackingRecord.name || `${trackingSubdomain}.${domain.name}`} → ${trackingRecord.value || "links.resend-dns.com"} and verify in Resend.`;
    } else if (!openTracking) {
      dnsHint =
        "Open tracking is disabled on this domain in Resend (default). DigiSol can enable it via API.";
    }

    return {
      configured: true,
      domain: domain.name || domainName,
      domainId: match.id,
      openTracking,
      clickTracking,
      trackingSubdomain,
      domainStatus: domain.status || null,
      trackingReady,
      dnsHint,
    };
  } catch (err) {
    return {
      configured: true,
      domain: domainName,
      domainId: null,
      openTracking: false,
      clickTracking: false,
      trackingSubdomain: null,
      domainStatus: null,
      trackingReady: false,
      dnsHint: null,
      error: err instanceof Error ? err.message : "Could not read Resend domains",
    };
  }
}

/**
 * Enable open (+ click) tracking on the RESEND_FROM domain.
 * Idempotent; cached for several hours in the serverless instance.
 */
export async function ensureResendOpenTracking(options?: {
  force?: boolean;
}): Promise<ResendTrackingStatus> {
  const status = await getResendTrackingStatus();
  if (!status.configured || !status.domainId) return status;
  if (status.trackingReady && !options?.force) return status;

  const now = Date.now();
  if (
    !options?.force &&
    ensuredForDomain === status.domain &&
    now - ensuredAt < ENSURE_TTL_MS
  ) {
    return status;
  }

  const apiKey = getResendApiKey();
  if (!apiKey || !status.domainId) return status;

  try {
    const resend = new Resend(apiKey);
    await resend.domains.update({
      id: status.domainId,
      openTracking: true,
      clickTracking: true,
      trackingSubdomain: status.trackingSubdomain || "links",
    });

    // Ask Resend to re-check DNS (including tracking CNAME).
    await resend.domains.verify(status.domainId).catch(() => null);

    ensuredForDomain = status.domain;
    ensuredAt = now;

    const next = await getResendTrackingStatus();
    return { ...next, updated: true };
  } catch (err) {
    return {
      ...status,
      error: err instanceof Error ? err.message : "Could not enable open tracking",
      updated: false,
    };
  }
}
