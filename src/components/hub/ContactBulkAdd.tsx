"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toCsv } from "@/lib/csv";

const COLUMNS = ["name", "email", "company", "phone", "tags"];

function looksLikePhone(value: string) {
  return /^[+()\d\s.-]{7,}$/.test(value) && (value.match(/\d/g)?.length ?? 0) >= 7;
}

/** One contact per line: any order of name, email, company, phone. The email is required. */
function parseLines(text: string, tags: string) {
  const rows: Record<string, string>[] = [];
  const skipped: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line
      .split(/[,\t;|]/)
      .map((part) => part.trim())
      .filter(Boolean);
    const email = parts.find((part) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(part.replace(/^<|>$/g, "")));
    if (!email) {
      skipped.push(line);
      continue;
    }
    const rest = parts.filter((part) => part !== email);
    const phone = rest.find(looksLikePhone) || "";
    const words = rest.filter((part) => part !== phone);
    rows.push({
      email: email.replace(/^<|>$/g, "").toLowerCase(),
      name: words[0] || "",
      company: words[1] || "",
      phone,
      tags,
    });
  }
  return { rows, skipped };
}

export function ContactBulkAdd() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const preview = parseLines(text, tags.trim());

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview.rows.length) {
      setStatus("Add at least one line with an email address.");
      return;
    }
    if (preview.rows.length > 500) {
      setStatus("Add up to 500 contacts at a time.");
      return;
    }
    setBusy(true);
    setStatus(`Adding ${preview.rows.length} contact${preview.rows.length === 1 ? "" : "s"}…`);
    const form = new FormData();
    form.set("file", new File([toCsv(preview.rows, COLUMNS)], "pasted-contacts.csv", { type: "text/csv" }));
    try {
      const response = await fetch("/api/hub/contacts/import", { method: "POST", body: form });
      const result = (await response.json()) as {
        error?: string;
        created?: number;
        updated?: number;
        skippedUnsubscribed?: number;
        failed?: { email: string; error: string }[];
      };
      if (!response.ok) {
        setStatus(result.error || "Could not add those contacts.");
        return;
      }
      const failed = result.failed ?? [];
      const unsubscribed = result.skippedUnsubscribed ?? 0;
      setStatus(
        [
          `Added ${result.created ?? 0}, updated ${result.updated ?? 0}.`,
          preview.skipped.length
            ? `${preview.skipped.length} line${preview.skipped.length === 1 ? " had" : "s had"} no email and ${preview.skipped.length === 1 ? "was" : "were"} skipped.`
            : "",
          unsubscribed ? `${unsubscribed} left out because they unsubscribed.` : "",
          failed.length ? `${failed.length} not saved: ${failed.slice(0, 3).map((row) => `${row.email} (${row.error})`).join("; ")}` : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      if (!failed.length) setText("");
      router.refresh();
    } catch {
      setStatus("Could not add those contacts. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-sm font-medium text-white">Bulk add contacts</p>
      <p className="mt-1 text-xs text-zinc-500">
        Paste one contact per line: name, email, company, phone. Only the email is required, and the order
        doesn&apos;t matter. They are added to the company you&apos;re working on.
      </p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={6}
        className="hub-field mt-3 resize-y font-mono text-xs"
        placeholder={"Jane Smith, jane@acme.com, Acme Co, 403-555-0100\nbob@roofpros.ca\nSam Lee, sam@example.com"}
      />
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block text-xs text-zinc-400">
          Tags for all (optional)
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            className="hub-field mt-1 w-56 text-sm"
            placeholder="e.g. trade-show; calgary"
          />
        </label>
        <button type="submit" className="hub-btn" disabled={busy || !preview.rows.length}>
          {busy
            ? "Adding…"
            : preview.rows.length
              ? `Add ${preview.rows.length} contact${preview.rows.length === 1 ? "" : "s"}`
              : "Add contacts"}
        </button>
        {preview.skipped.length && !busy ? (
          <span className="text-xs text-amber-200/80">
            {preview.skipped.length} line{preview.skipped.length === 1 ? "" : "s"} without an email will be skipped.
          </span>
        ) : null}
      </div>
      {status ? <p className="mt-3 text-sm text-zinc-300">{status}</p> : null}
    </form>
  );
}
