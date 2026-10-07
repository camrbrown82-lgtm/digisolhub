"use client";

import { useState } from "react";
import { LayoutEditor } from "@/components/hub/LayoutEditor";
import { artworkPiece, withPosterButtonLinks, type LayoutPiece } from "@/lib/layoutPieces";

function startingPieces(
  initial: LayoutPiece[] | undefined,
  imageUrl: string,
  height: number,
  placeArtwork: boolean,
  siteUrl?: string,
) {
  const list = withPosterButtonLinks(initial ?? [], siteUrl);
  if (!placeArtwork || !imageUrl || list.some((piece) => piece.kind === "image")) return list;
  return [artworkPiece(imageUrl, height), ...list];
}

export function ImageTextEditor({
  imageUrl,
  replaceUrl,
  initialPieces,
  designWidth,
  designHeight,
  color,
  logoUrl,
  background,
  highlight,
  siteUrl,
  placeArtwork = true,
  onSaved,
}: {
  /** Artwork without the editable words. Becomes a layer you can resize or remove. */
  imageUrl: string;
  /** The one saved file. Later saves overwrite it. */
  replaceUrl?: string;
  initialPieces?: LayoutPiece[];
  designWidth: number;
  designHeight: number;
  color?: string;
  logoUrl?: string;
  background?: string;
  highlight?: string;
  /** Company website. Buttons on the poster open it. */
  siteUrl?: string;
  /** When a previous save removed the generated picture, leave it off. */
  placeArtwork?: boolean;
  onSaved?: (url: string) => void;
}) {
  const [pieces, setPieces] = useState<LayoutPiece[]>(() =>
    startingPieces(initialPieces, imageUrl, designHeight, placeArtwork, siteUrl),
  );
  const [baseDismissed, setBaseDismissed] = useState(false);
  const [logoSize, setLogoSize] = useState(96);
  const [showLogo, setShowLogo] = useState(false);
  const [frame, setFrame] = useState({ width: designWidth, height: designHeight });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function apply() {
    const ready = pieces.some(
      (piece) =>
        (piece.kind === "image" && piece.src) ||
        piece.kind === "logo" ||
        (piece.kind !== "emblem" && piece.kind !== "image" && piece.text.trim()),
    );
    if (!ready) {
      setStatus("Add a line or an image, then save it on this file.");
      return;
    }
    setBusy(true);
    setStatus("");
    const response = await fetch("/api/hub/compose-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl,
        replaceUrl: replaceUrl || imageUrl,
        width: frame.width,
        height: frame.height,
        color,
        background,
        highlight,
        omitBase: baseDismissed || pieces.some((piece) => piece.kind === "image"),
        logoUrl: pieces.some((piece) => piece.kind === "logo") ? logoUrl : "",
        pieces,
      }),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string; url?: string };
    setBusy(false);
    if (!response.ok || !result.url) {
      setStatus(result.error || "Could not save that text.");
      return;
    }
    onSaved?.(result.url);
    setStatus("Saved on this image.");
  }

  return (
    <div className="space-y-3">
      <img
        src={imageUrl}
        alt=""
        className="hidden"
        onLoad={(event) => {
          const width = event.currentTarget.naturalWidth;
          const height = event.currentTarget.naturalHeight;
          if (width > 0 && height > 0) {
            const nextHeight = Math.min(height, 1600);
            setFrame({ width: Math.min(width, 1600), height: nextHeight });
            setPieces((current) =>
              current.map((piece) =>
                piece.id === "artwork" && piece.size === designHeight ? { ...piece, size: nextHeight } : piece,
              ),
            );
          }
        }}
      />
      <LayoutEditor
        pieces={pieces}
        designWidth={frame.width}
        designHeight={frame.height}
        imageUrl={baseDismissed || pieces.some((piece) => piece.kind === "image") ? undefined : imageUrl}
        onChange={(next) => {
          if (pieces.some((piece) => piece.kind === "image") && !next.some((piece) => piece.id === "artwork")) {
            setBaseDismissed(true);
          }
          if (!next.some((piece) => piece.kind === "image")) setBaseDismissed(true);
          setPieces(next);
        }}
        logoUrl={logoUrl}
        color={color}
        highlight={highlight}
        siteUrl={siteUrl}
        library={[
          logoUrl ? { url: logoUrl, label: "Logo" } : null,
          imageUrl ? { url: imageUrl, label: "Artwork" } : null,
        ].filter((item): item is { url: string; label: string } => Boolean(item))}
        background={background || "#09090b"}
        scales={
          logoUrl
            ? [{ id: "logo", label: showLogo ? "Logo size" : "Logo size (slide to place it)", value: logoSize, min: 36, max: 280 }]
            : undefined
        }
        onScale={(_id, value) => {
          setShowLogo(true);
          setLogoSize(value);
          setPieces((current) => {
            const existing = current.find((piece) => piece.kind === "logo");
            const logo: LayoutPiece = {
              id: "logo",
              label: "Logo",
              text: "Logo",
              kind: "logo",
              size: value,
              x: existing?.x ?? 70,
              y: existing?.y ?? 4,
              weight: "regular",
            };
            return [...current.filter((piece) => piece.kind !== "logo"), logo];
          });
        }}
      />
      <p className="text-sm text-zinc-400">
        Select an image in the list and remove it. Saving updates this same file.
      </p>
      <button type="button" disabled={busy} onClick={() => void apply()} className="hub-btn">
        {busy ? "Saving…" : "Save on this image"}
      </button>
      {status ? <p className="text-sm text-zinc-400">{status}</p> : null}
    </div>
  );
}

export function PosterWithEditor({
  url,
  artUrl,
  pieces,
  alt,
  color,
  logoUrl,
  background,
  highlight,
  siteUrl,
  placeArtwork = true,
  designWidth = 1080,
  designHeight = 1350,
}: {
  url: string;
  artUrl?: string;
  pieces?: LayoutPiece[];
  alt: string;
  color?: string;
  logoUrl?: string;
  background?: string;
  highlight?: string;
  siteUrl?: string;
  placeArtwork?: boolean;
  designWidth?: number;
  designHeight?: number;
}) {
  const base = artUrl || url;
  return (
    <div aria-label={alt}>
    {artUrl || pieces?.some((piece) => piece.kind !== "image") ? null : (
      <p className="mb-2 text-sm text-zinc-500">
        Words painted into an older picture stay in that picture. Resize or remove it, and add your own.
      </p>
    )}
    <ImageTextEditor
      key={base}
      imageUrl={base}
      replaceUrl={url}
      initialPieces={pieces}
      designWidth={designWidth}
      designHeight={designHeight}
      color={color}
      logoUrl={logoUrl}
      background={background}
      highlight={highlight}
      siteUrl={siteUrl}
      placeArtwork={placeArtwork}
    />
    </div>
  );
}
