"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Play, RefreshCw } from "lucide-react";

type CampaignPost = {
  id: string;
  variant: string;
  label: string;
  scheduledAt: string;
  status: string;
  body: string;
  ctaLink: string;
};

type CampaignPayload = {
  campaign?: {
    id: string;
    name: string;
    status: string;
    created_at: string;
  } | null;
  posts?: CampaignPost[];
  stats?: { published: number; queued: number; failed: number; total: number };
  recentEvents?: Array<{ event_type: string; success: boolean; created_at: string }>;
  videoUrl?: string;
  mediaPageUrl?: string;
};

function formatWhen(iso: string) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Edmonton",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AbAuditVideoCampaignPanel() {
  const [data, setData] = useState<CampaignPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/hub/campaigns/ab-audit-video");
    const json = (await res.json()) as {
      ok?: boolean;
      campaign?: CampaignPayload | null;
      error?: string;
    };
    if (!res.ok) {
      setMessage(json.error || "Could not load campaign");
      return;
    }
    setData(json.campaign ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startCampaign() {
    setBusy(true);
    setMessage("Initializing 7-day / 5-variant campaign…");
    const res = await fetch("/api/hub/campaigns/ab-audit-video", {
      method: "POST",
    });
    const json = (await res.json()) as {
      ok?: boolean;
      note?: string;
      alreadyRunning?: boolean;
      error?: string;
    };
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error || "Start failed");
      return;
    }
    setMessage(
      json.alreadyRunning
        ? "Campaign already running — schedule loaded."
        : json.note || "Campaign started.",
    );
    await load();
  }

  async function copyCaption(post: CampaignPost) {
    const pack = `${post.body}\n\nVideo: ${data?.videoUrl || ""}\nMedia page: ${data?.mediaPageUrl || ""}`;
    await navigator.clipboard.writeText(pack);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function markPublished(postId: string) {
    setBusy(true);
    const res = await fetch("/api/hub/campaigns/ab-audit-video", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, action: "mark_published" }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setMessage(json.error || "Could not mark published");
      return;
    }
    setMessage("Marked as posted — logged to analytics.");
    await load();
  }

  const posts = data?.posts ?? [];
  const stats = data?.stats;

  return (
    <section className="space-y-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Alberta FB Groups — Audit video (7-day)
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">
            Five staggered captions + the Media page website-audit video. Target
            Alberta startup / SMB Facebook Groups. CTA lands on wwwdigisol.com
            (UTM-tagged) so Kaylev can run the free audit when they share a URL.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:border-zinc-500"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void startCampaign()}
            className="hub-btn inline-flex items-center gap-1.5 text-xs"
          >
            <Play className="h-3.5 w-3.5" />
            {posts.length ? "Re-sync / open campaign" : "Start campaign"}
          </button>
        </div>
      </div>

      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
        Facebook Groups cannot be auto-posted by DigiSol&apos;s Meta Page API.
        On each scheduled day: copy the caption, attach{" "}
        <a
          href={data?.videoUrl || "/media/digisol-website-audit.mp4"}
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          the audit video
        </a>
        , post into your Groups, then click <strong>Mark posted</strong> so we
        can monitor execution here.
      </p>

      {stats ? (
        <div className="grid gap-2 sm:grid-cols-4">
          <Stat label="Variants" value={stats.total} />
          <Stat label="Posted" value={stats.published} />
          <Stat label="Still queued" value={stats.queued} />
          <Stat label="Failed" value={stats.failed} />
        </div>
      ) : null}

      {message ? <p className="text-sm text-zinc-400">{message}</p> : null}

      {posts.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Not started yet. Click <strong>Start campaign</strong> to write the
          schedule into Supabase and unlock monitoring.
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li
              key={post.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">
                    Variant {post.variant} · {post.label}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Schedule: {formatWhen(post.scheduledAt)} MT · Status:{" "}
                    <span className="text-zinc-300">{post.status}</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyCaption(post)}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-indigo-400"
                  >
                    {copiedId === post.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copy caption + links
                  </button>
                  {post.status !== "published" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void markPublished(post.id)}
                      className="rounded-lg bg-emerald-600/80 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Mark posted
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-zinc-400">
                {post.body}
              </p>
              <p className="mt-2 truncate text-[11px] text-indigo-300">
                CTA: {post.ctaLink}
              </p>
            </li>
          ))}
        </ul>
      )}

      {data?.recentEvents && data.recentEvents.length > 0 ? (
        <div>
          <h3 className="text-sm font-medium text-zinc-300">
            Recent related analytics
          </h3>
          <ul className="mt-2 space-y-1 text-xs text-zinc-500">
            {data.recentEvents.slice(0, 8).map((ev, i) => (
              <li key={`${ev.created_at}-${i}`}>
                {new Date(ev.created_at).toLocaleString("en-CA")} ·{" "}
                {ev.event_type}
                {ev.success ? "" : " (failed)"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
