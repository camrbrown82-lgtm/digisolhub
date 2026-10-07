"use client";

import { useRef, useState } from "react";
import { uploadHubFile } from "@/lib/hubUpload";
import { pieceHex, type LayoutPiece } from "@/lib/layoutPieces";

function isPicture(piece: LayoutPiece) {
  return piece.kind === "image" || piece.kind === "logo" || piece.kind === "emblem";
}

type PaintAs = "fill" | "text" | "button";
type Panel = "blocks" | "settings" | "type";

export function LayoutEditor({
  pieces,
  onChange,
  designWidth,
  designHeight,
  background,
  imageUrl,
  logoUrl,
  faces,
  color,
  highlight,
  palette,
  siteUrl,
  library,
  scales,
  onScale,
}: {
  pieces: LayoutPiece[];
  onChange: (next: LayoutPiece[]) => void;
  designWidth: number;
  designHeight: number;
  background?: string;
  imageUrl?: string;
  logoUrl?: string;
  faces?: string[];
  color?: string;
  highlight?: string;
  /** Working company's brand colours, shown before the colour wheel. */
  palette?: { name: string; value: string }[];
  /** Company website. Poster buttons open this. */
  siteUrl?: string;
  library?: { url: string; label: string }[];
  scales?: { id: string; label: string; value: number; min: number; max: number }[];
  onScale?: (id: string, value: number) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [face, setFace] = useState(faces?.[0] || "");
  const [selected, setSelected] = useState(pieces[0]?.id || "");
  const [guide, setGuide] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState("");
  const [paintAs, setPaintAs] = useState<PaintAs>("text");
  const [panel, setPanel] = useState<Panel>("blocks");
  const [picker, setPicker] = useState(false);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [customColour, setCustomColour] = useState("#4f46e5");
  const [editing, setEditing] = useState("");
  const shown = face ? pieces.filter((piece) => (piece.face || "") === face) : pieces;
  const active = pieces.find((piece) => piece.id === selected) || shown[0];
  const textColour = color || "#f4f4f5";
  const buttonColour = highlight || "#4f46e5";
  const swatches = (palette?.length
    ? palette
    : [
        { name: "Text", value: textColour },
        { name: "Highlight", value: buttonColour },
        { name: "Background", value: background || "#09090b" },
      ]
  ).filter((swatch) => pieceHex(swatch.value, "") );

  function bottomOf(piece: LayoutPiece) {
    return piece.y + (piece.size / designHeight) * 100;
  }

  function update(id: string, patch: Partial<LayoutPiece>) {
    onChange(pieces.map((piece) => (piece.id === id ? { ...piece, ...patch } : piece)));
  }

  function drag(id: string, event: React.PointerEvent) {
    if (editing === id) return;
    const frame = frameRef.current?.getBoundingClientRect();
    const piece = pieces.find((item) => item.id === id);
    if (!frame || !piece) return;
    const bounds = frame;
    const dragging = piece;
    event.preventDefault();
    const start = { px: event.clientX, py: event.clientY, x: dragging.x, y: dragging.y };
    const others = pieces.filter((item) => item.id !== id && (item.face || "") === (piece.face || ""));
    let moved = false;
    function move(next: PointerEvent) {
      if (Math.hypot(next.clientX - start.px, next.clientY - start.py) > 5) moved = true;
      let x = Math.min(96, Math.max(0, start.x + ((next.clientX - start.px) / bounds.width) * 100));
      let y = Math.min(96, Math.max(0, start.y + ((next.clientY - start.py) / bounds.height) * 100));
      const drop = (dragging.size / designHeight) * 100;
      let snapX: number | null = null;
      let snapY: number | null = null;
      for (const other of others) {
        if (isPicture(other)) continue;
        if (Math.abs(x - other.x) < 1.4) {
          x = other.x;
          snapX = other.x;
        }
        const otherBottom = other.y + (other.size / designHeight) * 100;
        if (Math.abs(y + drop - otherBottom) < 1.6) {
          y = otherBottom - drop;
          snapY = otherBottom;
        }
      }
      setGuide({ x: snapX, y: snapY });
      onChange(
        pieces.map((item) =>
          item.id === id ? { ...item, x: Math.round(x * 10) / 10, y: Math.round(Math.max(0, y) * 10) / 10 } : item,
        ),
      );
    }
    function up() {
      setGuide({ x: null, y: null });
      window.removeEventListener("pointermove", move);
      if (!moved && dragging.href && dragging.kind === "button") window.open(dragging.href, "_blank", "noopener,noreferrer");
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }

  function addPiece(kind: LayoutPiece["kind"]) {
    const id = `${kind}-${Date.now()}`;
    const piece: LayoutPiece = {
      id,
      label: kind === "button" ? "Button" : kind === "image" ? "Image" : kind === "divider" ? "Divider" : "Text",
      text: kind === "button" ? "Click here" : kind === "divider" ? "" : "Insert text here",
      size: kind === "button" ? 22 : kind === "divider" ? 8 : 28,
      x: 8,
      y: kind === "button" ? 72 : 36,
      face: face || undefined,
      weight: kind === "button" ? "semi" : "regular",
      italic: false,
      kind,
      href: kind === "button" ? siteUrl || "https://" : undefined,
      fill: kind === "button" ? buttonColour : kind === "divider" ? textColour : undefined,
      ink: kind === "button" ? "#ffffff" : undefined,
    };
    onChange([...pieces, piece]);
    setSelected(id);
    setPanel(kind === "button" ? "settings" : "type");
    if (kind === "image") setPicker(true);
  }

  function paint(hex: string) {
    if (!active || isPicture(active)) return;
    if (paintAs === "text") {
      update(active.id, active.kind === "button" ? { ink: hex } : { fill: hex });
      return;
    }
    if (active.kind === "button" || paintAs === "button") {
      update(active.id, {
        kind: active.kind === "text" ? "button" : active.kind,
        fill: hex,
        href: active.href || siteUrl || "https://",
        ink: active.ink || "#ffffff",
      });
      return;
    }
    update(active.id, { fill: hex });
  }

  async function addImages(list: FileList | null) {
    const chosen = Array.from(list ?? []).filter((file) => file.type.startsWith("image/")).slice(0, 4);
    if (!chosen.length) {
      setUploadNote("Choose an image.");
      return;
    }
    setUploading(true);
    setUploadNote("");
    try {
      const added: LayoutPiece[] = [];
      for (const file of chosen) {
        const saved = await uploadHubFile(file, "image");
        added.push(imagePiece(saved.url, saved.filename, added.length));
      }
      const withoutBlank = pieces.filter((piece) => !(piece.id === selected && piece.kind === "image" && !piece.src));
      onChange([...withoutBlank, ...added]);
      setSelected(added[0]?.id || "");
      setPicker(false);
    } catch (err) {
      setUploadNote(err instanceof Error ? err.message : "Could not add that image.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function imagePiece(src: string, label: string, index: number): LayoutPiece {
    return {
      id: `image-${Date.now()}-${index}`,
      label,
      text: label,
      kind: "image",
      src,
      size: Math.round(designHeight * 0.35),
      x: 8,
      y: 12,
      face: face || undefined,
      weight: "regular",
    };
  }

  function placeLibraryImage(src: string, label: string) {
    const blank = active?.kind === "image" && !active.src ? active.id : "";
    const next = blank
      ? pieces.map((piece) => (piece.id === blank ? { ...piece, src, label, text: label } : piece))
      : [...pieces, imagePiece(src, label, 0)];
    onChange(next);
    setPicker(false);
  }

  function removePiece(id: string) {
    onChange(pieces.filter((piece) => piece.id !== id));
    setSelected("");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-100 text-zinc-900">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Colours</span>
        {(["fill", "text", "button"] as PaintAs[]).map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setPaintAs(role)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
              paintAs === role ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
            }`}
          >
            {role}
          </button>
        ))}
        {swatches.map((swatch) => (
          <button
            key={swatch.name}
            type="button"
            title={swatch.name}
            onClick={() => paint(swatch.value)}
            className="flex items-center gap-1 rounded-full px-1.5 py-1 text-[11px] text-zinc-600 hover:bg-zinc-100"
          >
            <span className="h-3.5 w-3.5 rounded-full border border-black/20" style={{ background: swatch.value }} />
            {swatch.name}
          </button>
        ))}
        <label className="ml-1 flex items-center gap-1.5 border-l border-zinc-200 pl-2 text-[11px] text-zinc-600">
          <input
            type="color"
            aria-label="Pick another colour"
            value={pieceHex(customColour, "#4f46e5")}
            onChange={(event) => {
              setCustomColour(event.target.value);
              paint(event.target.value);
            }}
            className="h-7 w-7 cursor-pointer rounded-full border border-zinc-300 bg-transparent p-0"
          />
          Other
        </label>
        <span className="text-[11px] text-zinc-400">Select a block, then click a colour.</span>
      </div>

      <div className="flex min-h-[28rem]">
        <div className="relative min-w-0 flex-1 bg-zinc-200/80 p-6">
          {faces && faces.length > 1 ? (
            <div className="mb-3 flex gap-2">
              {faces.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFace(item)}
                  className={`rounded-full px-3 py-1 text-xs capitalize ${face === item ? "bg-zinc-900 text-white" : "bg-white text-zinc-600"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
          <div
            ref={frameRef}
            className="relative mx-auto max-w-xl overflow-hidden border border-dashed border-zinc-400 bg-white shadow-sm"
            style={{
              background: background || "#09090b",
              aspectRatio: `${designWidth} / ${designHeight}`,
              containerType: "size",
            }}
            onPointerDown={() => setSelected("")}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            {guide.y != null ? (
              <div className="pointer-events-none absolute left-0 right-0 z-20 border-t-2 border-indigo-500" style={{ top: `${guide.y}%` }} />
            ) : null}
            {guide.x != null ? (
              <div className="pointer-events-none absolute bottom-0 top-0 z-20 border-l-2 border-indigo-500" style={{ left: `${guide.x}%` }} />
            ) : null}
            {shown.map((piece) => {
              const chosen = active?.id === piece.id;
              return (
                <button
                  key={piece.id}
                  type="button"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    setSelected(piece.id);
                    setPanel(piece.kind === "button" ? "settings" : "type");
                    drag(piece.id, event);
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    if (!isPicture(piece) && piece.kind !== "divider") setEditing(piece.id);
                  }}
                  className={`absolute z-30 cursor-grab text-left leading-none ${isPicture(piece) ? "" : "max-w-[90%]"} ${
                    chosen ? "outline outline-1 outline-sky-500" : ""
                  }`}
                  style={{
                    left: `${piece.x}%`,
                    top: `${piece.y}%`,
                    fontSize: isPicture(piece) || piece.kind === "divider" ? undefined : `${(piece.size / designHeight) * 100}cqh`,
                    fontWeight: piece.weight === "bold" || piece.weight === "semi" ? 700 : 400,
                    fontStyle: piece.italic ? "italic" : "normal",
                    color: pieceHex(piece.kind === "button" ? piece.ink : piece.fill, piece.kind === "button" ? "#ffffff" : textColour),
                  }}
                >
                  {piece.kind === "image" && piece.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={piece.src} alt="" className="w-auto max-w-none" style={{ height: `${(piece.size / designHeight) * 100}cqh` }} />
                  ) : piece.kind === "logo" && logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="" className="w-auto" style={{ height: `${(piece.size / designHeight) * 100}cqh` }} />
                  ) : piece.kind === "button" ? (
                    <span
                      className="inline-block rounded-md px-[0.8em] py-[0.35em] font-semibold"
                      style={{ background: pieceHex(piece.fill, buttonColour), color: pieceHex(piece.ink, "#ffffff") }}
                    >
                      {editing === piece.id ? (
                        <input
                          autoFocus
                          value={piece.text}
                          onChange={(event) => update(piece.id, { text: event.target.value })}
                          onBlur={() => setEditing("")}
                          onPointerDown={(event) => event.stopPropagation()}
                          className="w-32 bg-transparent text-inherit outline-none"
                        />
                      ) : (
                        piece.text
                      )}
                    </span>
                  ) : piece.kind === "divider" ? (
                    <span className="block h-0.5 w-40" style={{ background: pieceHex(piece.fill, textColour) }} />
                  ) : editing === piece.id ? (
                    <input
                      autoFocus
                      value={piece.text}
                      onChange={(event) => update(piece.id, { text: event.target.value })}
                      onBlur={() => setEditing("")}
                      onPointerDown={(event) => event.stopPropagation()}
                      className="w-48 bg-white/90 text-inherit outline outline-1 outline-sky-500"
                    />
                  ) : (
                    piece.text
                  )}
                </button>
              );
            })}
          </div>
          {uploadNote ? <p className="mt-2 text-sm text-zinc-600">{uploadNote}</p> : null}
        </div>

        <aside className="flex w-56 shrink-0 flex-col border-l border-zinc-300 bg-zinc-800 text-zinc-100">
          <div className="flex justify-end gap-1 border-b border-zinc-700 p-2">
            {(
              [
                ["blocks", "Blocks"],
                ["type", "Type"],
                ["settings", "Settings"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                title={label}
                onClick={() => setPanel(id)}
                className={`rounded px-2 py-1 text-[11px] ${panel === id ? "bg-indigo-500 text-white" : "text-zinc-300 hover:bg-zinc-700"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 space-y-3 overflow-auto p-3 text-sm">
            {panel === "blocks" ? (
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["text", "Text"],
                    ["button", "Button"],
                    ["image", "Image"],
                    ["divider", "Divider"],
                  ] as const
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => addPiece(kind)}
                    className="rounded-lg border border-zinc-600 bg-zinc-900 px-2 py-4 text-xs hover:border-zinc-400"
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
            {panel === "type" && active && !isPicture(active) && active.kind !== "divider" ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Typography</p>
                <label className="block text-xs text-zinc-300">
                  Words
                  <textarea
                    value={active.text}
                    rows={3}
                    onChange={(event) => update(active.id, { text: event.target.value })}
                    className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm text-white"
                  />
                </label>
                <label className="block text-xs text-zinc-300">
                  Font size {active.size}px
                  <input
                    type="range"
                    min={10}
                    max={96}
                    value={active.size}
                    onChange={(event) => update(active.id, { size: Number(event.target.value) })}
                    className="mt-1 w-full"
                  />
                </label>
                <label className="block text-xs text-zinc-300">
                  Weight
                  <select
                    value={active.weight || "regular"}
                    onChange={(event) => update(active.id, { weight: event.target.value as LayoutPiece["weight"] })}
                    className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1"
                  >
                    <option value="regular">Normal</option>
                    <option value="semi">Semibold</option>
                    <option value="bold">Bold</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => update(active.id, { italic: !active.italic })}
                  className={`rounded px-2 py-1 text-xs italic ${active.italic ? "bg-indigo-500" : "border border-zinc-600"}`}
                >
                  Italic
                </button>
              </div>
            ) : null}
            {panel === "settings" && active ? (
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Settings for the selected item</p>
                {active.kind === "button" ? (
                  <label className="block text-xs text-zinc-300">
                    Link web address
                    <input
                      value={active.href || ""}
                      onChange={(event) => update(active.id, { href: event.target.value })}
                      className="mt-1 w-full rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm"
                    />
                  </label>
                ) : null}
                {isPicture(active) ? (
                  <label className="block text-xs text-zinc-300">
                    Size {active.size}
                    <input
                      type="range"
                      min={24}
                      max={Math.max(designWidth, designHeight, 160)}
                      value={active.size}
                      onChange={(event) => update(active.id, { size: Number(event.target.value) })}
                      className="mt-1 w-full"
                    />
                  </label>
                ) : null}
                <button type="button" onClick={() => removePiece(active.id)} className="text-xs text-rose-300">
                  Remove
                </button>
              </div>
            ) : null}
            {panel !== "blocks" && !active ? <p className="text-xs text-zinc-400">Select a block on the canvas.</p> : null}
            {scales?.length ? (
              <div className="space-y-2 border-t border-zinc-700 pt-3">
                {scales.map((scale) => (
                  <label key={scale.id} className="block text-xs text-zinc-300">
                    {scale.label} {scale.value}
                    <input
                      type="range"
                      min={scale.min}
                      max={scale.max}
                      value={scale.value}
                      onChange={(event) => onScale?.(scale.id, Number(event.target.value))}
                      className="mt-1 w-full"
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {picker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-600 bg-zinc-800 p-4 text-zinc-100 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-medium">Select image</p>
              <button type="button" onClick={() => setPicker(false)} className="text-sm text-zinc-300">
                Close
              </button>
            </div>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="mb-3 flex h-28 w-full items-center justify-center rounded-lg border border-dashed border-zinc-500 text-sm text-zinc-300"
            >
              {uploading ? "Adding…" : "Drop files here or click to upload"}
            </button>
            <div className="mb-3 flex gap-2">
              <input
                value={imageUrlDraft}
                onChange={(event) => setImageUrlDraft(event.target.value)}
                placeholder="https://…/image.jpg"
                className="min-w-0 flex-1 rounded border border-zinc-600 bg-zinc-900 px-2 py-1 text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  if (/^https?:\/\//i.test(imageUrlDraft.trim())) placeLibraryImage(imageUrlDraft.trim(), "Image");
                }}
                className="rounded bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-900"
              >
                Add image
              </button>
            </div>
            <ul className="max-h-48 space-y-2 overflow-auto">
              {(library || []).map((item) => (
                <li key={item.url}>
                  <button type="button" onClick={() => placeLibraryImage(item.url, item.label)} className="flex w-full items-center gap-2 rounded border border-zinc-600 px-2 py-1 text-left text-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt="" className="h-10 w-16 object-contain" />
                    <span className="truncate">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="sr-only"
        onChange={(event) => void addImages(event.target.files)}
      />
    </div>
  );
}
