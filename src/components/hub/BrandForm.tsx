"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { type CompanyBrand } from "@/lib/branding";
import { BrandLogoKit } from "@/components/hub/BrandLogoKit";
import { DictatedField } from "@/components/hub/MicDictateButton";

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
          textColor: data.get("textColor"),
          highlightColor: data.get("highlightColor"),
          fonts: data.get("fonts"),
          doSay: data.get("doSay"),
          dontSay: data.get("dontSay"),
          extra: data.get("extra"),
          visualStyle: data.get("visualStyle"),
          logoUrl: brand.logoUrl,
          logoDescription: brand.logoDescription,
          secondaryLogoUrl: brand.secondaryLogoUrl,
          secondaryLogoDescription: brand.secondaryLogoDescription,
        },
      }),
    });
    const result = (await response.json()) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setStatus(result.error || "Could not save brand");
      return;
    }
    setStatus(
      `Brand saved for ${companyName}. Emails, logos, and AI posters for this company will stay on this kit.`,
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <BrandLogoKit
        clientId={clientId}
        companyName={companyName}
        logoUrl={brand.logoUrl}
        logoDescription={brand.logoDescription}
        secondaryLogoUrl={brand.secondaryLogoUrl}
        primaryColor={brand.primaryColor}
      />
    <form onSubmit={onSubmit} className="space-y-6">
      <div
        className="flex items-center gap-4 rounded-2xl border border-zinc-800 p-4"
        style={{ background: brand.secondaryColor }}
      >
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt={`${companyName} logo`}
            className="h-14 w-auto max-w-[8rem] object-contain"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full text-sm font-semibold" style={{ background: brand.primaryColor, color: "#fff" }}>
            {companyName.slice(0, 2).toUpperCase()}
          </div>
        )}
        {brand.secondaryLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.secondaryLogoUrl}
            alt=""
            className="h-14 w-14 rounded-full object-cover ring-1 ring-white/20"
            aria-hidden="true"
          />
        ) : null}
        <div>
          <p className="font-medium text-white">{companyName}</p>
          <p className="text-sm" style={{ color: brand.accentColor }}>
            {brand.tagline || "Add a tagline"}
          </p>
          {brand.secondaryLogoUrl ? (
            <p className="mt-1 text-xs text-zinc-400">
              Primary wordmark + secondary badge on file
            </p>
          ) : null}
        </div>
        <div className="ml-auto flex gap-2">
          {[brand.primaryColor, brand.backgroundColor, brand.textColor, brand.highlightColor].map(
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
        <DictatedField
          className="block text-sm sm:col-span-2"
          label="Tagline"
          name="tagline"
          defaultValue={brand.tagline}
          disabled={saving}
        />
        <DictatedField
          className="block text-sm sm:col-span-2"
          label="Voice / tone"
          name="voice"
          defaultValue={brand.voice}
          multiline
          disabled={saving}
        />
        <DictatedField
          className="block text-sm sm:col-span-2"
          label="Audience"
          name="audience"
          defaultValue={brand.audience}
          disabled={saving}
        />
        <ColorField label="Primary color" name="primaryColor" value={brand.primaryColor} />
        <ColorField label="Secondary / header" name="secondaryColor" value={brand.secondaryColor} />
        <ColorField label="Accent" name="accentColor" value={brand.accentColor} />
        <ColorField label="Background" name="backgroundColor" value={brand.backgroundColor} />
        <ColorField label="Text color" name="textColor" value={brand.textColor} />
        <ColorField label="Highlights" name="highlightColor" value={brand.highlightColor} />
        <label className="block text-sm sm:col-span-2">
          Fonts
          <input name="fonts" defaultValue={brand.fonts} className="hub-field" />
        </label>
        <DictatedField
          className="block text-sm sm:col-span-2"
          label="Poster / visual style"
          name="visualStyle"
          defaultValue={brand.visualStyle}
          multiline
          disabled={saving}
          placeholder="Materials, lighting, mood. Example: dark zinc, indigo glow, cinematic, lots of empty space."
        />
        <DictatedField
          label="Words to lean on"
          name="doSay"
          defaultValue={brand.doSay}
          multiline
          disabled={saving}
        />
        <DictatedField
          label="Words to avoid"
          name="dontSay"
          defaultValue={brand.dontSay}
          multiline
          disabled={saving}
        />
        <DictatedField
          className="block text-sm sm:col-span-2"
          label="Other brand notes"
          name="extra"
          defaultValue={brand.extra}
          multiline
          rows={4}
          disabled={saving}
          placeholder="Offer, proof points, cities, products, legal lines…"
        />
      </div>

      <button type="submit" disabled={saving} className="hub-btn">
        {saving ? "Saving…" : "Save brand kit"}
      </button>
      {status ? <p className="text-sm text-indigo-300">{status}</p> : null}
    </form>
    </div>
  );
}
