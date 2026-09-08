"use client";

import { FormEvent, useState } from "react";

export function UnsubscribeForm({
  email,
  token,
  valid,
}: {
  email: string;
  token: string;
  valid: boolean;
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token }),
    });
    if (!response.ok) {
      const result = (await response.json()) as { error?: string };
      setError(result.error || "Could not unsubscribe");
      return;
    }
    setDone(true);
  }

  if (!valid) {
    return (
      <p className="text-sm text-red-400">
        This unsubscribe link is invalid or expired.
      </p>
    );
  }

  if (done) {
    return (
      <p className="text-sm text-zinc-300">
        You are unsubscribed. DigiSol will not send you further campaign email.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-zinc-400">
        Unsubscribe <span className="text-white">{email}</span> from DigiSol
        campaigns.
      </p>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="hub-btn">
        Unsubscribe
      </button>
    </form>
  );
}
