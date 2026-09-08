import { Suspense } from "react";
import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/hub/LoginForm";

export default function HubLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
        <Logo href="/" size="hub" />
        <h1 className="mt-6 text-2xl font-semibold text-white">Sign in to DigiSol Hub</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Sign in with cam.r.brown82@gmail.com. The public site stays at /.
        </p>
        <div className="mt-6">
          <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
