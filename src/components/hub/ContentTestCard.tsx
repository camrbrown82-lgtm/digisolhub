"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Loader2, QrCode, Send, Sparkles, Trash2, Trophy } from "lucide-react";
import type { LoadedContentTest } from "@/lib/contentTestData";
import {
  channelInfo,
  trackingUrl,
  type ChannelMetrics,
  type ChannelResult,
  type TestVariant,
  type VariantMetrics,
} from "@/lib/contentTests";

const MANUAL_FIELDS: { key: keyof ChannelMetrics; label: string }[] = [
  { key: "impressions", label: "Impressions" },
  { key: "clicks", label: "Clicks" },
  { key: "engagements", label: "Likes/comments/shares" },
  { key: "spend", label: "Spend ($)" },
];

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500"
    >
      {done ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
      {done ? "Copied" : label}
    </button>
  );
}

function statLine(row: Omit<ChannelResult, "channel">) {
  const parts = [
    `${row.sessions} visits`,
    `${row.engaged} engaged`,
    `${row.keyEvents} conversions`,
    `${row.leads} leads`,
  ];
  if (row.impressions) parts.push(`${row.impressions} impressions`);
  if (row.clicks) parts.push(`${row.clicks} clicks`);
  if (row.engagements) parts.push(`${row.engagements} engagements`);
  if (row.spend) parts.push(`$${row.spend} spend`);
  return parts.join(" · ");
}

