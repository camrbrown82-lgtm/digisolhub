"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { allowedEmail, isAllowedEmail } from "@/lib/allowlist";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(allowedEmail());
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "sent">("idle");
  const [error, setError] = useState(
    params.get("error") === "not-allowed"
      ? "That account is not allowed to access the hub."
      : "",
  );

  function nextPath() {
    return params.get("next") || "/hub";
  }

  async function signInWithPassword() {
    if (!isAllowedEmail(email)) {
      throw new Error("That account is not allowed to access the hub.");
    }

    const supabase = await createBrowserSupabase();
    const firstTry = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (!firstTry.error) {
      router.push(nextPath());
      router.refresh();
      return;
    }

    const ensure = await fetch("/api/auth/ensure-hub-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const ensureResult = (await ensure.json()) as { error?: string };
    if (!ensure.ok) {
      throw new Error(
        ensureResult.error ||
          firstTry.error.message ||
          "Could not prepare the hub account.",
      );
    }

    const secondTry = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (secondTry.error) throw secondTry.error;
    router.push(nextPath());
    router.refresh();
  }

  async function sendMagicLink() {
    if (!isAllowedEmail(email)) {
      throw new Error("That account is not allowed to access the hub.");
    }
    const supabase = await createBrowserSupabase();
    const origin = window.location.origin;
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath())}`,
      },
    });
    if (authError) throw authError;
    setStatus("sent");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("working");
    try {
      await signInWithPassword();
    } catch (err) {
      setStatus("idle");
      setError(
        err instanceof Error
          ? err.message
          : "Could not sign in. Check the password and Supabase Auth settings.",
      );
    }
  }

  async function onMagicLink() {
    setError("");
    setStatus("working");
    try {
      await sendMagicLink();
    } catch (err) {
      setStatus("idle");
      setError(
        err instanceof Error
          ? err.message
          : "Could not send the magic link.",
      );
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="hub-email" className="block text-sm font-medium text-zinc-200">
          Email
        </label>
        <input
          id="hub-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="hub-field"
          autoComplete="username"
        />
      </div>
      <div>
        <label htmlFor="hub-password" className="block text-sm font-medium text-zinc-200">
          Password
        </label>
        <input
          id="hub-password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="hub-field"
          autoComplete="current-password"
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          First sign-in creates the hub password for the owner account.
        </p>
      </div>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {status === "sent" ? (
        <p className="text-sm text-indigo-300">
          Check your inbox for the sign-in link.
        </p>
      ) : (
        <>
          <button type="submit" disabled={status === "working"} className="hub-btn w-full">
            {status === "working" ? "Signing in…" : "Sign in to Hub"}
          </button>
          <button
            type="button"
            disabled={status === "working"}
            onClick={onMagicLink}
            className="hub-btn-secondary w-full"
          >
            Email a magic link instead
          </button>
        </>
      )}
    </form>
  );
}
