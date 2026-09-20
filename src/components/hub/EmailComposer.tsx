"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { type CompanyBrand, DIGISOL_BRAND } from "@/lib/branding";
import { buildEmailHtml } from "@/lib/emailHtml";
import {
  STARTER_TEMPLATES,
  mergeVarsFromBrand,
  renderMergeFields,
  starterKeyOf,
} from "@/lib/emailTemplates";
import { MergeFieldBar } from "@/components/hub/MergeFieldBar";

type Template = {
  id: string;
  name: string;
  subject: string | null;
  html: string | null;
  grapes_json: unknown;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  sent_at: string | null;
};

const AI_HINTS = [
  "Welcome a new lead after they booked a call",
  "Follow up on a proposal I sent last week",
  "Share this week's project progress",
  "Nudge a late invoice without sounding cold",
  "Monthly update with one useful tip",
];

function previewName(recipients: string) {
  const first = recipients
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .find((part) => part.includes("@"));
  if (!first) return "there";
  const local = first.split("@")[0] ?? "";
  const pretty = local.replace(/[._-]+/g, " ").trim();
  return pretty || "there";
}

export function EmailComposer({
  companyName,
  brand = DIGISOL_BRAND,
  initialTemplateId,
  campaigns,
}: {
  companyName: string;
  brand?: CompanyBrand;
  initialTemplateId?: string;
  campaigns: Campaign[];
}) {
  const router = useRouter();
  const logoInput = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const aiRef = useRef<HTMLTextAreaElement>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeId, setActiveId] = useState(initialTemplateId ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<"save" | "send" | "ai" | "logo" | "">("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [logoStamp, setLogoStamp] = useState(Date.now());
  const [logoSrc, setLogoSrc] = useState("/logo.jpg");
  const [focusField, setFocusField] = useState<"subject" | "body" | "ai">("body");
  const [dragOver, setDragOver] = useState(false);

  const active = templates.find((row) => row.id === activeId);

  async function loadTemplates(preferredId?: string) {
    const response = await fetch("/api/hub/templates");
    const json = (await response.json()) as { templates?: Template[]; error?: string };
    if (!response.ok) {
      setStatus(json.error || "Could not load templates");
      return;
    }
    const next = json.templates ?? [];
    setTemplates(next);
    const pick =
      (preferredId && next.find((row) => row.id === preferredId)?.id) ||
      (activeId && next.find((row) => row.id === activeId)?.id) ||
      next[0]?.id ||
      "";
    setActiveId(pick);
    const selected = next.find((row) => row.id === pick);
    if (selected) {
      setSubject(selected.subject ?? "");
      setBody(selected.html ?? "");
    }
  }

  useEffect(() => {
    void loadTemplates(initialTemplateId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTemplateId]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/hub/email-logo?t=${logoStamp}`)
      .then((response) => (response.ok ? response.blob() : Promise.reject()))
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          }),
      )
      .then((dataUrl) => {
        if (!cancelled) setLogoSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setLogoSrc("/logo.jpg");
      });
    return () => {
      cancelled = true;
    };
  }, [logoStamp]);

  function selectTemplate(template: Template) {
    setActiveId(template.id);
    setSubject(template.subject ?? "");
    setBody(template.html ?? "");
    setStatus("");
  }

  const preview = useMemo(() => {
    const vars = mergeVarsFromBrand(companyName, brand, previewName(recipients));
    return {
      subject: renderMergeFields(subject, vars, { logoAs: "company" }),
      html: buildEmailHtml(renderMergeFields(body, vars, { logoAs: "token" }), {
        logoSrc,
        companyName,
        tagline: brand.tagline,
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor,
        backgroundColor: brand.backgroundColor,
        fonts: brand.fonts,
      }),
    };
  }, [subject, body, recipients, companyName, logoSrc, brand]);

  function insertToken(token: string) {
    if (focusField === "subject") {
      insertAtCursor(subject, setSubject, subjectRef.current, token);
      return;
    }
    if (focusField === "ai") {
      insertAtCursor(aiPrompt, setAiPrompt, aiRef.current, token);
      return;
    }
    insertAtCursor(body, setBody, bodyRef.current, token);
  }

  function insertAtCursor(
    value: string,
    setValue: (next: string) => void,
    field: HTMLInputElement | HTMLTextAreaElement | null,
    token: string,
  ) {
    if (!field) {
      setValue(`${value}${value && !value.endsWith(" ") ? " " : ""}${token}`);
      return;
    }
    const start = field.selectionStart ?? value.length;
    const end = field.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
    setValue(next);
    requestAnimationFrame(() => {
      field.focus();
      const pos = start + token.length;
      field.setSelectionRange(pos, pos);
    });
  }

  async function save() {
    if (!active) return false;
    setBusy("save");
    const response = await fetch(`/api/hub/templates/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, html: body, name: active.name }),
    });
    const json = (await response.json()) as { error?: string };
    setBusy("");
    if (!response.ok) {
      setStatus(json.error || "Save failed");
      return false;
    }
    setTemplates((list) =>
      list.map((row) =>
        row.id === active.id ? { ...row, subject, html: body } : row,
      ),
    );
    setStatus("Saved");
    return true;
  }

  async function send() {
    if (!recipients.trim()) {
      setStatus("Add at least one recipient");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setStatus("Subject and body are required");
      return;
    }
    const saved = await save();
    if (!saved) return;
    setBusy("send");
    const response = await fetch("/api/hub/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: active?.id,
        subject,
        html: body,
        to: recipients,
        campaignName: active?.name || subject,
      }),
    });
    const json = (await response.json()) as {
      error?: string;
      sent?: number;
      failed?: number;
      from?: string;
      results?: { error?: string }[];
    };
    setBusy("");
    const via = json.from ? ` via ${json.from}` : "";
    const failReason =
      json.error || json.results?.find((row) => row.error)?.error || "Send failed";
    if (!response.ok) {
      setStatus(failReason);
      return;
    }
    if (json.failed) {
      setStatus(`Sent ${json.sent ?? 0} · failed ${json.failed}. ${failReason}`);
      return;
    }
    setStatus(`Sent ${json.sent ?? 0}${via}`);
    router.refresh();
  }

  async function runAi(mode: "generate" | "flare") {
    setBusy("ai");
    const response = await fetch("/api/hub/ai/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        prompt: aiPrompt,
        companyName,
        templateName: active?.name,
        subject,
        emailBody: body,
      }),
    });
    const json = (await response.json()) as {
      error?: string;
      subject?: string;
      body?: string;
    };
    setBusy("");
    if (!response.ok) {
      setStatus(json.error || "AI could not write this email");
      return;
    }
    if (json.subject) setSubject(json.subject);
    if (json.body) setBody(json.body);
    setStatus(mode === "flare" ? "Flare added — review before sending" : "Draft ready — review before sending");
  }

  async function onLogoFile(file: File | undefined) {
    if (!file) return;
    setBusy("logo");
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/hub/email-logo", { method: "POST", body: form });
    const json = (await response.json()) as { error?: string };
    setBusy("");
    if (!response.ok) {
      setStatus(json.error || "Could not save logo");
      return;
    }
    setLogoStamp(Date.now());
    setStatus("Logo saved on every template");
  }

  async function resetLogo() {
    setBusy("logo");
    const response = await fetch("/api/hub/email-logo", { method: "DELETE" });
    setBusy("");
    if (!response.ok) {
      setStatus("Could not reset logo");
      return;
    }
    setLogoStamp(Date.now());
    setStatus("Using the DigiSol site logo");
  }

  async function fillContacts() {
    const response = await fetch("/api/hub/contacts");
    const json = (await response.json()) as {
      contacts?: { email?: string; unsubscribed_at?: string | null }[];
    };
    const emails = (json.contacts ?? [])
      .filter((row) => row.email && !row.unsubscribed_at)
      .map((row) => row.email as string);
    if (emails.length === 0) {
      setStatus("No subscribed contacts in this company");
      return;
    }
    setRecipients(emails.join(", "));
  }

  async function addBlank() {
    const response = await fetch("/api/hub/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Custom",
        subject: "",
        html: `Hey {{name}},\n\n{{logo}}\n\n{{tagline}}\n\n{{company}}`,
      }),
    });
    const json = (await response.json()) as { id?: string; error?: string };
    if (!json.id) {
      setStatus(json.error || "Could not create template");
      return;
    }
    await loadTemplates(json.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Email</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Pick a template. The {companyName} logo, colors, tagline, and merge
          fields are already wired. Fill subject, recipients, and body — or let
          AI draft it locked to this company&apos;s brand kit.
        </p>
      </div>

      <section
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void onLogoFile(event.dataTransfer.files?.[0]);
        }}
        className={`grid gap-4 rounded-2xl border p-4 sm:grid-cols-[140px_1fr] sm:p-5 ${
          dragOver
            ? "border-indigo-400 bg-indigo-500/10"
            : "border-zinc-800 bg-zinc-900/40"
        }`}
      >
        <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-black p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/hub/email-logo?t=${logoStamp}`}
            alt={`${companyName} email logo`}
            className="h-16 w-auto max-w-full object-contain"
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-white">Official {companyName} logo</p>
          <p className="text-sm text-zinc-400">
            Drop a file here or choose one. This mark is used on every template,
            send, and AI prompt for this company.
          </p>
          <div className="mt-2 flex gap-2">
            {[brand.primaryColor, brand.secondaryColor, brand.accentColor, brand.backgroundColor].map(
              (color) => (
                <span
                  key={color}
                  className="h-5 w-5 rounded-full border border-white/20"
                  style={{ background: color }}
                  title={color}
                />
              ),
            )}
          </div>
          {brand.tagline ? (
            <p className="text-xs text-zinc-500">{brand.tagline}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="hub-btn"
              disabled={busy === "logo"}
              onClick={() => logoInput.current?.click()}
            >
              {busy === "logo" ? "Saving…" : "Upload logo"}
            </button>
            <button
              type="button"
              className="hub-btn-secondary"
              disabled={busy === "logo"}
              onClick={() => void resetLogo()}
            >
              Use site logo
            </button>
          </div>
          <input
            ref={logoInput}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={(event) => {
              void onLogoFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Example templates</h2>
          <button type="button" className="hub-btn-secondary" onClick={() => void addBlank()}>
            New blank
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => selectTemplate(template)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                template.id === activeId
                  ? "bg-indigo-600 text-white"
                  : "border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-indigo-500 hover:text-white"
              }`}
            >
              {template.name}
            </button>
          ))}
        </div>
        {active ? (
          <p className="text-sm text-zinc-400">
            {STARTER_TEMPLATES.find((row) => row.key === starterKeyOf(active.grapes_json))
              ?.blurb || "Custom template. Logo stays in the header."}
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
        <div>
          <p className="text-sm font-medium text-white">Brand fields</p>
          <p className="mt-1 text-xs text-zinc-500">
            Click a token to insert it into the subject, body, or AI brief. AI
            processes the same {companyName} logo and kit.
          </p>
          <div className="mt-2">
            <MergeFieldBar onInsert={insertToken} disabled={busy === "ai"} />
          </div>
        </div>
        <label className="block text-sm">
          Subject
          <input
            ref={subjectRef}
            value={subject}
            onFocus={() => setFocusField("subject")}
            onChange={(event) => setSubject(event.target.value)}
            className="hub-field"
            placeholder="{{name}}, you're in — let's build"
          />
        </label>
        <label className="block text-sm">
          Recipients
          <input
            value={recipients}
            onChange={(event) => setRecipients(event.target.value)}
            className="hub-field"
            placeholder="alex@acme.com, jordan@acme.com"
          />
          <button
            type="button"
            onClick={() => void fillContacts()}
            className="mt-2 text-xs text-indigo-300 hover:text-indigo-200"
          >
            Insert all company contacts
          </button>
        </label>
        <label className="block text-sm">
          Body
          <textarea
            ref={bodyRef}
            value={body}
            onFocus={() => setFocusField("body")}
            onChange={(event) => setBody(event.target.value)}
            rows={12}
            className="hub-field resize-y font-mono text-sm"
            placeholder="Hey {{name}},"
          />
        </label>

        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
          <p className="text-sm font-medium text-white">AI draft</p>
          <p className="mt-1 text-xs text-zinc-400">
            Locked to the {companyName} brand kit — voice, colors, tagline, and
            official logo. Generate a full email, or add flare to what you
            already wrote.
          </p>
          <textarea
            ref={aiRef}
            value={aiPrompt}
            onFocus={() => setFocusField("ai")}
            onChange={(event) => setAiPrompt(event.target.value)}
            rows={2}
            className="hub-field"
            placeholder="What should this email say?"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {AI_HINTS.map((hint) => (
              <button
                key={hint}
                type="button"
                className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-indigo-500 hover:text-white"
                onClick={() => setAiPrompt(hint)}
              >
                {hint}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="hub-btn"
              disabled={busy === "ai"}
              onClick={() => void runAi("generate")}
            >
              {busy === "ai" ? "Writing…" : "Generate email"}
            </button>
            <button
              type="button"
              className="hub-btn-secondary"
              disabled={busy === "ai"}
              onClick={() => void runAi("flare")}
            >
              Add flare
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="hub-btn-secondary"
            disabled={busy === "save"}
            onClick={() => void save()}
          >
            {busy === "save" ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="hub-btn"
            disabled={busy === "send"}
            onClick={() => void send()}
          >
            {busy === "send" ? "Sending…" : "Send"}
          </button>
        </div>
        <p className="text-xs text-zinc-500">
          Sends use RESEND_FROM on the server. Hub → Integrations shows the
          address without revealing the API key.
        </p>
        {status ? <p className="text-sm text-indigo-300">{status}</p> : null}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-white">Preview</h2>
        <p className="mt-1 text-sm text-zinc-400">Subject: {preview.subject || "—"}</p>
        <iframe
          title="Email preview"
          className="mt-3 h-[420px] w-full rounded-xl border border-zinc-800 bg-white"
          srcDoc={preview.html}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Recent campaigns</h2>
        <ul className="space-y-2 text-sm text-zinc-400">
          {campaigns.length === 0 ? (
            <li>No campaigns sent yet.</li>
          ) : (
            campaigns.map((campaign) => (
              <li key={campaign.id}>
                {campaign.name} · {campaign.status}
                {campaign.sent_at
                  ? ` · ${new Date(campaign.sent_at).toLocaleString()}`
                  : ""}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