export function ContentTestCard({
  item,
  connected,
  gaTracked,
}: {
  item: LoadedContentTest;
  connected: string[];
  gaTracked: boolean;
}) {
  const router = useRouter();
  const { test } = item;
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState("");
  const [draft, setDraft] = useState<ChannelMetrics>({});
  const [qr, setQr] = useState<Record<string, string>>({});

  async function call(key: string, input: RequestInfo, init: RequestInit) {
    setBusy(key);
    setError("");
    try {
      const response = await fetch(input, init);
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Something went wrong.");
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      return false;
    } finally {
      setBusy("");
    }
  }

  const patch = (key: string, body: Record<string, unknown>) =>
    call(key, "/api/hub/content-tests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: test.id, ...body }),
    });

  async function publish(variant: TestVariant, channel: string) {
    const label = channelInfo(channel)?.label || channel;
    if (!window.confirm(`Publish variant ${variant} to ${label} now? It goes live on the connected account.`)) return;
    await call(`publish:${variant}:${channel}`, "/api/hub/content-tests/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId: test.id, variant, channel, confirm: true }),
    });
  }

  async function saveMetrics(variant: TestVariant, channel: string) {
    const current = (item.variants.find((v) => v.variant === variant)?.metrics ?? {}) as VariantMetrics;
    const ok = await patch(`metrics:${variant}:${channel}`, {
      variants: [{ variant, metrics: { ...current, [channel]: draft } }],
    });
    if (ok) setEditing("");
  }

  async function makeQr(key: string, url: string) {
    const QRCode = await import("qrcode");
    const dataUrl = await QRCode.toDataURL(url, { width: 600, margin: 2 });
    setQr((current) => ({ ...current, [key]: dataUrl }));
  }

  async function analyze() {
    await call("analyze", "/api/hub/content-tests/kaylev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "analyze", testId: test.id }),
    });
  }

  async function remove() {
    if (!window.confirm(`Delete "${test.name}"? Tracking links keep working but results here are removed.`)) return;
    await call("delete", `/api/hub/content-tests?id=${test.id}`, { method: "DELETE" });
  }

  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white">{test.name}</h3>
          <p className="mt-1 text-xs text-zinc-500">
            {test.status === "completed" ? "Completed" : test.status === "draft" ? "Draft" : "Live"} · started{" "}
            {new Date(test.created_at).toLocaleDateString("en-CA")} · campaign tag{" "}
            <code className="text-zinc-400">{test.slug}</code>
          </p>
          <a
            href={test.landing_url}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-indigo-300 hover:text-indigo-200"
          >
            {test.landing_url}
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
          </a>
          {test.hypothesis ? <p className="mt-2 text-sm text-zinc-400">{test.hypothesis}</p> : null}
        </div>
        <p
          className={`rounded-full px-3 py-1 text-xs ${
            test.winner_variant
              ? "bg-emerald-500/15 text-emerald-200"
              : item.leader.leader
                ? "bg-indigo-500/15 text-indigo-200"
                : "bg-zinc-800 text-zinc-400"
          }`}
        >
          {test.winner_variant ? `Winner: variant ${test.winner_variant}` : item.leader.note}
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {item.variants.map((variant) => {
          const result = item.results.find((r) => r.variant === variant.variant);
          const mime = variant.asset?.mime_type || "";
          return (
            <div
              key={variant.id}
              className={`space-y-3 rounded-xl border p-4 ${
                test.winner_variant === variant.variant
                  ? "border-emerald-400/40 bg-emerald-500/5"
                  : "border-zinc-800 bg-zinc-950/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-white">
                  <span className="mr-2 rounded-md bg-fuchsia-500/25 px-2 py-0.5 text-xs text-fuchsia-100">
                    {variant.variant}
                  </span>
                  {variant.label}
                </p>
                {test.winner_variant === variant.variant ? (
                  <Trophy className="h-4 w-4 text-emerald-300" aria-label="Winner" />
                ) : null}
              </div>

              {variant.asset?.public_url && mime.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={variant.asset.public_url}
                  alt={variant.asset.filename || `Variant ${variant.variant} visual`}
                  className="max-h-48 rounded-lg border border-zinc-800 object-contain"
                />
              ) : variant.asset?.public_url && mime.startsWith("video/") ? (
                <video src={variant.asset.public_url} controls className="max-h-48 rounded-lg" />
              ) : !variant.asset && variant.media_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={variant.media_url}
                  alt="Newsletter preview card"
                  className="max-h-48 rounded-lg border border-zinc-800 object-contain"
                />
              ) : variant.asset?.public_url ? (
                <a
                  href={variant.asset.public_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-indigo-300 hover:text-indigo-200"
                >
                  {variant.asset.filename || "Open file"}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              ) : null}
              {variant.templateName ? (
                <p className="text-xs text-zinc-500">Email template: {variant.templateName}</p>
              ) : null}

              {variant.body ? (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                  <p className="whitespace-pre-wrap text-sm text-zinc-300">{variant.body}</p>
                  <div className="mt-2">
                    <CopyButton value={variant.body} label="Copy post" />
                  </div>
                </div>
              ) : null}

              {result ? (
                <p className="text-sm text-zinc-200">
                  <span className="text-zinc-500">Total:</span> {statLine(result.totals)}
                </p>
              ) : null}

              <ul className="space-y-2">
                {test.channels.map((channel) => {
                  const info = channelInfo(channel);
                  if (!info) return null;
                  const link = trackingUrl(test.landing_url, test.slug, channel, variant.variant);
                  const row = result?.byChannel.find((c) => c.channel === channel);
                  const key = `${variant.variant}:${channel}`;
                  const canPublish = Boolean(info.publish && connected.includes(info.publish));
                  return (
                    <li key={channel} className="rounded-lg border border-zinc-800/80 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-200">{info.label}</p>
                        <div className="flex flex-wrap gap-1.5">
                          <CopyButton value={link} label="Copy link" />
                          {channel === "print" ? (
                            <button
                              type="button"
                              onClick={() => makeQr(key, link)}
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500"
                            >
                              <QrCode className="h-3 w-3" aria-hidden="true" />
                              QR code
                            </button>
                          ) : null}
                          {canPublish ? (
                            <button
                              type="button"
                              onClick={() => publish(variant.variant, channel)}
                              disabled={Boolean(busy)}
                              className="inline-flex items-center gap-1 rounded-md border border-fuchsia-400/40 bg-fuchsia-500/15 px-2 py-1 text-xs text-fuchsia-100 hover:bg-fuchsia-500/25"
                            >
                              {busy === `publish:${key}` ? (
                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                              ) : (
                                <Send className="h-3 w-3" aria-hidden="true" />
                              )}
                              Publish
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(editing === key ? "" : key);
                              setDraft(
                                ((variant.metrics ?? {}) as VariantMetrics)[
                                  channel as keyof VariantMetrics
                                ] ?? {},
                              );
                            }}
                            className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500"
                          >
                            Enter numbers
                          </button>
                        </div>
                      </div>
                      {row ? <p className="mt-1 text-xs text-zinc-500">{statLine(row)}</p> : null}
                      {info.publish && !canPublish ? (
                        <p className="mt-1 text-xs text-zinc-600">
                          Not connected for Hub publishing. Copy the post and link and post it yourself; visits
                          still track.
                        </p>
                      ) : null}
                      {qr[key] ? (
                        <div className="mt-2 flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={qr[key]} alt={`QR code for variant ${variant.variant}`} className="h-24 w-24 rounded bg-white p-1" />
                          <a
                            href={qr[key]}
                            download={`${test.slug}-${variant.variant.toLowerCase()}-qr.png`}
                            className="text-xs text-indigo-300 hover:text-indigo-200"
                          >
                            Download for the poster
                          </a>
                        </div>
                      ) : null}
                      {editing === key ? (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {MANUAL_FIELDS.map((field) => (
                            <label key={field.key} className="text-xs text-zinc-400">
                              {field.label}
                              <input
                                type="number"
                                min={0}
                                step={field.key === "spend" ? "0.01" : "1"}
                                value={draft[field.key] ?? ""}
                                onChange={(e) =>
                                  setDraft((d) => ({
                                    ...d,
                                    [field.key]: e.target.value === "" ? undefined : Number(e.target.value),
                                  }))
                                }
                                className="hub-field mt-1"
                              />
                            </label>
                          ))}
                          <button
                            type="button"
                            onClick={() => saveMetrics(variant.variant, channel)}
                            disabled={Boolean(busy)}
                            className="hub-btn col-span-2 inline-flex items-center justify-center gap-2 text-xs"
                          >
                            {busy === `metrics:${key}` ? (
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                            ) : null}
                            Save numbers
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {result?.posts.length ? (
                <ul className="space-y-1 text-xs text-zinc-500">
                  {result.posts.map((post) => (
                    <li key={post.id}>
                      {post.channel} post {post.status}
                      {post.published_at ? ` ${new Date(post.published_at).toLocaleString("en-CA")}` : ""}
                      {post.external_url ? (
                        <>
                          {" · "}
                          <a
                            href={post.external_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-300 hover:text-indigo-200"
                          >
                            view
                          </a>
                        </>
                      ) : null}
                      {post.error_message ? <span className="text-rose-300"> · {post.error_message}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>

      {!gaTracked ? (
        <p className="mt-3 text-xs text-zinc-500">
          Website visits come from Google Analytics on DigiSol&apos;s own site. For this company, leads from the
          tracking links and the numbers you enter decide the winner.
        </p>
      ) : null}

      {test.kaylev?.analysis ? (
        <div className="mt-4 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-4 text-sm text-zinc-300">
          <p className="flex items-center gap-2 font-medium text-white">
            <Sparkles className="h-4 w-4 text-fuchsia-300" aria-hidden="true" />
            Kaylev: {test.kaylev.recommendation}
          </p>
          <p className="mt-2 whitespace-pre-wrap">{test.kaylev.analysis}</p>
          {test.kaylev.actions?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-400">
              {test.kaylev.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          ) : null}
          {test.kaylev.nextTest ? (
            <p className="mt-2 text-zinc-400">
              <span className="text-zinc-500">Next test:</span> {test.kaylev.nextTest}
            </p>
          ) : null}
          {test.kaylev.analyzedAt ? (
            <p className="mt-2 text-xs text-zinc-600">
              Read {new Date(test.kaylev.analyzedAt).toLocaleString("en-CA")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={analyze}
          disabled={Boolean(busy)}
          className="hub-btn-secondary inline-flex items-center gap-2 text-sm"
        >
          {busy === "analyze" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {busy === "analyze" ? "Kaylev is reading…" : "Ask Kaylev to read the results"}
        </button>
        {(["A", "B"] as TestVariant[]).map((variant) => (
          <button
            key={variant}
            type="button"
            onClick={() =>
              patch(`winner:${variant}`, {
                winnerVariant: test.winner_variant === variant ? null : variant,
                status: test.winner_variant === variant ? "live" : "completed",
              })
            }
            disabled={Boolean(busy)}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-emerald-400/50"
          >
            {test.winner_variant === variant ? `Clear winner ${variant}` : `Pick ${variant} as winner`}
          </button>
        ))}
        {!test.winner_variant ? (
          <button
            type="button"
            onClick={() => patch("status", { status: test.status === "completed" ? "live" : "completed" })}
            disabled={Boolean(busy)}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500"
          >
            {test.status === "completed" ? "Reopen" : "Mark complete"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={remove}
          disabled={Boolean(busy)}
          className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-zinc-500 hover:text-rose-300"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete
        </button>
        {error ? <p className="w-full text-sm text-rose-300">{error}</p> : null}
      </div>
    </article>
  );
}
