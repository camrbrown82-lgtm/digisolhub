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

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "campaign-builder",
    name: "Alisa Brown",
    company: "Campaign Builder",
    quote:
      "DigiSol did an awesome job helping me with ideas and contributed some code to help me transition from a strictly political campaign application to a full-fledged business application. Plans to join his software to boost social media growth.",
    rating: 5,
    status: "launched",
  },
  {
    id: "dealfinder-auctions",
    company: "DealFinder Auctions",
    quote:
      "Still in progress, but the work DigiSol has done so far on DealFinder's auction website is truly impressive. Live testing is in the cards shortly before full launch. Will update testimonial after launch.",
    status: "in_progress",
  },
];
