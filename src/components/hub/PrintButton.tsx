"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="hub-btn-secondary inline-flex items-center gap-1.5 text-xs print:hidden"
    >
      <Printer className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
