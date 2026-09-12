"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bot,
  Building2,
  Contact,
  Files,
  LayoutDashboard,
  LogOut,
  Mail,
  Palette,
  Plug,
  Workflow,
} from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/client";

const nav = [
  { href: "/hub", label: "Overview", icon: LayoutDashboard },
  { href: "/hub/clients", label: "Companies", icon: Building2 },
  { href: "/hub/brand", label: "Brand", icon: Palette },
  { href: "/hub/contacts", label: "Contacts", icon: Contact },
  { href: "/hub/email", label: "Email", icon: Mail },
  { href: "/hub/assets", label: "Files", icon: Files },
  { href: "/hub/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/hub/workflows", label: "Workflows", icon: Workflow },
  { href: "/hub/ai", label: "AI posters", icon: Bot },
  { href: "/hub/integrations", label: "Integrations", icon: Plug },
];

export function HubSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = await createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/hub/login");
    router.refresh();
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-950">
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((item) => {
          const active =
            item.href === "/hub"
              ? pathname === "/hub"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-indigo-600/20 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800 p-3">
        <Link
          href="/"
          className="mb-2 block rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-white"
        >
          View public site
        </Link>
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  );
}
