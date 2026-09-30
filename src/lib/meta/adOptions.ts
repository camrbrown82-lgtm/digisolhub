export const AD_OBJECTIVES = {
  OUTCOME_LEADS: "Leads (website form fills)",
  OUTCOME_TRAFFIC: "Traffic (website visits)",
} as const;
export type AdObjective = keyof typeof AD_OBJECTIVES;

export const AD_CTAS = {
  LEARN_MORE: "Learn more",
  GET_QUOTE: "Get quote",
  CONTACT_US: "Contact us",
  SIGN_UP: "Sign up",
  APPLY_NOW: "Apply now",
} as const;
export type AdCta = keyof typeof AD_CTAS;

export function isAdObjective(value: unknown): value is AdObjective {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(AD_OBJECTIVES, value);
}

export function isAdCta(value: unknown): value is AdCta {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(AD_CTAS, value);
}
