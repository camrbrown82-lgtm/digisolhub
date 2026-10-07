"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PosterActions } from "@/components/hub/PosterActions";
import { MicDictateButton, appendDictation } from "@/components/hub/MicDictateButton";
import { LayoutEditor } from "@/components/hub/LayoutEditor";
import { MAX_FILE_MB } from "@/lib/files";
import { uploadHubFile } from "@/lib/hubUpload";
import type { LayoutPiece } from "@/lib/layoutPieces";

type ChatMessage = { role: "kaylev" | "user"; text: string };

function libraryImagePieces(
  files: { url: string; label: string; role: string }[],
  picked: string[],
  existing: LayoutPiece[],
  logoSize: number,
  emblemSize: number,
): LayoutPiece[] {
  const have = new Set(existing.filter((piece) => piece.kind === "image").map((piece) => piece.src));
  return files
    .filter((file) => picked.includes(file.url) && !have.has(file.url))
    .slice(0, 8)
    .map((file, index) => ({
      id: `photo-${file.role}-${index}`,
      label: file.label,
      text: file.label,
      kind: "image" as const,
      src: file.url,
      size: file.role === "emblem" ? emblemSize : file.role === "logo" ? logoSize : 140,
      x: file.role === "logo" ? 28 : file.role === "emblem" ? 34 : 8 + (index % 2) * 42,
      y: file.role === "award" ? 18 + index * 10 : file.role === "logo" ? 2 : 30,
      face: file.role === "award" ? "back" : "front",
      weight: "regular" as const,
    }));
}

function starterPieces(companyName: string, defaults: { personName: string; personTitle: string; phone: string; email: string }): LayoutPiece[] {
  const front = [defaults.personName, companyName, defaults.personTitle, defaults.email, defaults.phone].filter(Boolean);
  return [
    ...front.map((text, index) => ({
      id: `front-${index}`,
      label: index === 0 ? "Name" : `Line ${index + 1}`,
      text,
      size: index === 0 ? 22 : 15,
      x: 3,
      y: 24 + index * 7,
      face: "front",
      weight: index === 0 ? ("semi" as const) : ("regular" as const),
    })),
    {
      id: "headline",
      label: "Headline",
      text: "Get your free audit & badges",
      size: 26,
      x: 12,
      y: 6,
      face: "back",
      weight: "semi" as const,
    },
  ];
}

