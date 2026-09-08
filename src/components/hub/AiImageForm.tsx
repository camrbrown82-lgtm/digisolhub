"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AiImageForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("");
  const [url, setUrl] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("Generating…");
    setUrl("");
    const response = await fetch("/api/hub/ai/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const result = (await response.json()) as {
      error?: string;
      asset?: { public_url?: string };
    };
    if (!response.ok) {
      setStatus(result.error || "Generation failed");
      return;
    }
    setUrl(result.asset?.public_url ?? "");
    setStatus("Saved to ai-posters");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        Prompt
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          required
          rows={4}
          className="hub-field resize-y"
          placeholder="DigiSol campaign poster, dark zinc background, indigo glow, Alberta growth studio…"
        />
      </label>
      <button type="submit" className="hub-btn">
        Generate image
      </button>
      {status ? <p className="text-sm text-zinc-400">{status}</p> : null}
      {url ? (
        <img src={url} alt="Generated poster" className="max-w-lg rounded-xl border border-zinc-800" />
      ) : null}
    </form>
  );
}
