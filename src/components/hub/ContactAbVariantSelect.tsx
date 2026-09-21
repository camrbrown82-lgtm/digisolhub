"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CONTACT_AB_VARIANTS,
  CONTACT_AB_VARIANT_LABELS,
  type ContactAbVariant,
  contactAbVariantLabel,
} from "@/lib/contactAbVariants";

export function ContactAbVariantSelect({
  contactId,
  value,
  compact = false,
}: {
  contactId: string;
  value: string | null;
  compact?: boolean;
}) {
  const router = useRouter();
  const [variant, setVariant] = useState(value || "");
  const [busy, setBusy] = useState(false);

  async function onChange(next: string) {
    setVariant(next);
    setBusy(true);
    try {
      const response = await fetch(`/api/hub/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ab_variant: next || null }),
      });
      if (!response.ok) {
        setVariant(value || "");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={variant}
      disabled={busy}
      onChange={(event) => void onChange(event.target.value)}
      className={compact ? "hub-field max-w-[8rem] py-1 text-xs" : "hub-field"}
      aria-label={`A/B group: ${contactAbVariantLabel(value)}`}
      title="A/B test group"
    >
      <option value="">Unassigned</option>
      {CONTACT_AB_VARIANTS.map((item) => (
        <option key={item} value={item}>
          {CONTACT_AB_VARIANT_LABELS[item as ContactAbVariant]}
        </option>
      ))}
    </select>
  );
}