export function BusinessCardMaker({
  companyName,
  siteReady,
  siteHint,
  scanNote,
  library,
  defaults,
  palette,
}: {
  companyName: string;
  siteReady: boolean;
  siteHint: string;
  scanNote: string;
  library: { url: string; label: string; role: "logo" | "emblem" | "award" | "upload"; selected?: boolean }[];
  palette?: { name: string; value: string }[];
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
      text: "I'll start with two sections on the front: an indigo header with the logo, then your lines on the left, a large logo badge in the center, and the QR on the right. The back has the headline and the awards. Tell me if you want any of that moved.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [cardUrl, setCardUrl] = useState("");
  const [backUrl, setBackUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [cardView, setCardView] = useState("");
  const [backView, setBackView] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [assetId, setAssetId] = useState("");
  const [layout, setLayout] = useState<LayoutPiece[]>(() => starterPieces(companyName, defaults));
  const [imageLayout, setImageLayout] = useState(false);
  const [logoSize, setLogoSize] = useState(72);
  const [emblemSize, setEmblemSize] = useState(360);
  const [files, setFiles] = useState(library);
  const [picked, setPicked] = useState<string[]>(() =>
    library.filter((item) => item.selected !== false).map((item) => item.url),
  );
  const fileInput = useRef<HTMLInputElement>(null);

  async function makeCard(note: string, useLayout = false) {
    if (!siteReady || busy) return;
    const asked = note.trim();
    setBusy(true);
    setStatus(
      useLayout
        ? "Saving this card…"
        : asked
          ? "Drawing the card from your directions…"
          : "Making the card…",
    );
    if (asked) {
      setMessages((current) => [...current, { role: "user", text: asked }]);
      setDirections("");
    }
    const response = await fetch("/api/hub/business-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personName,
        personTitle,
        phone,
        email,
        line,
        directions: asked,
        layout: useLayout ? layout : undefined,
        layoutOnly: useLayout,
        imageLayout: useLayout && imageLayout,
        url: cardUrl,
        backUrl,
        pdfUrl,
        logoSize,
        emblemSize,
        files: files
          .filter((file) => picked.includes(file.url))
          .map((file) => ({ url: file.url, role: file.role })),
      }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      error?: string;
      id?: string;
      url?: string;
      backUrl?: string;
      pdfUrl?: string;
      qrUrl?: string;
      line?: string;
      personName?: string;
      personTitle?: string;
      phone?: string;
      email?: string;
      reply?: string;
      pieces?: LayoutPiece[];
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
    const fresh = Date.now();
    setCardUrl(result.url);
    setBackUrl(result.backUrl || "");
    setPdfUrl(result.pdfUrl || "");
    setCardView(`${result.url}?v=${fresh}`);
    setBackView(result.backUrl ? `${result.backUrl}?v=${fresh}` : "");
    setQrUrl(result.qrUrl || "");
    if (result.id) setAssetId(result.id);
    if (!useLayout) {
      const text = result.pieces?.length ? result.pieces : layout.filter((piece) => piece.kind !== "image");
      const kept = layout.filter((piece) => piece.kind === "image");
      const extras = libraryImagePieces(files, picked, kept, logoSize, emblemSize);
      setLayout([...text, ...kept, ...extras]);
      if (kept.length || extras.length) setImageLayout(true);
    }
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
      useLayout
        ? "Updated this card."
        : "Both sides saved. Print the PDF double-sided, flip on the long edge, at 100% scale.",
    );
    if (!cardUrl) router.refresh();
  }

  async function importFiles(list: FileList | null) {
    const chosen = Array.from(list ?? []).filter((file) => file.type.startsWith("image/")).slice(0, 6);
    if (!chosen.length) {
      setStatus("Import an image. Kaylev sizes it to the card.");
      return;
    }
    setBusy(true);
    setStatus("Importing…");
    const added: { url: string; label: string; role: "upload"; selected: boolean }[] = [];
    try {
      for (const file of chosen) {
        const saved = await uploadHubFile(file, "image");
        added.push({ url: saved.url, label: saved.filename, role: "upload", selected: true });
      }
      setFiles((current) => [...added, ...current.filter((item) => !added.some((next) => next.url === item.url))]);
      setPicked((current) => [...added.map((item) => item.url), ...current]);
      setStatus(
        added.length === 1
          ? "File imported. It will be sized to the card when you send this to Kaylev."
          : `${added.length} files imported. They will be sized to the card when you send this to Kaylev.`,
      );
      router.refresh();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not import that file.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
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
          Tell Kaylev what the card should show and he draws that picture. Name, phone, and
          email stay as text you can edit. {scanNote}
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
            <p className="text-sm font-medium text-white">Files for this card</p>
            <p className="mt-1 text-sm text-zinc-400">
              Logo, logo badge, and awards. Uncheck one to leave it off. Upload another image if you
              want it in the award grid, up to {MAX_FILE_MB}MB.
            </p>
            <label className="mt-3 inline-flex cursor-pointer">
              <span className="rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-200">
                {busy ? "Working…" : "Upload images"}
              </span>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp"
                multiple
                disabled={busy}
                className="sr-only"
                onChange={(event) => void importFiles(event.target.files)}
              />
            </label>
            {files.length ? (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {files.map((file) => (
                  <li key={file.url}>
                    <label className="flex items-center gap-3 rounded-lg border border-zinc-800 px-2 py-2 text-sm text-zinc-200">
                      <input
                        type="checkbox"
                        checked={picked.includes(file.url)}
                        onChange={(event) =>
                          setPicked((current) =>
                            event.target.checked
                              ? [...current, file.url]
                              : current.filter((url) => url !== file.url),
                          )
                        }
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={file.url} alt="" className="h-10 w-16 rounded bg-zinc-950 object-contain" />
                      <span className="min-w-0 truncate">{file.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">No logo or awards yet. Upload an image if you want one on the card.</p>
            )}
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
                placeholder="Example: move the QR to the back, make the center logo bigger, or change the headline."
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
      {layout.length ? (
        <div className="space-y-3">
          <LayoutEditor
            pieces={layout}
            onChange={(next) => {
              const addedImage = next.some((piece) => piece.kind === "image") && !layout.some((piece) => piece.kind === "image");
              if (addedImage && !imageLayout) {
                const extras = libraryImagePieces(files, picked, next, logoSize, emblemSize);
                setImageLayout(true);
                setLayout([...next, ...extras]);
                return;
              }
              if (next.some((piece) => piece.kind === "image")) setImageLayout(true);
              setLayout(next);
            }}
            designWidth={1050}
            designHeight={600}
            background="#09090b"
            palette={palette}
            faces={["front", "back"]}
            scales={[
              { id: "logo", label: "Logo size", value: logoSize, min: 36, max: 160 },
              { id: "badge", label: "Center logo size", value: emblemSize, min: 180, max: 480 },
            ]}
            onScale={(id, value) => {
              if (id === "logo") setLogoSize(value);
              if (id === "badge") setEmblemSize(value);
            }}
            library={library.map((item) => ({ url: item.url, label: item.label }))}
          />
          <p className="text-sm text-zinc-400">
            Add your own images here. Resize or remove them, including the logo, badge, and awards once they are on the card. Saving updates this same card.
          </p>
          <button type="button" disabled={busy} onClick={() => void makeCard("", true)} className="hub-btn">
            {busy ? "Saving…" : "Save on this card"}
          </button>
        </div>
      ) : null}
      {cardUrl ? (
        <div className="space-y-3">
          <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
            <figure>
              <figcaption className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Front</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cardView || cardUrl} alt={`${companyName} business card front`} className="w-full rounded-xl border border-zinc-800" />
            </figure>
            {backUrl ? (
              <figure>
                <figcaption className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Back</figcaption>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={backView || backUrl} alt={`${companyName} business card back`} className="w-full rounded-xl border border-zinc-800" />
              </figure>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <a href={cardUrl} target="_blank" rel="noreferrer" className="text-indigo-300 hover:text-indigo-200">
              Open front
            </a>
            {backUrl ? (
              <a href={backUrl} target="_blank" rel="noreferrer" className="text-indigo-300 hover:text-indigo-200">
                Open back
              </a>
            ) : null}
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
                  setBackUrl("");
                  setPdfUrl("");
                  setCardView("");
                  setBackView("");
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
