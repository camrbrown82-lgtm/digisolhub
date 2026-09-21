"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Upload } from "lucide-react";

export function ContactImportExport() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");

  async function importFile(file: File | undefined | null) {
    if (!file) {
      setStatus("Choose a CSV file");
      return;
    }
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      setStatus(
        "Excel workbooks belong under Files. Save as CSV first, then drop it here.",
      );
      return;
    }
    if (!lower.endsWith(".csv") && !lower.endsWith(".tsv") && file.type && !file.type.includes("csv") && !file.type.includes("tsv")) {
      setStatus("Drop a .csv (or .tsv) contacts sheet.");
      return;
    }

    setBusy(true);
    setFileName(file.name);
    setStatus(`Importing ${file.name}…`);
    const form = new FormData();
    form.set("file", file);
    try {
      const response = await fetch("/api/hub/contacts/import", {
        method: "POST",
        body: form,
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
      const failed = result.failed?.length ?? 0;
      setStatus(
        `Created ${result.created ?? 0}, updated ${result.updated ?? 0}${
          failed ? `, ${failed} row${failed === 1 ? "" : "s"} skipped` : ""
        }.`,
      );
      if (inputRef.current) inputRef.current.value = "";
      setFileName("");
      router.refresh();
    } catch {
      setStatus("Import failed — check your connection and try again.");
    } finally {
      setBusy(false);
      setDragOver(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    await importFile(file);
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">Data sheet import / export</p>
          <p className="mt-1 text-xs text-zinc-500">
            CSV columns: name, email, company, domain, phone, service, tags, notes.
            Drag a sheet onto the drop zone or browse. Excel can be stored on Files
            as a data sheet.
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

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files?.[0];
            void importFile(file);
          }}
          className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition ${
            dragOver
              ? "border-indigo-400 bg-indigo-500/10"
              : "border-zinc-700 bg-zinc-950/40 hover:border-indigo-500/40"
          }`}
        >
          <span className="rounded-full bg-indigo-500/15 p-3 text-indigo-300">
            {busy ? (
              <Upload className="h-5 w-5 animate-pulse" aria-hidden="true" />
            ) : (
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            )}
          </span>
          <p className="mt-3 text-sm font-medium text-white">
            {dragOver ? "Drop CSV to import" : "Drag & drop contacts CSV here"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            .csv or .tsv · up to 500 rows per import
          </p>
          {fileName ? (
            <p className="mt-2 text-xs text-indigo-300">{fileName}</p>
          ) : null}
          <button
            type="button"
            disabled={busy}
            className="hub-btn-secondary mt-4"
            onClick={() => inputRef.current?.click()}
          >
            Browse files
          </button>
          <input
            ref={inputRef}
            name="file"
            type="file"
            accept=".csv,.tsv,text/csv,text/tab-separated-values"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importFile(file);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="hub-btn" disabled={busy}>
            {busy ? "Importing…" : "Import selected CSV"}
          </button>
        </div>
      </form>
      {status ? <p className="mt-3 text-sm text-zinc-300">{status}</p> : null}
    </div>
  );
}
