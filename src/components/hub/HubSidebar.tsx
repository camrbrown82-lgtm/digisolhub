"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Archive,
  Award,
  BarChart3,
  Bot,
  Building2,
  Contact,
  Files,
  LogOut,
  Mail,
  Palette,
  Plug,
  Radar,
  SearchCheck,
  Swords,
  Workflow,
} from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/client";

const nav = [
  { href: "/hub/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/hub/google", label: "Google setup", icon: SearchCheck },
  { href: "/hub/clients", label: "Companies", icon: Building2 },
  { href: "/hub/brand", label: "Brand", icon: Palette },
  { href: "/hub/contacts", label: "Contacts", icon: Contact },
  { href: "/hub/prospects", label: "Prospect audits", icon: Radar },
  { href: "/hub/awards", label: "Website awards", icon: Award },
  { href: "/hub/competitive", label: "Competitive analysis", icon: Swords },
  { href: "/hub/email", label: "Email", icon: Mail },
  { href: "/hub/campaigns", label: "Campaigns", icon: Workflow },
  { href: "/hub/assets", label: "Files", icon: Files },
  { href: "/hub/ai", label: "AI posters", icon: Bot },
  { href: "/hub/integrations", label: "Integrations", icon: Plug },
];
export function HubSidebar({
  companyName,
  siteUrl,
}: {
  companyName: string;
  siteUrl: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/hub/unlock", { method: "DELETE" }).catch(() => undefined);
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
            item.href === "/hub/campaigns"
              ? pathname === "/hub/campaigns" ||
                pathname.startsWith("/hub/workflows")
              : item.href === "/hub/ai"
                ? pathname === "/hub/ai" || pathname.startsWith("/hub/archives")
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-indigo-600/25 text-sky-200 ring-1 ring-indigo-400/40"
                  : "text-indigo-300/80 hover:bg-indigo-500/10 hover:text-sky-200"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
        <Link
          href="/hub/archives"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
            pathname.startsWith("/hub/archives")
              ? "bg-indigo-600/25 text-sky-200 ring-1 ring-indigo-400/40"
              : "text-indigo-300/70 hover:bg-indigo-500/10 hover:text-sky-200"
          }`}
        >
          <Archive className="h-4 w-4 shrink-0" aria-hidden="true" />
          Poster archives
        </Link>
      </nav>
      <div className="border-t border-zinc-800 p-3">
        {siteUrl ? (
          <a
            href={siteUrl}
            {...(siteUrl.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="mb-2 block truncate rounded-lg px-3 py-2 text-sm text-indigo-300/70 hover:text-sky-200"
          >
            View {companyName ? `${companyName}'s` : "public"} site
          </a>
        ) : null}
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-indigo-300/80 hover:bg-indigo-500/10 hover:text-sky-200"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  );
}
