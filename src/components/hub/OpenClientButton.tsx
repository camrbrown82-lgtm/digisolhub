"use client";

import { useRouter } from "next/navigation";

export function OpenClientButton({
  clientId,
  href = "/hub/contacts",
  label = "Open work",
}: {
  clientId: string;
  href?: string;
  label?: string;
}) {
  const router = useRouter();

  async function open() {
    await fetch("/api/hub/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    router.push(href);
    router.refresh();
  }

  return (
    <button type="button" onClick={open} className="text-sm text-indigo-400 hover:text-indigo-300">
      {label}
    </button>
  );
}
