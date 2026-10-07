"use client";

import { inferFileKind, MAX_FILE_BYTES, MAX_FILE_MB, type FileKind } from "@/lib/files";
import { createBrowserSupabase } from "@/lib/supabase/client";

export type UploadedHubFile = {
  url: string;
  label: string;
  kind: FileKind;
  filename: string;
};

/** Upload straight to workspace storage, then register the file. Skips the app server so large videos fit. */
export async function uploadHubFile(file: File, kind: FileKind | "auto" = "auto"): Promise<UploadedHubFile> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} is larger than ${MAX_FILE_MB}MB`);
  }
  const supabase = await createBrowserSupabase();
  const ext = file.name.split(".").pop() || "bin";
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("assets").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("assets").getPublicUrl(path);
  const resolved = kind === "auto" ? inferFileKind(file.name, file.type) : kind;
  const response = await fetch("/api/hub/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket: "assets",
      path,
      public_url: publicUrl,
      filename: file.name,
      mime_type: file.type,
      kind: resolved,
      byte_size: file.size,
    }),
  });
  const result = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(result.error || "Could not save the file.");
  return { url: publicUrl, label: file.name, kind: resolved, filename: file.name };
}
