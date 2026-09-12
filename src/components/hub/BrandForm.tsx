"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { type CompanyBrand } from "@/lib/branding";

function ColorField({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: string;
}) {
  const [hex, setHex] = useState(value);
  return (
    <label className="block text-sm">
      {label}
      <span className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          value={hex}
          onChange={(event) => setHex(event.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-zinc-800 bg-zinc-950"
        />
        <input
          name={name}
          value={hex}
          onChange={(event) => setHex(event.target.value)}
          className="hub-field mt-0 font-mono"
        />
      </span>
    </label>
  );
}

export function BrandForm({
  clientId,
  companyName,
  domain,
  brand,
}: {
  clientId: string;
  companyName: string;
  domain?: string | null;
  brand: CompanyBrand;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    const data = new FormData(event.currentTarget);
    const response = await fetch(`/api/hub/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        domain: data.get("domain"),
          branding: {
          tagline: data.get("tagline"),
          voice: data.get("voice"),
          audience: data.get("audience"),
          primaryColor: data.get("primaryColor"),
          secondaryColor: data.get("secondaryColor"),
          accentColor: data.get("accentColor"),
          backgroundColor: data.get("backgroundColor"),
          fonts: data.get("fonts"),
          doSay: data.get("doSay"),
          dontSay: data.get("dontSay"),
          extra: data.get("extra"),
          visualStyle: data.get("visualStyle"),
        },
      }),
    });
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setStatus(result.error || "Could not save brand");
      return;
    }
    setStatus("Brand saved. Emails and AI posters will use this kit.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div
        className="flex items-center gap-4 rounded-2xl border border-zinc-800 p-4"
        style={{ background: brand.secondaryColor }}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full text-sm font-semibold" style={{ background: brand.primaryColor, color: "#fff" }}>
          {companyName.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-white">{companyName}</p>
          <p className="text-sm" style={{ color: brand.accentColor }}>
            {brand.tagline || "Add a tagline"}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          {[brand.primaryColor, brand.secondaryColor, brand.accentColor, brand.backgroundColor].map(
            (color) => (
              <span
                key={color}
                className="h-6 w-6 rounded-full border border-white/20"
                style={{ background: color }}
                title={color}
              />
            ),
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Company name
          <input name="name" defaultValue={companyName} required className="hub-field" />
        </label>
        <label className="block text-sm">
          Domain
          <input name="domain" defaultValue={domain ?? ""} className="hub-field" placeholder="acme.com" />
        </label>
        <label className="block text-sm sm:col-span-2">
          Tagline
          <input name="tagline" defaultValue={brand.tagline} className="hub-field" />
        </label>
        <label className="block text-sm sm:col-span-2">
          Voice / tone
          <textarea name="voice" defaultValue={brand.voice} rows={3} className="hub-field resize-y" />
        </label>
        <label className="block text-sm sm:col-span-2">
          Audience
          <input name="audience" defaultValue={brand.audience} className="hub-field" />
        </label>
        <ColorField label="Primary color" name="primaryColor" value={brand.primaryColor} />
        <ColorField label="Secondary / header" name="secondaryColor" value={brand.secondaryColor} />
        <ColorField label="Accent" name="accentColor" value={brand.accentColor} />
        <ColorField label="Background" name="backgroundColor" value={brand.backgroundColor} />
        <label className="block text-sm sm:col-span-2">
          Fonts
          <input name="fonts" defaultValue={brand.fonts} className="hub-field" />
        </label>
        <label className="block text-sm sm:col-span-2">
          Poster / visual style
          <textarea
            name="visualStyle"
            defaultValue={brand.visualStyle}
            rows={3}
            className="hub-field resize-y"
            placeholder="Materials, lighting, mood. Example: dark zinc, indigo glow, cinematic, lots of empty space."
          />
        </label>
        <label className="block text-sm">
          Words to lean on
          <textarea name="doSay" defaultValue={brand.doSay} rows={3} className="hub-field resize-y" />
        </label>
        <label className="block text-sm">
          Words to avoid
          <textarea name="dontSay" defaultValue={brand.dontSay} rows={3} className="hub-field resize-y" />
        </label>
        <label className="block text-sm sm:col-span-2">
          Other brand notes
          <textarea
            name="extra"
            defaultValue={brand.extra}
            rows={4}
            className="hub-field resize-y"
            placeholder="Offer, proof points, cities, products, legal lines…"
          />
        </label>
      </div>

      <button type="submit" disabled={saving} className="hub-btn">
        {saving ? "Saving…" : "Save brand kit"}
      </button>
      {status ? <p className="text-sm text-indigo-300">{status}</p> : null}
    </form>
  );
}
