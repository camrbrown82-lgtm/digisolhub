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

/** Password-only hub login — owner email is fixed server-side. */
export function LoginForm() {
  const params = useSearchParams();
  const ownerEmail = allowedEmail();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState(
    params.get("error") === "not-allowed"
      ? "That account is not allowed to access the hub."
      : params.get("error") === "auth"
        ? "Sign-in failed. Check your password."
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
        "Timed out connecting to Supabase.",
      );

      const { data, error: authError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: ownerEmail,
          password,
        }),
        20000,
        "Sign-in timed out.",
      );

      if (authError) throw authError;

      if (!isAllowedEmail(data.user?.email)) {
        await supabase.auth.signOut();
        throw new Error("That account is not allowed to access the hub.");
      }

      window.location.assign(nextPath());
    } catch (err) {
      setStatus("idle");
      setError(
        err instanceof Error ? err.message : "Could not sign in. Check the password.",
      );
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="hub-password"
          className="block text-sm font-medium text-zinc-200"
        >
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
          autoFocus
        />
      </div>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === "working"}
        className="hub-btn w-full"
      >
        {status === "working" ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
