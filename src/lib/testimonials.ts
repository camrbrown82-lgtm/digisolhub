/**
 * Real client testimonials, as supplied by the client (spelling fixed only).
 * Never add, reword, or embellish a quote without the client's approval.
 */
export type Testimonial = {
  id: string;
  name?: string;
  company: string;
  /** English original. Other languages show a labeled translation from messages. */
  quote: string;
  /** Star rating the client gave, if any. */
  rating?: number;
  status: "launched" | "in_progress";
  /** Client's public site; only set once they agree to the link and the site is live. */
  url?: string;
};

/** Published quotes only. Leave this empty until each quote is finished and approved. */
export const TESTIMONIALS: Testimonial[] = [];
