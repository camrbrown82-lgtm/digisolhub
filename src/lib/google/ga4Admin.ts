import { googleFetch } from "@/lib/google/auth";

const ADMIN = "https://analyticsadmin.googleapis.com";
const DATA = "https://analyticsdata.googleapis.com/v1beta";

export type Ga4Property = {
  name: string;
  displayName?: string;
  timeZone?: string;
  currencyCode?: string;
  industryCategory?: string;
};

export type Ga4Stream = {
  name: string;
  type?: string;
  displayName?: string;
  webStreamData?: { measurementId?: string; defaultUri?: string };
};

export type Ga4EnhancedMeasurement = {
  name: string;
  streamEnabled?: boolean;
  pageChangesEnabled?: boolean;
  scrollsEnabled?: boolean;
  outboundClicksEnabled?: boolean;
  formInteractionsEnabled?: boolean;
  fileDownloadsEnabled?: boolean;
};

export function propertyPath(propertyId: string) {
  return `properties/${propertyId.replace(/^properties\//, "").trim()}`;
}

export function getProperty(propertyId: string) {
  return googleFetch<Ga4Property>(`${ADMIN}/v1beta/${propertyPath(propertyId)}`);
}

export function setPropertyLocale(propertyId: string, timeZone: string, currencyCode: string) {
  return googleFetch<Ga4Property>(
    `${ADMIN}/v1beta/${propertyPath(propertyId)}?updateMask=timeZone,currencyCode`,
    { method: "PATCH", body: { timeZone, currencyCode } },
  );
}

export function getRetention(propertyId: string) {
  return googleFetch<{ eventDataRetention?: string; resetUserDataOnNewActivity?: boolean }>(
    `${ADMIN}/v1beta/${propertyPath(propertyId)}/dataRetentionSettings`,
  );
}

export function setMaxRetention(propertyId: string) {
  return googleFetch(
    `${ADMIN}/v1beta/${propertyPath(propertyId)}/dataRetentionSettings?updateMask=eventDataRetention,resetUserDataOnNewActivity`,
    {
      method: "PATCH",
      body: { eventDataRetention: "FOURTEEN_MONTHS", resetUserDataOnNewActivity: true },
    },
  );
}

export async function listStreams(propertyId: string) {
  const json = await googleFetch<{ dataStreams?: Ga4Stream[] }>(
    `${ADMIN}/v1beta/${propertyPath(propertyId)}/dataStreams`,
  );
  return (json.dataStreams ?? []).filter((s) => s.type === "WEB_DATA_STREAM");
}

export function getEnhancedMeasurement(streamName: string) {
  return googleFetch<Ga4EnhancedMeasurement>(
    `${ADMIN}/v1alpha/${streamName}/enhancedMeasurementSettings`,
  );
}

/** Page views on load and on in-app navigation, which single-page sites need. */
export function enablePageChangeTracking(streamName: string) {
  return googleFetch<Ga4EnhancedMeasurement>(
    `${ADMIN}/v1alpha/${streamName}/enhancedMeasurementSettings?updateMask=streamEnabled,pageChangesEnabled`,
    { method: "PATCH", body: { streamEnabled: true, pageChangesEnabled: true } },
  );
}

/** Account-level and read-only by API. `sharingWithOthersEnabled` is "Modeling contributions & business insights", which benchmarking needs. */
export function getDataSharing(accountId: string) {
  return googleFetch<{ sharingWithOthersEnabled?: boolean }>(
    `${ADMIN}/v1beta/accounts/${accountId.replace(/\D/g, "")}/dataSharingSettings`,
  );
}

export async function listKeyEvents(propertyId: string) {
  const json = await googleFetch<{ keyEvents?: { eventName: string }[] }>(
    `${ADMIN}/v1beta/${propertyPath(propertyId)}/keyEvents?pageSize=200`,
  );
  return (json.keyEvents ?? []).map((k) => k.eventName);
}

export function createKeyEvent(propertyId: string, eventName: string) {
  return googleFetch(`${ADMIN}/v1beta/${propertyPath(propertyId)}/keyEvents`, {
    body: { eventName, countingMethod: "ONCE_PER_EVENT" },
  });
}

export async function listAdsLinks(propertyId: string) {
  const json = await googleFetch<{ googleAdsLinks?: { customerId?: string }[] }>(
    `${ADMIN}/v1beta/${propertyPath(propertyId)}/googleAdsLinks`,
  );
  return (json.googleAdsLinks ?? []).map((l) => (l.customerId || "").replace(/\D/g, ""));
}

export function createAdsLink(propertyId: string, customerId: string) {
  return googleFetch(`${ADMIN}/v1beta/${propertyPath(propertyId)}/googleAdsLinks`, {
    body: { customerId: customerId.replace(/\D/g, ""), adsPersonalizationEnabled: true },
  });
}

export type Ga4PropertySummary = { propertyId: string; name: string; account: string };

export async function listAccessibleProperties(): Promise<Ga4PropertySummary[]> {
  const json = await googleFetch<{
    accountSummaries?: {
      displayName?: string;
      propertySummaries?: { property: string; displayName?: string }[];
    }[];
  }>(`${ADMIN}/v1beta/accountSummaries?pageSize=200`);
  return (json.accountSummaries ?? []).flatMap((a) =>
    (a.propertySummaries ?? []).map((p) => ({
      propertyId: p.property.replace("properties/", ""),
      name: p.displayName || p.property,
      account: a.displayName || "",
    })),
  );
}

/** Event counts over the last `days` days, by event name. */
export async function eventCounts(propertyId: string, days: number) {
  const json = await googleFetch<{
    rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[];
  }>(`${DATA}/${propertyPath(propertyId)}:runReport`, {
    body: {
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      limit: 250,
    },
  });
  const counts = new Map<string, number>();
  for (const row of json.rows ?? []) {
    counts.set(row.dimensionValues?.[0]?.value || "", Number(row.metricValues?.[0]?.value || 0));
  }
  return counts;
}
