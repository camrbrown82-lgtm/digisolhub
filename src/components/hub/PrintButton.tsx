"use client";

import { Printer } from "lucide-react";

function printDocument(target: Window, url: string) {
  target.document.open();
  target.document.write(
    "<!DOCTYPE html><html><head><title>Poster</title></head><body></body></html>",
  );
  target.document.close();
  const style = target.document.createElement("style");
  style.textContent =
    "@page { margin: 0.4in; } html, body { margin: 0; background: #fff; } img { display: block; width: 100%; height: auto; }";
  const image = target.document.createElement("img");
  image.alt = "Poster";
  image.src = url;
  target.document.head.appendChild(style);
  target.document.body.appendChild(image);
  const run = () => {
    target.focus();
    target.print();
  };
  if (image.complete && image.naturalWidth > 0) run();
  else image.addEventListener("load", run, { once: true });
  target.addEventListener("afterprint", () => target.close());
}

/** Print one saved poster image, without the hub editor around it. */
export function printPoster(url: string) {
  const popup = window.open("", "_blank");
  if (!popup) return;
  printDocument(popup, url);
}

export function PrintButton({ label = "Print", className = "" }: { label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`hub-btn-secondary inline-flex items-center justify-center gap-1.5 text-xs print:hidden ${className}`}
    >
      <Printer className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}

export function PrintPosterButton({
  url,
  label = "Print",
  className = "",
}: {
  url: string;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={!url}
      title={url ? "Print the saved poster" : "Save the poster, then print it"}
      onClick={() => printPoster(url)}
      className={`hub-btn-secondary inline-flex items-center justify-center gap-1.5 text-xs print:hidden disabled:opacity-60 ${className}`}
    >
      <Printer className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
