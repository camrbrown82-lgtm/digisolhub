"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Loader2, Plus, Sparkles, X } from "lucide-react";
import { MicDictateButton, appendDictation } from "@/components/hub/MicDictateButton";
import { CONTENT_TEST_CHANNELS, TEST_VARIANTS, type TestVariant } from "@/lib/contentTests";

export type TestAssetOption = {
  id: string;
  filename: string | null;
  public_url: string | null;
  mime_type: string | null;
  isPoster: boolean;
};
type TemplateOption = { id: string; name: string; subject: string | null };
type IssueOption = { slug: string; title: string; url: string };

type VariantDraft = { label: string; body: string; assetId: string; emailTemplateId: string };
type PlanExtras = {
  channelTips: { channel: string; tip: string }[];
  measure: string;
  duration: string;
  checklist: string[];
  angles: Partial<Record<TestVariant, string>>;
  subjects: Partial<Record<TestVariant, string>>;
};

const emptyVariant = (variant: TestVariant): VariantDraft => ({
  label: `Variant ${variant}`,
  body: "",
  assetId: "",
  emailTemplateId: "",
});

function isImage(asset?: TestAssetOption) {
  return Boolean(asset?.public_url && (asset.mime_type || "").startsWith("image/"));
}

export function ContentTestBuilder({
  companyName,
  assets,
  templates,
  issues,
  defaultLandingUrl,
}: {
  companyName: string;
  assets: TestAssetOption[];
  templates: TemplateOption[];
  issues: IssueOption[];
  defaultLandingUrl: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [notes, setNotes] = useState("");
  const [sourceKind, setSourceKind] = useState<"dispatch" | "url">(issues.length ? "dispatch" : "url");
  const [dispatchSlug, setDispatchSlug] = useState(issues[0]?.slug ?? "");
  const [landingUrl, setLandingUrl] = useState(defaultLandingUrl);
  const [channels, setChannels] = useState<string[]>(["facebook", "instagram", "linkedin"]);
  const [variants, setVariants] = useState<Record<TestVariant, VariantDraft>>({
    A: emptyVariant("A"),
    B: emptyVariant("B"),
  });
  const [extras, setExtras] = useState<PlanExtras | null>(null);
  const [planning, setPlanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const assetById = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);
  const posters = assets.filter((a) => a.isPoster);
  const images = assets.filter((a) => !a.isPoster && (a.mime_type || "").startsWith("image/"));
  const videos = assets.filter((a) => (a.mime_type || "").startsWith("video/"));
  const files = assets.filter(
    (a) => !a.isPoster && !(a.mime_type || "").startsWith("image/") && !(a.mime_type || "").startsWith("video/"),
  );
  const issue = issues.find((i) => i.slug === dispatchSlug);
  const resolvedLanding = sourceKind === "dispatch" && issue ? issue.url : landingUrl;
  const busy = planning || saving;

  function setVariant(variant: TestVariant, patch: Partial<VariantDraft>) {
    setVariants((current) => ({ ...current, [variant]: { ...current[variant], ...patch } }));
  }

  function toggleChannel(id: string) {
    setChannels((current) => (current.includes(id) ? current.filter((c) => c !== id) : [...current, id]));
  }

  async function askKaylev() {
    setPlanning(true);
    setError("");
    setStatus("");
    try {
      const picked = TEST_VARIANTS.map((v) => variants[v].assetId).filter(Boolean);
      const assetIds = picked.length ? picked : [...posters, ...images].slice(0, 12).map((a) => a.id);
      const response = await fetch("/api/hub/content-tests/kaylev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "plan",
          goal,
          channels,
          landingUrl: sourceKind === "url" ? landingUrl : "",
          dispatchSlug: sourceKind === "dispatch" ? dispatchSlug : "",
          assetIds,
          templateIds: TEST_VARIANTS.map((v) => variants[v].emailTemplateId).filter(Boolean),
          notes,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        plan?: {
          name: string;
          hypothesis: string;
          variants: {
            variant: TestVariant;
            label: string;
            angle: string;
            body: string;
            assetId: string | null;
            emailSubject: string | null;
          }[];
          channelTips: { channel: string; tip: string }[];
          measure: string;
          duration: string;
          checklist: string[];
        };
      };
      if (!response.ok || !result.plan) throw new Error(result.error || "Kaylev couldn't plan this test.");
      const plan = result.plan;
      if (!name.trim()) setName(plan.name);
      setHypothesis(plan.hypothesis);
      setVariants((current) => {
        const next = { ...current };
        for (const v of plan.variants) {
          next[v.variant] = {
            ...current[v.variant],
            label: v.label,
            body: v.body,
            assetId: current[v.variant].assetId || v.assetId || "",
          };
        }
        return next;
      });
      setExtras({
        channelTips: plan.channelTips,
        measure: plan.measure,
        duration: plan.duration,
        checklist: plan.checklist,
        angles: Object.fromEntries(plan.variants.map((v) => [v.variant, v.angle])),
        subjects: Object.fromEntries(
          plan.variants.filter((v) => v.emailSubject).map((v) => [v.variant, v.emailSubject as string]),
        ),
      });
      setStatus("Kaylev drafted both variants. Edit anything, then save.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaylev couldn't plan this test.");
    } finally {
      setPlanning(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/hub/content-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          goal,
          hypothesis,
          landingUrl: resolvedLanding,
          channels,
          source: sourceKind === "dispatch" && issue ? { kind: "dispatch", dispatchSlug } : { kind: "url" },
          variants: TEST_VARIANTS.map((variant) => ({
            variant,
            label: variants[variant].label,
            body: variants[variant].body,
            assetId: variants[variant].assetId || null,
            emailTemplateId: variants[variant].emailTemplateId || null,
          })),
        }),
      });
      const result = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save the test.");
      setName("");
      setGoal("");
      setHypothesis("");
      setNotes("");
      setVariants({ A: emptyVariant("A"), B: emptyVariant("B") });
      setExtras(null);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the test.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-fuchsia-600/30 p-2 text-fuchsia-200">
            <FlaskConical className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">A/B test social posts, ads, posters &amp; files</h2>
            <p className="mt-1 max-w-3xl text-sm text-zinc-400">
              Pair two versions (copy plus a poster, image, video, file, or email) and share each with its own
              tracking link. Visits, conversions, and leads land on the right variant and channel, so you can see
              which one works. Kaylev can draft both versions and read the results. Tests belong to {companyName}{" "}
              only; switch Working on to test for another company.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="hub-btn inline-flex items-center gap-2"
        >
          {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          {open ? "Close" : "New A/B test"}
        </button>
      </div>

      {open ? (
        <form onSubmit={onSubmit} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-zinc-300">
              What are you promoting?
              <select
                value={sourceKind}
                onChange={(e) => setSourceKind(e.target.value as "dispatch" | "url")}
                className="hub-field mt-1.5"
              >
                {issues.length ? <option value="dispatch">A Dispatch newsletter issue</option> : null}
                <option value="url">A web page</option>
              </select>
            </label>
            {sourceKind === "dispatch" && issues.length ? (
              <label className="text-sm text-zinc-300">
                Newsletter issue
                <select
                  value={dispatchSlug}
                  onChange={(e) => setDispatchSlug(e.target.value)}
                  className="hub-field mt-1.5"
                >
                  {issues.map((i) => (
                    <option key={i.slug} value={i.slug}>
                      {i.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="text-sm text-zinc-300">
                Landing page
                <input
                  value={landingUrl}
                  onChange={(e) => setLandingUrl(e.target.value)}
                  className="hub-field mt-1.5"
                  placeholder="https://example.ca/offer"
                  required
                />
              </label>
            )}
            <label className="text-sm text-zinc-300">
              <span className="flex items-center justify-between gap-2">
                Goal
                <MicDictateButton disabled={busy} onText={(c) => setGoal((g) => appendDictation(g, c))} />
              </span>
              <input
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="hub-field mt-1.5"
                placeholder="Get newsletter readers to book a consult"
              />
            </label>
            <label className="text-sm text-zinc-300">
              Test name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="hub-field mt-1.5"
                placeholder="Launch issue: offer vs proof"
                required
              />
            </label>
          </div>

          <fieldset>
            <legend className="text-sm text-zinc-300">Where will it run?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CONTENT_TEST_CHANNELS.map((channel) => {
                const on = channels.includes(channel.id);
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => toggleChannel(channel.id)}
                    aria-pressed={on}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      on
                        ? "border-fuchsia-300/60 bg-fuchsia-500/25 text-white"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    }`}
                  >
                    {channel.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 lg:grid-cols-2">
            {TEST_VARIANTS.map((variant) => {
              const draft = variants[variant];
              const asset = draft.assetId ? assetById.get(draft.assetId) : undefined;
              return (
                <div key={variant} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-fuchsia-500/25 px-2 py-0.5 text-xs font-semibold text-fuchsia-100">
                      {variant}
                    </span>
                    <input
                      value={draft.label}
                      onChange={(e) => setVariant(variant, { label: e.target.value })}
                      className="hub-field"
                      aria-label={`Variant ${variant} name`}
                    />
                  </div>
                  {extras?.angles[variant] ? (
                    <p className="text-xs text-fuchsia-200/80">Angle: {extras.angles[variant]}</p>
                  ) : null}
                  <label className="block text-sm text-zinc-300">
                    <span className="flex items-center justify-between gap-2">
                      Post / ad copy
                      <MicDictateButton
                        disabled={busy}
                        onText={(c) => setVariant(variant, { body: appendDictation(draft.body, c) })}
                      />
                    </span>
                    <textarea
                      value={draft.body}
                      onChange={(e) => setVariant(variant, { body: e.target.value })}
                      rows={5}
                      className="hub-field mt-1.5"
                      placeholder="The tracking link is added for you when it posts."
                    />
                  </label>
                  <label className="block text-sm text-zinc-300">
                    Poster, image, video, or file
                    <select
                      value={draft.assetId}
                      onChange={(e) => setVariant(variant, { assetId: e.target.value })}
                      className="hub-field mt-1.5"
                    >
                      <option value="">None</option>
                      {[
                        ["Posters", posters],
                        ["Images", images],
                        ["Videos", videos],
                        ["Files", files],
                      ].map(([label, list]) =>
                        (list as TestAssetOption[]).length ? (
                          <optgroup key={label as string} label={label as string}>
                            {(list as TestAssetOption[]).map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.filename || "Untitled"}
                              </option>
                            ))}
                          </optgroup>
                        ) : null,
                      )}
                    </select>
                  </label>
                  {isImage(asset) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset!.public_url!}
                      alt={asset!.filename || `Variant ${variant} visual`}
                      className="max-h-40 rounded-lg border border-zinc-800 object-contain"
                    />
                  ) : null}
                  {channels.includes("email") ? (
                    <label className="block text-sm text-zinc-300">
                      Email template
                      <select
                        value={draft.emailTemplateId}
                        onChange={(e) => setVariant(variant, { emailTemplateId: e.target.value })}
                        className="hub-field mt-1.5"
                      >
                        <option value="">None</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                            {t.subject ? ` (${t.subject})` : ""}
                          </option>
                        ))}
                      </select>
                      {extras?.subjects[variant] ? (
                        <span className="mt-1 block text-xs text-fuchsia-200/80">
                          Kaylev&apos;s subject line: {extras.subjects[variant]}
                        </span>
                      ) : null}
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-zinc-300">
              Hypothesis
              <input
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
                className="hub-field mt-1.5"
                placeholder="Leading with the discount gets more consults than leading with features"
              />
            </label>
            <label className="text-sm text-zinc-300">
              <span className="flex items-center justify-between gap-2">
                Notes for Kaylev (optional)
                <MicDictateButton disabled={busy} onText={(c) => setNotes((n) => appendDictation(n, c))} />
              </span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="hub-field mt-1.5"
                placeholder="Test the hook, keep the same poster"
              />
            </label>
          </div>

          {extras ? (
            <div className="rounded-xl border border-fuchsia-400/20 bg-zinc-950/40 p-4 text-sm text-zinc-300">
              <p className="font-medium text-white">Kaylev&apos;s plan</p>
              <p className="mt-2">
                <span className="text-zinc-500">Winner decided by:</span> {extras.measure}
              </p>
              <p className="mt-1">
                <span className="text-zinc-500">Run it:</span> {extras.duration}
              </p>
              {extras.channelTips.length ? (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {extras.channelTips.map((tip) => (
                    <li key={tip.channel}>
                      <span className="text-zinc-400">{tip.channel}:</span> {tip.tip}
                    </li>
                  ))}
                </ul>
              ) : null}
              {extras.checklist.length ? (
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-zinc-400">
                  {extras.checklist.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={askKaylev}
              disabled={busy || channels.length === 0}
              className="hub-btn-secondary inline-flex items-center gap-2"
            >
              {planning ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {planning ? "Kaylev is planning…" : "Ask Kaylev to plan it"}
            </button>
            <button
              type="submit"
              disabled={busy || channels.length === 0 || !resolvedLanding}
              className="hub-btn inline-flex items-center gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {saving ? "Saving…" : "Save test and get tracking links"}
            </button>
            {status ? <p className="text-sm text-fuchsia-200">{status}</p> : null}
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}
