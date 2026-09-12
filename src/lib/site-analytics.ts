export type SiteEvent = {
  client_id?: string | null;
  visitor_id?: string | null;
  host?: string | null;
  path?: string | null;
  title?: string | null;
  referrer?: string | null;
  created_at: string;
};

export function trackingSnippet(origin: string, siteKey: string) {
  const src = `${origin.replace(/\/$/, "")}/t.js`;
  return `<script defer src="${src}" data-key="${siteKey}"></script>`;
}

export function isBot(userAgent: string) {
  return /bot|crawl|spider|slurp|facebookexternalhit|preview|lighthouse|headless/i.test(
    userAgent,
  );
}

export function sanitizePath(value: string) {
  const raw = value.trim() || "/";
  try {
    if (raw.startsWith("http")) {
      const url = new URL(raw);
      return `${url.pathname || "/"}${url.search}`.slice(0, 500);
    }
  } catch {
    // keep raw
  }
  return raw.slice(0, 500);
}

export function referrerHost(referrer: string | null | undefined, host?: string | null) {
  if (!referrer) return "Direct";
  try {
    const url = new URL(referrer);
    if (host && url.host.replace(/^www\./, "") === host.replace(/^www\./, "")) {
      return "Direct";
    }
    return url.host.replace(/^www\./, "") || "Direct";
  } catch {
    return "Direct";
  }
}

export function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export function lastDays(count: number) {
  const days: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() - i);
    days.push(date.toISOString().slice(0, 10));
  }
  return days;
}

function topCounts(values: string[], limit = 8) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export function summarizeSiteEvents(events: SiteEvent[], host?: string | null) {
  const visitors = new Set(events.map((event) => event.visitor_id).filter(Boolean));
  const days = lastDays(14);
  const byDay = new Map(days.map((day) => [day, 0]));
  for (const event of events) {
    const key = dayKey(event.created_at);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  return {
    pageviews: events.length,
    visitors: visitors.size,
    pages: topCounts(events.map((event) => event.path || "/")),
    referrers: topCounts(events.map((event) => referrerHost(event.referrer, host))),
    daily: days.map((day) => ({ day, count: byDay.get(day) ?? 0 })),
  };
}

export function newSiteKey() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 24);
}
