"use client";

import { DragEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LOGO_STYLES, type LogoStyle } from "@/lib/logoStyles";

const STYLE_LABELS: Record<LogoStyle, { label: string; hint: string }> = {
  wordmark: { label: "Wordmark", hint: "Name only" },
  lettermark: { label: "Lettermark", hint: "Initials" },
  "icon-wordmark": { label: "Icon + name", hint: "Lockup" },
  emblem: { label: "Emblem", hint: "Badge" },
};

export function BrandLogoKit({
  clientId,
  companyName,
  logoUrl,
  logoDescription,
  primaryColor,
}: {
  clientId: string;
  companyName: string;
  logoUrl: string;
  logoDescription: string;
  primaryColor: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(logoUrl);
  const [description, setDescription] = useState(logoDescription);
  const [brief, setBrief] = useState("");
  const [style, setStyle] = useState<LogoStyle>("icon-wordmark");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState<"upload" | "generate" | "clear" | "">("");
  const [status, setStatus] = useState("");

  async function uploadFile(file: File | undefined) {
    if (!file) return;
    setBusy("upload");
    setStatus("Saving logo…");
    const form = new FormData();
    form.set("file", file);
    form.set("clientId", clientId);
    const response = await fetch("/api/hub/brand-logo", { method: "POST", body: form });
    const json = (await response.json()) as {
      error?: string;
      url?: string;
      description?: string;
    };
    setBusy("");
    if (!response.ok) {
      setStatus(json.error || "Could not save logo");
      return;
    }
    setPreview(json.url || "");
    setDescription(json.description || "");
    setStatus("Logo saved. AI posters and emails will use this mark.");
    router.refresh();
  }

  async function generate() {
    setBusy("generate");
    setStatus("Generating a logo from this brand kit…");
    const response = await fetch("/api/hub/ai/logo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        style,
        prompt: brief,
      }),
    });
    const json = (await response.json()) as {
      error?: string;
      url?: string;
      description?: string;
    };
    setBusy("");
    if (!response.ok) {
      setStatus(json.error || "Could not generate a logo");
      return;
    }
    setPreview(json.url || "");
    setDescription(json.description || "");
    setStatus("Generated logo saved as this company’s official mark.");
    router.refresh();
  }

  async function clearLogo() {
    setBusy("clear");
    const response = await fetch("/api/hub/brand-logo", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    setBusy("");
    if (!response.ok) {
      setStatus("Could not remove logo");
      return;
    }
    setPreview("");
    setDescription("");
    setStatus("Logo removed. AI will stop inventing a mark for this company.");
    router.refresh();
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    void uploadFile(event.dataTransfer.files?.[0]);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-medium text-white">Company logo</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Upload the real mark or generate one. Either way it becomes the
          official {companyName} logo used in emails, posters, and every AI
          prompt for this company.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
        <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-black p-4">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={`${companyName} logo`}
              className="max-h-28 w-auto max-w-full object-contain"
            />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ background: primaryColor }}
            >
              {companyName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-xl border border-dashed p-4 text-sm transition ${
            dragOver
              ? "border-indigo-400 bg-indigo-500/10 text-white"
              : "border-zinc-700 text-zinc-400"
          }`}
        >
          <p className="font-medium text-zinc-200">Drop a logo here</p>
          <p className="mt-1">PNG, JPEG, or WebP. 8MB max.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="hub-btn"
              disabled={Boolean(busy)}
              onClick={() => inputRef.current?.click()}
            >
              {busy === "upload" ? "Saving…" : "Choose file"}
            </button>
            {preview ? (
              <button
                type="button"
                className="hub-btn-secondary"
                disabled={Boolean(busy)}
                onClick={() => void clearLogo()}
              >
                {busy === "clear" ? "Removing…" : "Remove logo"}
              </button>
            ) : null}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              void uploadFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="space-y-3 border-t border-zinc-800 pt-4">
        <p className="text-sm font-medium text-white">Generate with AI</p>
        <fieldset>
          <legend className="sr-only">Logo style</legend>
          <div className="grid gap-2 sm:grid-cols-4">
            {LOGO_STYLES.map((id) => (
              <label
                key={id}
                className={`cursor-pointer rounded-xl border px-3 py-2 text-sm ${
                  style === id
                    ? "border-indigo-500 bg-indigo-500/10 text-white"
                    : "border-zinc-800 text-zinc-400"
                }`}
              >
                <input
                  type="radio"
                  name="logo-style"
                  value={id}
                  checked={style === id}
                  onChange={() => setStyle(id)}
                  className="sr-only"
                />
                <span className="block font-medium">{STYLE_LABELS[id].label}</span>
                <span className="block text-xs opacity-80">{STYLE_LABELS[id].hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm">
          What the mark should feel like
          <textarea
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            rows={3}
            className="hub-field resize-y"
            placeholder="Clean wordmark with a small geometric mark. No slogan. Should still read at 24px."
          />
        </label>
        <button
          type="button"
          className="hub-btn"
          disabled={Boolean(busy)}
          onClick={() => void generate()}
        >
          {busy === "generate" ? "Generating…" : "Generate logo"}
        </button>
      </div>

      {description ? (
        <p className="text-xs leading-relaxed text-zinc-500">
          AI prompt note: {description}
        </p>
      ) : null}
      {status ? <p className="text-sm text-indigo-300">{status}</p> : null}
    </section>
  );
}
