"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FILE_KIND_LABELS,
  inferFileKind,
  MAX_FILE_BYTES,
  type FileKind,
} from "@/lib/files";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function FileImporter() {
  const router = useRouter();
  const [kind, setKind] = useState<FileKind | "auto">("auto");
  const [status, setStatus] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const selected = Array.from(form.elements).find(
      (el): el is HTMLInputElement => el instanceof HTMLInputElement && el.name === "file",
    );
    const files = Array.from(selected?.files ?? []);
    if (files.length === 0) {
      setStatus("Choose at least one file");
      return;
    }

    setStatus("Importing…");
    const supabase = await createBrowserSupabase();
    const uploaded = [];
    const failed: string[] = [];

    for (const file of files.slice(0, 25)) {
      if (file.size > MAX_FILE_BYTES) {
        failed.push(`${file.name} is larger than 20MB`);
        continue;
      }
      const ext = file.name.split(".").pop() || "bin";
      const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("assets").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (uploadError) {
        failed.push(`${file.name}: ${uploadError.message}`);
        continue;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("assets").getPublicUrl(path);
      const response = await fetch("/api/hub/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: "assets",
          path,
          public_url: publicUrl,
          filename: file.name,
          mime_type: file.type,
          kind: kind === "auto" ? inferFileKind(file.name, file.type) : kind,
          byte_size: file.size,
        }),
      });
      const result = (await response.json()) as { error?: string; asset?: unknown };
      if (!response.ok) {
        failed.push(`${file.name}: ${result.error || "Could not save"}`);
        continue;
      }
      uploaded.push(result.asset);
    }

    form.reset();
    setStatus(
      failed.length
        ? `Imported ${uploaded.length}. ${failed.join(" ")}`
        : `Imported ${uploaded.length} file${uploaded.length === 1 ? "" : "s"}.`,
    );
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          File type
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as FileKind | "auto")}
            className="hub-field"
          >
            <option value="auto">Detect automatically</option>
            {(Object.keys(FILE_KIND_LABELS) as FileKind[]).map((value) => (
              <option key={value} value={value}>
                {FILE_KIND_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-[16rem] flex-1 text-sm">
          Import files
          <input
            name="file"
            type="file"
            required
            multiple
            className="hub-field"
            accept="image/*,.pdf,.csv,.tsv,.xls,.xlsx,.ods,.doc,.docx,.ppt,.pptx,.txt,.zip"
          />
        </label>
        <button type="submit" className="hub-btn">
          Import
        </button>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Images, PDFs, spreadsheets, and other related files. Select a company under
        Working on first so they stay with that business. Max 20MB each.
      </p>
      {status ? <p className="mt-2 text-sm text-zinc-300">{status}</p> : null}
    </form>
  );
}
