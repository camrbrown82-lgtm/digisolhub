import { Suspense } from "react";
import { LoginForm } from "@/components/hub/LoginForm";

export default function HubLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
        <h1 className="text-xl font-semibold text-white">Hub</h1>
        <p className="mt-1 text-sm text-zinc-500">Enter your password</p>
        <div className="mt-6">
          <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
