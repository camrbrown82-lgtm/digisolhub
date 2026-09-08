"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bot,
  Contact,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Plug,
  Workflow,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { createBrowserSupabase } from "@/lib/supabase/client";

const nav = [
  { href: "/hub", label: "Overview", icon: LayoutDashboard },
  { href: "/hub/contacts", label: "Contacts", icon: Contact },
  { href: "/hub/email", label: "Email", icon: Mail },
  { href: "/hub/assets", label: "Assets", icon: ImageIcon },
  { href: "/hub/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/hub/workflows", label: "Workflows", icon: Workflow },
  { href: "/hub/ai", label: "AI posters", icon: Bot },
  { href: "/hub/integrations", label: "Integrations", icon: Plug },
];

export function HubSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/hub/login");
    router.refresh();
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-4">
        <Logo href="/hub" size="hub" />
        <p className="mt-2 text-xs uppercase tracking-wider text-zinc-500">
          Marketing hub
        </p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
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
              <Icon className="h-4 w-4" aria-hidden="true" />
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
    </aside>
  );
}
