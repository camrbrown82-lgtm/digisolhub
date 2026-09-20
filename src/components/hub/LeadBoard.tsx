"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LEAD_STAGES,
  labelFor,
  leadDisplayName,
  type LeadRecord,
  LEAD_SOURCES,
} from "@/lib/lead-pipeline";

export function LeadBoard({ leads }: { leads: LeadRecord[] }) {
  const router = useRouter();

  async function moveLead(id: string, stage: string) {
    await fetch(`/api/hub/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    router.refresh();
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {LEAD_STAGES.map((stage) => {
        const items = leads.filter((lead) => lead.stage === stage.id);
        return (
          <section
            key={stage.id}
            className="min-w-[14rem] shrink-0 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">{stage.label}</h2>
              <span className="text-xs text-zinc-500">{items.length}</span>
            </div>
            <ul className="space-y-2">
              {items.length === 0 ? (
                <li className="text-xs text-zinc-600">Empty</li>
              ) : (
                items.map((lead) => (
                  <li
                    key={lead.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3"
                  >
                    <Link
                      href={`/hub/leads/${lead.id}`}
                      className="block text-sm font-medium text-white hover:text-indigo-300"
                    >
                      {leadDisplayName(lead)}
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">
                      {labelFor(LEAD_SOURCES, lead.source)}
                      {lead.location ? ` · ${lead.location}` : ""}
                    </p>
                    <label className="mt-2 block text-[11px] text-zinc-500">
                      Move
                      <select
                        value={lead.stage}
                        onChange={(event) => moveLead(lead.id, event.target.value)}
                        className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
                      >
                        {LEAD_STAGES.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </li>
                ))
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
