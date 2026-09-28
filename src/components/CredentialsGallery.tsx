"use client";

import { useState } from "react";
import Image from "next/image";
import { ExternalLink, FileText } from "lucide-react";
import { CREDENTIALS, type CredentialItem } from "@/lib/credentials";
import { useMessages } from "@/lib/i18n/client";

const TAB_IDS = ["all", "hubspot", "education"] as const;

type TabId = (typeof TAB_IDS)[number];

function matchesTab(item: CredentialItem, tab: TabId) {
  if (tab === "all") return true;
  if (tab === "hubspot") return item.issuer.includes("HubSpot");
  return !item.issuer.includes("HubSpot");
}

export function CredentialsGallery() {
  const t = useMessages().credentials;
  const [tab, setTab] = useState<TabId>("all");
  const items = CREDENTIALS.filter((item) => matchesTab(item, tab)).map((item) => ({
    ...item,
    blurb: t.blurbs[item.id] ?? item.blurb,
  }));

  return (
    <div className="space-y-6">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={t.filtersAria}
      >
        {TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === id
                ? "bg-indigo-600 text-white"
                : "border border-zinc-700 text-zinc-300 hover:border-indigo-500 hover:text-white"
            }`}
          >
            {t.tabs[id]}
          </button>
        ))}
      </div>

      <ul className="grid gap-6 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id} className="group">
            {item.image ? (
              <a
                href={item.image}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 transition hover:border-indigo-500/50"
              >
                <div className="relative aspect-[4/3] bg-white">
                  <Image
                    src={item.image}
                    alt={`${item.title} — ${item.issuer}`}
                    fill
                    className="object-contain p-3"
                    sizes="(max-width: 640px) 100vw, 40vw"
                  />
                </div>
                <div className="space-y-1 border-t border-zinc-800 px-4 py-3">
                  <p className="font-medium text-white">{item.title}</p>
                  <p className="text-sm text-zinc-400">{item.issuer}</p>
                  {item.valid ? (
                    <p className="text-xs text-zinc-500">{item.valid}</p>
                  ) : null}
                  {item.blurb ? (
                    <p className="text-sm text-zinc-500">{item.blurb}</p>
                  ) : null}
                </div>
              </a>
            ) : item.href ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-5 transition hover:border-indigo-500/50"
              >
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" />
                  <div>
                    <p className="font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-zinc-400">{item.issuer}</p>
                    {item.blurb ? (
                      <p className="mt-2 text-sm text-zinc-500">{item.blurb}</p>
                    ) : null}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-sm text-indigo-300">
                  {t.openPdf}
                  <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
