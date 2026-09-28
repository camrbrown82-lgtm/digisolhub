"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Swords } from "lucide-react";

type Props = {
  companyName: string;
  defaults: {
    url: string;
    industry: string;
    location: string;
    competitorUrls: string[];
  };
  activeRunId?: string | null;
  activeStage?: string | null;
};

export function CompetitiveRunForm({ companyName, defaults, activeRunId, activeStage }: Props) {
  const router = useRouter();
  const [url, setUrl] = useState(defaults.url);
  const [industry, setIndustry] = useState(defaults.industry);
  const [location, setLocation] = useState(defaults.location);
  const [competitors, setCompetitors] = useState(defaults.competitorUrls.join("\n"));
  const [runId, setRunId] = useState<string | null>(activeRunId ?? null);
  const [stage, setStage] = useState<string | null>(activeStage ?? null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    const startedAt = Date.now();
    const tick = async () => {
      try {
        const res = await fetch(`/api/hub/competitive?id=${runId}`, { cache: "no-store" });
        const json = (await res.json()) as { status?: string; stage?: string | null; error?: string | null };
        if (cancelled) return;
        if (json.status === "completed") {
          setRunId(null);
          setStage(null);
          router.push(`/hub/competitive?id=${runId}`);
          router.refresh();
          return;
        }
        if (json.status === "failed") {
          setRunId(null);
          setStage(null);
          setError(json.error || "The analysis failed. Try again.");
          router.refresh();
          return;
        }
        if (json.status === "queued" && Date.now() - startedAt > 90_000) {
          setStage("Still waiting for the background worker to pick this up (check Inngest)");
          return;
        }
        setStage(json.stage || "Working");
      } catch {
        /* keep polling */
      }
    };
    void tick();
    const timer = setInterval(tick, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [runId, router]);

  async function start() {
    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/hub/competitive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          industry,
          location,
          competitorUrls: competitors.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean),
        }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !json.id) {
        setError(json.error || "Could not start the analysis.");
        return;
      }
      setStage("Queued");
      setRunId(json.id);
    } catch {
      setError("Network error — try again.");
    } finally {
      setStarting(false);
    }
  }

  const busy = starting || Boolean(runId);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Run a competitive analysis</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Kaylev finds {companyName}&apos;s top local competitors (or uses the ones you list),
            audits every website, checks Google reviews, listings and social presence, then
            scores each area and writes a prioritized action plan. Takes 2 to 4 minutes.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-xs text-zinc-400">
          Website
          <input
            name="website"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="hub-field mt-1 w-full text-sm"
            disabled={busy}
          />
        </label>
        <label className="text-xs text-zinc-400">
          Industry <span className="text-zinc-600">(blank = Kaylev infers it)</span>
          <input
            name="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g. residential HVAC"
            className="hub-field mt-1 w-full text-sm"
            disabled={busy}
          />
        </label>
        <label className="text-xs text-zinc-400">
          Service area <span className="text-zinc-600">(blank = inferred)</span>
          <input
            name="serviceArea"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Airdrie and Calgary, AB"
            className="hub-field mt-1 w-full text-sm"
            disabled={busy}
          />
        </label>
      </div>
      <label className="mt-3 block text-xs text-zinc-400">
        Competitor websites <span className="text-zinc-600">(optional, one per line, up to 5 — leave blank and Kaylev finds them)</span>
        <textarea
          name="competitorUrls"
          value={competitors}
          onChange={(e) => setCompetitors(e.target.value)}
          rows={3}
          placeholder={"https://competitor-one.ca\nhttps://competitor-two.com"}
          className="hub-field mt-1 w-full text-sm"
          disabled={busy}
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void start()}
          disabled={busy}
          className="hub-btn inline-flex items-center gap-2 text-sm"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
          {busy ? "Kaylev is working…" : "Run with Kaylev"}
        </button>
        {runId && stage ? <span className="text-sm text-sky-200">{stage}…</span> : null}
        {error ? <span className="text-sm text-rose-300">{error}</span> : null}
      </div>
    </div>
  );
}
