import { Suspense } from "react";
import { LoginForm } from "@/components/hub/LoginForm";

export default function HubLoginPage() {
  return (
    <main className="hub-app flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-indigo-500/30 bg-zinc-900/50 p-8">
        <h1 className="text-xl font-semibold">Hub</h1>
        <p className="mt-1 text-sm text-indigo-300/70">Enter your password</p>
        <div className="mt-6">
          <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
