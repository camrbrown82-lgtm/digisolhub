"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ContactImportExport() {
  const router = useRouter();
  const [status, setStatus] = useState("");

  async function onImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("Importing sheet…");
    const response = await fetch("/api/hub/contacts/import", {
      method: "POST",
      body: new FormData(form),
    });
    const result = (await response.json()) as {
      error?: string;
      created?: number;
      updated?: number;
      failed?: { email: string; error: string }[];
    };
    if (!response.ok) {
      setStatus(result.error || "Import failed");
      return;
    }
    form.reset();
    const failed = result.failed?.length ?? 0;
    setStatus(
      `Created ${result.created ?? 0}, updated ${result.updated ?? 0}${
        failed ? `, ${failed} row${failed === 1 ? "" : "s"} skipped` : ""
      }.`,
    );
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">Data sheet import / export</p>
          <p className="mt-1 text-xs text-zinc-500">
            CSV columns: name, email, company, domain, phone, service, tags, notes.
            Excel workbooks can be stored on Files as a data sheet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/api/hub/contacts/export?template=1" className="hub-btn-secondary">
            Template
          </a>
          <a href="/api/hub/contacts/export" className="hub-btn-secondary">
            Export CSV
          </a>
        </div>
      </div>
      <form onSubmit={onImport} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[16rem] flex-1 text-sm">
          Import contacts CSV
          <input name="file" type="file" required accept=".csv,.tsv,text/csv" className="hub-field" />
        </label>
        <button type="submit" className="hub-btn">
          Import
        </button>
      </form>
      {status ? <p className="mt-3 text-sm text-zinc-300">{status}</p> : null}
    </div>
  );
}
