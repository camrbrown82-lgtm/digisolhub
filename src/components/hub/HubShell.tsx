"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ClientSwitcher, type HubClient } from "@/components/hub/ClientSwitcher";

export function HubShell({
  sidebar,
  clients,
  activeClientId,
  children,
}: {
  sidebar: ReactNode;
  clients: HubClient[];
  activeClientId: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.classList.add("hub-lock");
    document.body.classList.add("hub-lock");
    return () => {
      document.documentElement.classList.remove("hub-lock");
      document.body.classList.remove("hub-lock");
    };
  }, []);

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-zinc-950">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-3 sm:px-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 text-zinc-200 hover:border-indigo-500 hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Logo href="/hub" size="hub" />
        <p className="hidden text-sm text-zinc-500 sm:block">Hub</p>
        <div className="min-w-0 flex-1 sm:max-w-xs sm:ml-auto">
          <ClientSwitcher clients={clients} activeClientId={activeClientId} compact />
        </div>
      </header>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[min(18rem,90vw)] flex-col border-r border-zinc-800 bg-zinc-950 shadow-2xl transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-3">
          <p className="text-sm text-white">Menu</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{sidebar}</div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
