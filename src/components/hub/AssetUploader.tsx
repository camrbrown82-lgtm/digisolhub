"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AssetUploader() {
  const router = useRouter();
  const [bucket, setBucket] = useState("assets");
  const [status, setStatus] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("bucket", bucket);
    setStatus("Uploading…");
    const response = await fetch("/api/hub/assets", {
      method: "POST",
      body: data,
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(result.error || "Upload failed");
      return;
    }
    form.reset();
    setStatus("Uploaded");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        Bucket
        <select
          value={bucket}
          onChange={(event) => setBucket(event.target.value)}
          className="hub-field"
        >
          <option value="assets">assets</option>
          <option value="email-images">email-images</option>
          <option value="ai-posters">ai-posters</option>
        </select>
      </label>
      <label className="text-sm">
        File
        <input name="file" type="file" required className="hub-field" />
      </label>
      <button type="submit" className="hub-btn">
        Upload
      </button>
      {status ? <p className="text-sm text-zinc-400">{status}</p> : null}
    </form>
  );
}
