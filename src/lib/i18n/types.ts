/** Turns literal types from `as const` sources into plain strings so every language shares one shape. */
export type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends (...args: infer A) => infer R
        ? (...args: A) => Widen<R>
        : T extends readonly (infer U)[]
          ? readonly Widen<U>[]
          : T extends object
            ? { [K in keyof T]: Widen<T[K]> }
            : T;

/** Per-city wording that replaces the English in `LOCATION_PAGES`. */
export type CityCopy = {
  regionLabel: string;
  headline: string;
  subhead: string;
  intro: string;
  focus: string[];
  nearby: string;
  keywords: string[];
};

/** Customer-facing wording for a pricing item; amounts stay in `lib/pricing`. */
export type PricingItemCopy = {
  name: string;
  blurb: string;
  includes: string[];
  badge?: string;
  timeline?: string;
};

export type ScoreTier = "strong" | "solid" | "needs_work";
export type AuditEmailSource = "prospect_audit" | "visitor_chat";
