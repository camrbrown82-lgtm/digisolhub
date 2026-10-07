"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BRAND_WORDING_KEYS, type BrandWording, type CompanyBrand } from "@/lib/branding";
import { BrandLogoKit } from "@/components/hub/BrandLogoKit";
import { BrandWordingHelper } from "@/components/hub/BrandWordingHelper";
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
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [logoSize, setLogoSize] = useState(Number(brand.logoSize) || 72);
  const [badgeSize, setBadgeSize] = useState(Number(brand.badgeSize) || 56);
  const [words, setWords] = useState<BrandWording>(
    () => Object.fromEntries(BRAND_WORDING_KEYS.map((key) => [key, brand[key]])) as BrandWording,
  );
  // Bumping a field's version remounts it with the new wording.
  const [versions, setVersions] = useState<Record<string, number>>({});
  const fieldKey = (name: keyof BrandWording) => `${name}-${versions[name] ?? 0}`;

  function applyWords(next: Partial<BrandWording>) {
    setWords((current) => ({ ...current, ...next }));
    setVersions((current) => ({
      ...current,
      ...Object.fromEntries(Object.keys(next).map((key) => [key, (current[key] ?? 0) + 1])),
    }));
  }

  async function saveWording(next: Partial<BrandWording>) {
    setSaving(true);
    setStatus("");
    const response = await fetch(`/api/hub/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branding: next }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setSaving(false);
    if (!response.ok) {
      setStatus(result.error || "Could not save the wording");
      return false;
    }
    setStatus(`Wording saved for ${companyName}. Colors, fonts, and logos weren't changed.`);
    router.refresh();
    return true;
  }

  function saveFormWording() {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    void saveWording(
      Object.fromEntries(BRAND_WORDING_KEYS.map((key) => [key, String(data.get(key) ?? "")])) as BrandWording,
    );
  }

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
          logoSize: String(logoSize),
          badgeSize: String(badgeSize),
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
      <BrandWordingHelper
        clientId={clientId}
        companyName={companyName}
        domain={domain}
        onApply={applyWords}
        onSave={saveWording}
      />
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
      <div
        className="flex items-center gap-4 rounded-2xl border border-zinc-800 p-4"
        style={{ background: brand.secondaryColor }}
      >
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt={`${companyName} logo`}
            className="w-auto max-w-[12rem] object-contain"
            style={{ height: logoSize }}
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
            className="rounded-full object-cover ring-1 ring-white/20"
            style={{ height: badgeSize, width: badgeSize }}
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
          Logo size {logoSize}
          <input
            type="range"
            min={36}
            max={160}
            value={logoSize}
            onChange={(event) => setLogoSize(Number(event.target.value))}
            className="mt-1 w-full"
          />
        </label>
        <label className="block text-sm">
          Logo badge size {badgeSize}
          <input
            type="range"
            min={32}
            max={160}
            value={badgeSize}
            onChange={(event) => setBadgeSize(Number(event.target.value))}
            className="mt-1 w-full"
          />
        </label>
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
          key={fieldKey("tagline")}
          className="block text-sm sm:col-span-2"
          label="Tagline"
          name="tagline"
          defaultValue={words.tagline}
          disabled={saving}
        />
        <DictatedField
          key={fieldKey("voice")}
          className="block text-sm sm:col-span-2"
          label="Voice / tone"
          name="voice"
          defaultValue={words.voice}
          multiline
          disabled={saving}
        />
        <DictatedField
          key={fieldKey("audience")}
          className="block text-sm sm:col-span-2"
          label="Audience"
          name="audience"
          defaultValue={words.audience}
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
          key={fieldKey("visualStyle")}
          className="block text-sm sm:col-span-2"
          label="Poster / visual style"
          name="visualStyle"
          defaultValue={words.visualStyle}
          multiline
          disabled={saving}
          placeholder="Materials, lighting, mood. Example: dark zinc, indigo glow, cinematic, lots of empty space."
        />
        <DictatedField
          key={fieldKey("doSay")}
          label="Words to lean on"
          name="doSay"
          defaultValue={words.doSay}
          multiline
          disabled={saving}
        />
        <DictatedField
          key={fieldKey("dontSay")}
          label="Words to avoid"
          name="dontSay"
          defaultValue={words.dontSay}
          multiline
          disabled={saving}
        />
        <DictatedField
          key={fieldKey("extra")}
          className="block text-sm sm:col-span-2"
          label="Other brand notes"
          name="extra"
          defaultValue={words.extra}
          multiline
          rows={4}
          disabled={saving}
          placeholder="Offer, proof points, cities, products, legal lines…"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={saving} className="hub-btn">
          {saving ? "Saving…" : "Save brand kit"}
        </button>
        <button type="button" onClick={saveFormWording} disabled={saving} className="hub-btn-secondary">
          Save wording only
        </button>
        <span className="text-xs text-zinc-500">Wording only keeps the saved colors, fonts, and logos.</span>
      </div>
      {status ? <p className="text-sm text-indigo-300">{status}</p> : null}
    </form>
    </div>
  );
}
