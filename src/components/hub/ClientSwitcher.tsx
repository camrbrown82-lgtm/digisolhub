"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type HubClient = {
  id: string;
  name: string;
  domain?: string | null;
};

export function ClientSwitcher({
  clients,
  activeClientId,
}: {
  clients: HubClient[];
  activeClientId: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(activeClientId);
  const active = clients.find((client) => client.id === value);

  useEffect(() => {
    setValue(activeClientId);
  }, [activeClientId]);

  async function onChange(next: string) {
    setValue(next);
    await fetch("/api/hub/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: next }),
    });
    router.refresh();
  }

  return (
    <label className="mt-3 block text-xs text-zinc-500">
      Working on
      <select
        value={value}
        onChange={(event) => void onChange(event.target.value)}
        className="hub-field mt-1 text-sm"
      >
        <option value="">All companies</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </select>
      {active?.domain ? (
        <span className="mt-1 block truncate text-[11px] text-zinc-600">
          {active.domain}
        </span>
      ) : null}
    </label>
  );
}
