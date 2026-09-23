"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { allowedEmail, isAllowedEmail } from "@/lib/allowlist";

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Password-only hub login. Owner email is fixed — no OTP / magic link / signup. */
export function LoginForm() {
  const params = useSearchParams();
  const ownerEmail = allowedEmail();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState(
    params.get("error") === "not-allowed"
      ? "That account is not allowed to access the hub."
      : params.get("error") === "auth"
        ? "Sign-in failed. Use your password — magic links are disabled."
        : "",
  );

  function nextPath() {
    return params.get("next") || "/hub/analytics";
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setStatus("working");

    try {
      if (!isAllowedEmail(ownerEmail)) {
        throw new Error("Hub owner email is not configured.");
      }

      const supabase = await withTimeout(
        createBrowserSupabase(),
        12000,
        "Timed out connecting to Supabase. Check SUPABASE_URL on this deploy.",
      );

      const { data, error: authError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: ownerEmail,
          password,
        }),
        20000,
        "Sign-in timed out. Confirm Email+password auth is enabled in Supabase.",
      );

      if (authError) throw authError;

      const email = data.user?.email;
      if (!isAllowedEmail(email)) {
        await supabase.auth.signOut();
        throw new Error("That account is not allowed to access the hub.");
      }

      window.location.assign(nextPath());
    } catch (err) {
      setStatus("idle");
      setError(
        err instanceof Error
          ? err.message
          : "Could not sign in. Check the password.",
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
          value={ownerEmail}
          readOnly
          className="hub-field cursor-not-allowed opacity-90"
          autoComplete="username"
        />
        <p className="mt-1.5 text-xs text-zinc-500">
          Owner-only access. Magic links and OTP are disabled.
        </p>
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
      </div>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={status === "working"} className="hub-btn w-full">
        {status === "working" ? "Signing in…" : "Sign in to Hub"}
      </button>
    </form>
  );
}
