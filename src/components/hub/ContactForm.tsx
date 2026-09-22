"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CAMPAIGN_CHANNELS,
  CAMPAIGN_CHANNEL_LABELS,
  type CampaignChannel,
} from "@/lib/campaignChannels";
import {
  CONTACT_AB_VARIANTS,
  CONTACT_AB_VARIANT_LABELS,
  type ContactAbVariant,
} from "@/lib/contactAbVariants";

const field = "hub-field";

const CONTACT_SOURCES = [
  { value: "manual", label: "Manual / Hub" },
  { value: "website", label: "Website form" },
  { value: "referral", label: "Referral" },
  { value: "cold_outreach", label: "Cold outreach" },
  { value: "event", label: "Event / networking" },
  { value: "import", label: "CSV import" },
] as const;

export function ContactForm({
  initial,
  contactId,
  clients = [],
  defaultClientId = "",
}: {
  initial?: {
    name?: string | null;
    email?: string;
    company?: string | null;
    domain?: string | null;
    phone?: string | null;
    service?: string | null;
    source?: string | null;
    tags?: string[] | null;
    client_id?: string | null;
    campaign_channel?: string | null;
    ab_variant?: string | null;
  };
  contactId?: string;
  clients?: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      company: String(data.get("company") ?? ""),
      domain: String(data.get("domain") ?? ""),
      phone: String(data.get("phone") ?? ""),
      service: String(data.get("service") ?? ""),
      source: String(data.get("source") ?? "") || "manual",
      campaign_channel: String(data.get("campaign_channel") ?? "") || null,
      ab_variant: String(data.get("ab_variant") ?? "") || null,
      client_id: String(data.get("client_id") ?? "") || null,
      tags: String(data.get("tags") ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };

    const url = contactId ? `/api/hub/contacts/${contactId}` : "/api/hub/contacts";
    const method = contactId ? "PATCH" : "POST";
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as { id?: string; error?: string };
    setSaving(false);
    if (!response.ok) {
      setError(result.error || "Could not save contact");
      return;
    }
    // After create, return to the contacts list (Hub home for CRM).
    if (contactId) {
      router.push(`/hub/contacts/${contactId}`);
    } else {
      router.push("/hub/contacts");
    }
    router.refresh();
  }

  const sourceDefault =
    initial?.source &&
    CONTACT_SOURCES.some((item) => item.value === initial.source)
      ? initial.source
      : initial?.source || "manual";

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">
        Name
        <input name="name" defaultValue={initial?.name ?? ""} className={field} />
      </label>
      <label className="text-sm">
        Email
        <input
          name="email"
          type="email"
          required
          defaultValue={initial?.email ?? ""}
          className={field}
        />
      </label>
      <label className="text-sm sm:col-span-2">
        Company workspace
        <select
          name="client_id"
          defaultValue={initial?.client_id ?? defaultClientId}
          className={field}
        >
          <option value="">Unassigned</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Company
        <input name="company" defaultValue={initial?.company ?? ""} className={field} />
      </label>
      <label className="text-sm">
        Domain
        <input name="domain" defaultValue={initial?.domain ?? ""} className={field} />
      </label>
      <label className="text-sm">
        Phone
        <input name="phone" defaultValue={initial?.phone ?? ""} className={field} />
      </label>
      <label className="text-sm">
        Service / industry
        <input name="service" defaultValue={initial?.service ?? ""} className={field} />
      </label>
      <label className="text-sm">
        Lead source
        <select name="source" defaultValue={sourceDefault} className={field}>
          {CONTACT_SOURCES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
          {initial?.source &&
          !CONTACT_SOURCES.some((item) => item.value === initial.source) ? (
            <option value={initial.source}>{initial.source}</option>
          ) : null}
        </select>
      </label>
      <label className="text-sm">
        Campaign channel
        <select
          name="campaign_channel"
          defaultValue={initial?.campaign_channel ?? ""}
          className={field}
        >
          <option value="">Unset</option>
          {CAMPAIGN_CHANNELS.map((channel) => (
            <option key={channel} value={channel}>
              {CAMPAIGN_CHANNEL_LABELS[channel as CampaignChannel]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        A/B test group
        <select
          name="ab_variant"
          defaultValue={initial?.ab_variant ?? ""}
          className={field}
        >
          <option value="">Unassigned</option>
          {CONTACT_AB_VARIANTS.map((variant) => (
            <option key={variant} value={variant}>
              {CONTACT_AB_VARIANT_LABELS[variant as ContactAbVariant]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm sm:col-span-2">
        Tags (comma-separated)
        <input
          name="tags"
          defaultValue={(initial?.tags ?? []).join(", ")}
          className={field}
          placeholder="e.g. lead, trades, booked-consult"
        />
      </label>
      {error ? (
        <p className="sm:col-span-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <div className="sm:col-span-2 flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className="hub-btn">
          {saving ? "Saving…" : contactId ? "Save contact" : "Create contact"}
        </button>
        <button
          type="button"
          className="hub-btn-secondary"
          onClick={() => router.push("/hub/contacts")}
        >
          Back to contacts
        </button>
      </div>
    </form>
  );
}
