"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PosterActions } from "@/components/hub/PosterActions";
import { MicDictateButton, appendDictation } from "@/components/hub/MicDictateButton";

type ChatMessage = { role: "kaylev" | "user"; text: string };

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
  const [directions, setDirections] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "kaylev",
      text: "Tell me what to put on the card, or what to change after you see it. I keep the name, phone, and email unless you say otherwise.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [cardUrl, setCardUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [assetId, setAssetId] = useState("");

  async function makeCard(note: string) {
    if (!siteReady || busy) return;
    const asked = note.trim();
    setBusy(true);
    setStatus(asked ? "Kaylev is updating the card…" : "Kaylev is typesetting the card and embedding the QR code…");
    if (asked) {
      setMessages((current) => [...current, { role: "user", text: asked }]);
      setDirections("");
    }
    const response = await fetch("/api/hub/business-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personName, personTitle, phone, email, line, directions: asked }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      id?: string;
      url?: string;
      pdfUrl?: string;
      qrUrl?: string;
      line?: string;
      personName?: string;
      personTitle?: string;
      phone?: string;
      email?: string;
      reply?: string;
    };
    setBusy(false);
    if (!response.ok || !result.url) {
      setStatus(result.error || "Kaylev could not build the card.");
      setMessages((current) => [
        ...current,
        { role: "kaylev", text: result.error || "I could not build that card. Try again." },
      ]);
      return;
    }
    setCardUrl(result.url);
    setPdfUrl(result.pdfUrl || "");
    setQrUrl(result.qrUrl || "");
    setAssetId(result.id || "");
    if (result.line) setLine(result.line);
    if (typeof result.personName === "string") setPersonName(result.personName);
    if (typeof result.personTitle === "string") setPersonTitle(result.personTitle);
    if (typeof result.phone === "string") setPhone(result.phone);
    if (typeof result.email === "string") setEmail(result.email);
    setMessages((current) => [
      ...current,
      { role: "kaylev", text: result.reply || "Card is ready. Tell me if you want a change." },
    ]);
    setStatus(
      result.id
        ? "Card saved. Archive or delete it if it does not look right. Print the PDF at 100% scale."
        : "Card is ready, but it could not be filed for archive or delete. Print the PDF at 100% scale.",
    );
    router.refresh();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void makeCard(directions);
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

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
            <p className="text-sm font-medium text-white">Directions for Kaylev</p>
            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
              {messages.map((message, index) => (
                <p
                  key={`${message.role}-${index}`}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    message.role === "kaylev" ? "bg-indigo-500/10 text-indigo-100" : "bg-zinc-800 text-zinc-100"
                  }`}
                >
                  <span className="mr-2 text-xs uppercase tracking-wide text-zinc-500">
                    {message.role === "kaylev" ? "Kaylev" : "You"}
                  </span>
                  {message.text}
                </p>
              ))}
            </div>
            <label className="mt-3 block text-sm">
              <span className="flex items-center justify-between gap-2">
                Message
                <MicDictateButton
                  disabled={busy}
                  onText={(chunk) => setDirections((current) => appendDictation(current, chunk))}
                />
              </span>
              <textarea
                value={directions}
                onChange={(event) => setDirections(event.target.value)}
                rows={3}
                className="hub-field mt-1.5 resize-y"
                placeholder="Example: shorter line, drop the email, put Founder under the name."
              />
            </label>
          </div>

          <button type="submit" disabled={busy} className="hub-btn">
            {busy ? "Making the card…" : directions.trim() ? "Send to Kaylev" : "Kaylev, make this card"}
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
          {assetId ? (
            <PosterActions
              id={assetId}
              noun="business card"
              onDone={(action) => {
                if (action === "delete") {
                  setCardUrl("");
                  setPdfUrl("");
                  setQrUrl("");
                  setAssetId("");
                  setStatus("Card deleted.");
                } else if (action === "archive") {
                  setStatus("Card archived. Restore it from Archives on AI posters.");
                } else {
                  setStatus("Card restored to AI posters.");
                }
              }}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
