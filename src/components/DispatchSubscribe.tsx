"use client";

import { FormEvent, useState } from "react";
import { Mail } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const fieldClass =
  "mt-1.5 w-full rounded-lg border border-indigo-400/25 bg-zinc-950/80 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30";

export function DispatchSubscribe({
  sourceSlug,
}: {
  sourceSlug?: string;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("saving");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/dispatch/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          company: data.get("company"),
          botcheck: data.get("botcheck"),
          slug: sourceSlug,
        }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Could not subscribe");
      }
      trackEvent("dispatch_subscribe", {
        slug: sourceSlug || "archive",
      });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not subscribe");
    }
  }

  return (
    <div
      id="subscribe"
      className="scroll-mt-8 rounded-2xl border border-indigo-400/25 bg-indigo-500/10 p-6 sm:p-8"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
          <Mail className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-white">
            Get the next Dispatch by email
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Monthly, when a new issue goes live. Unsubscribe any time. We
            won&apos;t send the issue you just read.
          </p>
        </div>
      </div>
      {status === "done" ? (
        <p className="mt-6 text-sm text-indigo-200" role="status">
          You&apos;re on the list. Watch for the next issue in your inbox.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            name="botcheck"
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          <label className="block text-sm font-medium text-zinc-200">
            Name
            <input
              name="name"
              required
              autoComplete="name"
              className={fieldClass}
              placeholder="Alex Rivera"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-200">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className={fieldClass}
              placeholder="you@company.com"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-200 sm:col-span-2">
            Company{" "}
            <span className="font-normal text-zinc-500">(optional)</span>
            <input
              name="company"
              autoComplete="organization"
              className={fieldClass}
              placeholder="Acme Co"
            />
          </label>
          {error ? (
            <p className="text-sm text-red-400 sm:col-span-2" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={status === "saving"}
            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
          >
            {status === "saving" ? "Subscribing…" : "Subscribe to Dispatch"}
          </button>
        </form>
      )}
    </div>
  );
}
