"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function BusinessCardMaker({
  companyName,
  siteReady,
  siteHint,
  scanNote,
  defaults,
}: {
  companyName: string;
  siteReady: boolean;
  siteHint: string;
  scanNote: string;
  defaults: {
    personName: string;
    personTitle: string;
    phone: string;
    email: string;
    line: string;
  };
}) {
  const router = useRouter();
  const [personName, setPersonName] = useState(defaults.personName);
  const [personTitle, setPersonTitle] = useState(defaults.personTitle);
  const [phone, setPhone] = useState(defaults.phone);
  const [email, setEmail] = useState(defaults.email);
  const [line, setLine] = useState(defaults.line);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [cardUrl, setCardUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!siteReady || busy) return;
    setBusy(true);
    setStatus("Kaylev is typesetting the card and embedding the QR code…");
    setCardUrl("");
    setPdfUrl("");
    setQrUrl("");
    const response = await fetch("/api/hub/business-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personName, personTitle, phone, email, line }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      url?: string;
      pdfUrl?: string;
      qrUrl?: string;
      line?: string;
    };
    setBusy(false);
    if (!response.ok || !result.url) {
      setStatus(result.error || "Kaylev could not build the card.");
      return;
    }
    setCardUrl(result.url);
    setPdfUrl(result.pdfUrl || "");
    setQrUrl(result.qrUrl || "");
    if (result.line) setLine(result.line);
    setStatus("Card saved. Print the PDF at 100% scale so the QR stays scannable.");
    router.refresh();
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Business cards</h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-400">
          Kaylev makes a 3.5 × 2 inch card for {companyName} from this brand kit.
          The logo is the official mark, and the QR code is a real code that opens
          the website with Kaylev as the source. {scanNote}
        </p>
      </div>
      {siteReady ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Name on the card
              <input value={personName} onChange={(event) => setPersonName(event.target.value)} className="hub-field" />
            </label>
            <label className="block text-sm">
              Title
              <input value={personTitle} onChange={(event) => setPersonTitle(event.target.value)} className="hub-field" />
            </label>
            <label className="block text-sm">
              Phone
              <input value={phone} onChange={(event) => setPhone(event.target.value)} className="hub-field" />
            </label>
            <label className="block text-sm">
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} className="hub-field" />
            </label>
            <label className="block text-sm sm:col-span-2">
              Line
              <input
                value={line}
                onChange={(event) => setLine(event.target.value)}
                className="hub-field"
                placeholder="Leave blank and Kaylev writes one from the brand kit"
              />
            </label>
          </div>
          <button type="submit" disabled={busy} className="hub-btn">
            {busy ? "Making the card…" : "Kaylev, make this card"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-amber-200/90">{siteHint}</p>
      )}
      {status ? <p className="text-sm text-zinc-400">{status}</p> : null}
      {qrUrl ? (
        <p className="break-all text-xs text-zinc-500">QR opens {qrUrl}</p>
      ) : null}
      {cardUrl ? (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cardUrl}
            alt={`${companyName} business card`}
            className="w-full max-w-xl rounded-xl border border-zinc-800"
          />
          <div className="flex flex-wrap gap-3 text-sm">
            <a href={cardUrl} target="_blank" rel="noreferrer" className="text-indigo-300 hover:text-indigo-200">
              Open print image
            </a>
            {pdfUrl ? (
              <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-indigo-300 hover:text-indigo-200">
                Open print PDF
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
