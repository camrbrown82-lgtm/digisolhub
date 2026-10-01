"use client";

export function OpenClientButton({
  clientId,
  href = "/hub/contacts",
  label = "Open work",
}: {
  clientId: string;
  href?: string;
  label?: string;
}) {
  async function open() {
    const response = await fetch("/api/hub/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    if (!response.ok) return;
    window.location.assign(href);
  }

  return (
    <button type="button" onClick={open} className="text-sm text-indigo-400 hover:text-indigo-300">
      {label}
    </button>
  );
}
