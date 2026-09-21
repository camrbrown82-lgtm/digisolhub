"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [error, setError] = useState("");

  useEffect(() => {
    setVariant(value || "");
  }, [value]);

  async function onChange(next: string) {
    const previous = variant;
    setVariant(next);
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/hub/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ab_variant: next || null }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setVariant(previous);
        setError(result.error || "Could not save A/B group");
        return;
      }
      router.refresh();
    } catch {
      setVariant(previous);
      setError("Could not save A/B group");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
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
      {error ? (
        <p className="max-w-[8rem] text-[11px] text-rose-400">{error}</p>
      ) : null}
    </div>
  );
}
