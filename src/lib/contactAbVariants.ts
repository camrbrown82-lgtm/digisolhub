export const CONTACT_AB_VARIANTS = ["A", "B"] as const;

export type ContactAbVariant = (typeof CONTACT_AB_VARIANTS)[number];

export const CONTACT_AB_VARIANT_LABELS: Record<ContactAbVariant, string> = {
  A: "Test A",
  B: "Test B",
};

const ALIASES: Record<string, ContactAbVariant> = {
  a: "A",
  b: "B",
  test_a: "A",
  test_b: "B",
  group_a: "A",
  group_b: "B",
  variant_a: "A",
  variant_b: "B",
};

export function isContactAbVariant(value: string): value is ContactAbVariant {
  return CONTACT_AB_VARIANTS.includes(value as ContactAbVariant);
}

export function normalizeContactAbVariant(
  value: string | null | undefined,
): ContactAbVariant | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  if (isContactAbVariant(raw.toUpperCase())) return raw.toUpperCase() as ContactAbVariant;
  const key = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return ALIASES[key] ?? null;
}

export function contactAbVariantLabel(value: string | null | undefined): string {
  const variant = normalizeContactAbVariant(value);
  return variant ? CONTACT_AB_VARIANT_LABELS[variant] : "Unassigned";
}
