"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Loader2 } from "lucide-react";

type TemplateOption = { id: string; name: string; subject: string | null };

export function AbCampaignBuilder({
  templates,
}: {
  templates: TemplateOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [templateAId, setTemplateAId] = useState(templates[0]?.id ?? "");
  const [templateBId, setTemplateBId] = useState(templates[1]?.id ?? templates[0]?.id ?? "");
  const [splitPercentA, setSplitPercentA] = useState(50);
  const [segment, setSegment] = useState<"all" | "service" | "tag">("service");
  const [tag, setTag] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/hub/campaigns/ab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          industry: industry || undefined,
          templateAId,
          templateBId,
          splitPercentA,
          segment: to.trim() ? undefined : segment,
          service: segment === "service" ? industry : undefined,
          tag: segment === "tag" ? tag : undefined,
          to: to.trim() || undefined,
        }),
      });
      const result = (await response.json()) as {
        campaignId?: string;
        sent?: number;
        sentA?: number;
        sentB?: number;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(result.error || "A/B send failed");
      }
      setStatus(
        `Sent ${result.sent ?? 0} · A ${result.sentA ?? 0} / B ${result.sentB ?? 0}. Compare results below after opens and clicks come in.`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "A/B send failed");
    } finally {
      setBusy(false);
    }
  }

  if (templates.length < 2) {
    return (
      <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-5">
        <h2 className="text-lg font-semibold text-white">A/B email test</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Create two slightly different email templates in Email first, then
          run an A/B campaign here against the same industry audience.
        </p>
        <a href="/hub/email" className="mt-3 inline-block text-sm text-indigo-300 hover:text-indigo-200">
          Open email templates →
        </a>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-indigo-600/30 p-2 text-indigo-200">
          <FlaskConical className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">A/B email test</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Same industry audience, two template variants. DigiSol splits the
            list, tracks opens/clicks per variant, and lets you audit daily,
            weekly, or monthly before declaring a winner.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-zinc-300">
          Campaign name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="hub-field mt-1.5"
            placeholder="Trades nurture A/B — Mar"
          />
        </label>
        <label className="text-sm text-zinc-300">
          Industry / service
          <input
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
            className="hub-field mt-1.5"
            placeholder="trades, retail, clinic…"
            required={segment === "service" && !to.trim()}
          />
        </label>
        <label className="text-sm text-zinc-300">
          Variant A template
          <select
            value={templateAId}
            onChange={(event) => setTemplateAId(event.target.value)}
            className="hub-field mt-1.5"
            required
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.subject ? ` — ${template.subject}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-zinc-300">
          Variant B template
          <select
            value={templateBId}
            onChange={(event) => setTemplateBId(event.target.value)}
            className="hub-field mt-1.5"
            required
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.subject ? ` — ${template.subject}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-zinc-300">
          Audience
          <select
            value={segment}
            onChange={(event) =>
              setSegment(event.target.value as "all" | "service" | "tag")
            }
            className="hub-field mt-1.5"
            disabled={Boolean(to.trim())}
          >
            <option value="service">Match industry / service field</option>
            <option value="tag">Match tag</option>
            <option value="all">All subscribed contacts</option>
          </select>
        </label>
        <label className="text-sm text-zinc-300">
          % to variant A
          <input
            type="number"
            min={10}
            max={90}
            value={splitPercentA}
            onChange={(event) => setSplitPercentA(Number(event.target.value) || 50)}
            className="hub-field mt-1.5"
          />
        </label>
        {segment === "tag" && !to.trim() ? (
          <label className="sm:col-span-2 text-sm text-zinc-300">
            Tag
            <input
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              className="hub-field mt-1.5"
              placeholder="warm-lead"
              required
            />
          </label>
        ) : null}
        <label className="sm:col-span-2 text-sm text-zinc-300">
          Or paste recipient emails (optional override)
          <input
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="hub-field mt-1.5"
            placeholder="a@co.ca, b@co.ca"
          />
        </label>
        <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy || !templateAId || !templateBId}
            className="hub-btn inline-flex items-center gap-2"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {busy ? "Sending A/B…" : "Send A/B test"}
          </button>
          {status ? <p className="text-sm text-indigo-200">{status}</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
