export type AbVariant = "A" | "B";
export type AbAuditPeriod = "day" | "week" | "month";

export type AbSendRow = {
  variant: string | null;
  status: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  created_at: string;
};

export type AbVariantStats = {
  variant: AbVariant;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  clickToOpen: number;
};

export function pct(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

export function periodStart(period: AbAuditPeriod, now = new Date()) {
  const start = new Date(now);
  if (period === "day") start.setHours(start.getHours() - 24);
  else if (period === "week") start.setDate(start.getDate() - 7);
  else start.setDate(start.getDate() - 30);
  return start;
}

export function summarizeAbSends(
  sends: AbSendRow[],
  period?: AbAuditPeriod,
  now = new Date(),
): { a: AbVariantStats; b: AbVariantStats; leader: AbVariant | "tie" | "insufficient" } {
  const cutoff = period ? periodStart(period, now).getTime() : 0;
  const filtered = period
    ? sends.filter((row) => new Date(row.created_at).getTime() >= cutoff)
    : sends;

  function stats(variant: AbVariant): AbVariantStats {
    const rows = filtered.filter(
      (row) => (row.variant || "").toUpperCase() === variant,
    );
    const sent = rows.length;
    const opened = rows.filter(
      (row) =>
        row.opened_at ||
        row.status === "opened" ||
        row.status === "clicked",
    ).length;
    const clicked = rows.filter(
      (row) => row.clicked_at || row.status === "clicked",
    ).length;
    const bounced = rows.filter(
      (row) => row.bounced_at || row.status === "bounced",
    ).length;
    return {
      variant,
      sent,
      opened,
      clicked,
      bounced,
      openRate: pct(opened, sent),
      clickRate: pct(clicked, sent),
      clickToOpen: pct(clicked, opened),
    };
  }

  const a = stats("A");
  const b = stats("B");
  const minSample = 5;
  let leader: AbVariant | "tie" | "insufficient" = "insufficient";
  if (a.sent >= minSample && b.sent >= minSample) {
    if (a.clickRate === b.clickRate && a.openRate === b.openRate) leader = "tie";
    else if (
      a.clickRate > b.clickRate ||
      (a.clickRate === b.clickRate && a.openRate > b.openRate)
    ) {
      leader = "A";
    } else {
      leader = "B";
    }
  }

  return { a, b, leader };
}

/** Deterministic 50/50-ish split after shuffle — returns Map contactId → variant. */
export function assignAbVariants<T extends { id: string }>(
  contacts: T[],
  splitPercentA = 50,
): Map<string, AbVariant> {
  const clamped = Math.min(90, Math.max(10, Math.round(splitPercentA)));
  const shuffled = [...contacts];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const countA = Math.max(
    1,
    Math.min(shuffled.length - 1, Math.round((shuffled.length * clamped) / 100)),
  );
  const map = new Map<string, AbVariant>();
  shuffled.forEach((contact, index) => {
    map.set(contact.id, index < countA ? "A" : "B");
  });
  // Single-contact edge: still assign A so a test send works.
  if (shuffled.length === 1) map.set(shuffled[0].id, "A");
  return map;
}
