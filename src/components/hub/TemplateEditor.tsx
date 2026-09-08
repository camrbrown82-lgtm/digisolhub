"use client";

import dynamic from "next/dynamic";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const EmailEditor = dynamic(
  () => import("@/components/hub/EmailEditor").then((mod) => mod.EmailEditor),
  { ssr: false, loading: () => <p className="text-sm text-zinc-500">Loading editor…</p> },
);

type Template = {
  id: string;
  name: string;
  subject: string | null;
  html: string | null;
  grapes_json: unknown;
};

export function TemplateEditor({ template }: { template: Template }) {
  const router = useRouter();
  const apiRef = useRef<{ getHtml: () => string; getProject: () => unknown } | null>(
    null,
  );
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject ?? "");
  const [status, setStatus] = useState("");
  const [segment, setSegment] = useState<"all" | "tag" | "service">("all");
  const [tag, setTag] = useState("");
  const [service, setService] = useState("");

  async function save() {
    const html = apiRef.current?.getHtml() ?? template.html ?? "";
    const grapes_json = apiRef.current?.getProject() ?? template.grapes_json;
    const response = await fetch(`/api/hub/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject, html, grapes_json }),
    });
    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setStatus(result.error || "Save failed");
      return false;
    }
    setStatus("Saved");
    router.refresh();
    return true;
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    await save();
  }

  async function send() {
    const saved = await save();
    if (!saved) return;
    const response = await fetch("/api/hub/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: template.id,
        campaignName: name,
        segment,
        tag: tag || undefined,
        service: service || undefined,
      }),
    });
    const result = (await response.json()) as {
      error?: string;
      sent?: number;
      failed?: number;
    };
    if (!response.ok) {
      setStatus(result.error || "Send failed");
      return;
    }
    setStatus(`Sent ${result.sent ?? 0} · failed ${result.failed ?? 0}`);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Template name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="hub-field"
          />
        </label>
        <label className="text-sm">
          Subject
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="hub-field"
          />
        </label>
        <div className="sm:col-span-2 flex flex-wrap gap-2">
          <button type="submit" className="hub-btn">
            Save template
          </button>
        </div>
      </form>
      <EmailEditor
        initialHtml={template.html}
        initialProject={template.grapes_json}
        onReady={(api) => {
          apiRef.current = api;
        }}
      />
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-white">Send via Resend</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Campaigns include an unsubscribe link and physical address footer.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Segment
            <select
              value={segment}
              onChange={(event) =>
                setSegment(event.target.value as "all" | "tag" | "service")
              }
              className="hub-field"
            >
              <option value="all">All subscribed contacts</option>
              <option value="tag">Tag</option>
              <option value="service">Service</option>
            </select>
          </label>
          {segment === "tag" ? (
            <label className="text-sm">
              Tag
              <input
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                className="hub-field"
              />
            </label>
          ) : null}
          {segment === "service" ? (
            <label className="text-sm">
              Service
              <input
                value={service}
                onChange={(event) => setService(event.target.value)}
                className="hub-field"
              />
            </label>
          ) : null}
        </div>
        <button type="button" onClick={send} className="hub-btn mt-4">
          Send campaign
        </button>
        {status ? <p className="mt-3 text-sm text-indigo-300">{status}</p> : null}
      </div>
    </div>
  );
}
