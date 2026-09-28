/** DigiSol's public promises. Kept in one place so the site, checkout, FAQ and Kaylev stay word-for-word the same. */
export const DIGISOL_GUARANTEES = [
  {
    id: "revisions",
    title: "Unlimited revisions until launch",
    body: "We keep refining the design and copy until you're happy, within the pages and features in your quote. New pages or features are quoted separately, before any work starts.",
  },
  {
    id: "on_time",
    title: "On-time launch guarantee",
    body: "Your launch date is in your written quote. If we miss it and the delay is on our side, your next month of retainer is free.",
  },
  {
    id: "response",
    title: "Replies within one business day",
    body: "Every support request gets a reply from a real person within one business day, before and after launch.",
  },
] as const;

export const GUARANTEE_FINE_PRINT =
  "The launch date moves if content, feedback or approvals come in late. Scope is what's listed in your signed quote.";

/** One line for tight spots such as the checkout form. */
export const GUARANTEE_SHORT =
  "Unlimited revisions until launch, an on-time launch guarantee, and replies within one business day.";
