export type LayoutPiece = {
  id: string;
  label: string;
  text: string;
  size: number;
  /** Left edge, 0–100 percent of the frame. */
  x: number;
  /** Top of the line, 0–100 percent of the frame. */
  y: number;
  face?: string;
  weight?: "regular" | "semi" | "bold";
  italic?: boolean;
  kind?: "text" | "logo" | "emblem" | "image" | "button" | "divider";
  /** Public image for a picture piece. */
  src?: string;
  /** Where a button opens. */
  href?: string;
  /** Text colour, or a button's fill. */
  fill?: string;
  /** Label colour on a button. */
  ink?: string;
};

export function pieceHex(value: string | undefined, fallback: string) {
  const raw = (value || "").trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw) ? raw : fallback;
}

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function num(value: unknown, fallback: number, min: number, max: number) {
  const next = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.min(max, Math.max(min, next));
}

/** A company site address the poster button can open. */
export function posterButtonHref(siteUrl?: string) {
  const raw = (siteUrl || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}

function lineOpensSite(text: string, siteHref: string) {
  const line = text.trim();
  if (/^https?:\/\/|www\./i.test(line)) return true;
  try {
    const host = new URL(siteHref, "https://wwwdigisol.com").hostname.replace(/^www\./, "");
    if (host && line.toLowerCase().includes(host.replace(/^www\./, ""))) return true;
  } catch {
    /* a relative hub path has no host to match */
  }
  return /^(learn more|book|get started|contact|call|visit|shop|sign up|free audit|get your|schedule|see the site)\b/i.test(line);
}

function hrefForLine(text: string, siteHref: string) {
  const line = text.trim();
  if (/^https?:\/\//i.test(line)) return line.slice(0, 400);
  if (/^www\./i.test(line)) return `https://${line}`.slice(0, 400);
  return siteHref;
}

/** Turn a website line or a call-to-action into a button that opens the company site. */
export function withPosterButtonLinks(pieces: LayoutPiece[], siteUrl?: string) {
  const href = posterButtonHref(siteUrl);
  if (!href) return pieces;
  return pieces.map((piece) => {
    if (piece.kind === "image" || piece.kind === "logo" || piece.kind === "emblem") return piece;
    if (piece.kind === "button" && piece.href) return piece;
    if (!lineOpensSite(piece.text, href)) return piece;
    return {
      ...piece,
      kind: "button" as const,
      href: hrefForLine(piece.text, href),
      label: "Button",
      weight: piece.weight === "regular" ? ("semi" as const) : piece.weight,
    };
  });
}

/** The lines that belong on one image, stacked down the canvas. */
export function piecesFromCopy(lines: string[], siteUrl?: string): LayoutPiece[] {
  const href = posterButtonHref(siteUrl);
  const usable = lines
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0 && line.length <= 180)
    .slice(0, 8);
  return usable.map((text, index) => {
    const button = Boolean(href && lineOpensSite(text, href));
    return {
      id: `copy-${index + 1}`,
      label: button ? "Button" : index === 0 ? "Headline" : `Line ${index + 1}`,
      text: text.slice(0, 160),
      size: button ? 28 : index === 0 ? 56 : index === 1 ? 30 : 22,
      x: 8,
      y: 22 + index * 9,
      weight: button || index === 0 ? ("semi" as const) : ("regular" as const),
      kind: button ? ("button" as const) : ("text" as const),
      href: button ? hrefForLine(text, href) : undefined,
    };
  });
}

/** Headline, offers, the line above the award, and the website button, each in its own place. */
export function piecesFromRoles(
  lines: { role: "headline" | "sub" | "award" | "button"; text: string }[],
  siteUrl?: string,
): LayoutPiece[] {
  const href = posterButtonHref(siteUrl);
  let sub = 0;
  return lines
    .filter((line) => line.text.trim())
    .slice(0, 8)
    .map((line, index) => {
      const text = line.text.replace(/\s+/g, " ").trim().slice(0, 160);
      if (line.role === "headline") {
        return { id: `copy-${index + 1}`, label: "Headline", text, size: 40, x: 6, y: 12, weight: "semi" as const, kind: "text" as const };
      }
      if (line.role === "sub") {
        sub += 1;
        return {
          id: `copy-${index + 1}`,
          label: `Line ${sub}`,
          text,
          size: 24,
          x: 6,
          y: 18 + (sub - 1) * 6,
          weight: "regular" as const,
          kind: "text" as const,
        };
      }
      if (line.role === "award") {
        return { id: `copy-${index + 1}`, label: "Above award", text, size: 20, x: 6, y: 64, weight: "semi" as const, kind: "text" as const };
      }
      const link = /^https?:\/\//i.test(text) ? text : /^www\./i.test(text) ? `https://${text}` : href;
      const label = text.replace(/^https?:\/\//i, "").replace(/\/$/, "");
      return {
        id: `copy-${index + 1}`,
        label: "Button",
        text: label.slice(0, 40) || "Visit the site",
        size: 22,
        x: 6,
        y: 70,
        weight: "semi" as const,
        kind: "button" as const,
        href: link.slice(0, 400),
      };
    });
}

/** A picture the Images list can resize or remove. */
export function imagePiece(id: string, label: string, src: string, size: number, x: number, y: number): LayoutPiece {
  return {
    id,
    label,
    text: label,
    kind: "image",
    src,
    size: Math.min(1600, Math.max(24, Math.round(size))),
    x,
    y,
    weight: "regular",
  };
}

/** The generated picture, as a layer that can be resized or removed. */
export function artworkPiece(src: string, height: number): LayoutPiece {
  return {
    id: "artwork",
    label: "Artwork",
    text: "Artwork",
    kind: "image",
    src,
    size: Math.min(1600, Math.max(24, Math.round(height) || 1080)),
    x: 0,
    y: 0,
    weight: "regular",
  };
}

export function withArtworkPiece(pieces: LayoutPiece[], src: string, height: number) {
  if (!src || pieces.some((piece) => piece.id === "artwork" || (piece.kind === "image" && piece.src === src))) {
    return pieces;
  }
  return [artworkPiece(src, height), ...pieces];
}

export function parseLayoutPieces(raw: unknown, max = 16): LayoutPiece[] {
  if (!Array.isArray(raw)) return [];
  const pieces: LayoutPiece[] = [];
  for (const item of raw) {
    if (pieces.length >= max || !item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const kind =
      row.kind === "logo" ||
      row.kind === "emblem" ||
      row.kind === "image" ||
      row.kind === "button" ||
      row.kind === "divider"
        ? row.kind
        : "text";
    const text = clip(row.text, 160);
    const src = kind === "image" ? clip(row.src, 800) : "";
    const hrefRaw = clip(row.href, 400);
    const href = /^https?:\/\//i.test(hrefRaw) || hrefRaw.startsWith("/") ? hrefRaw : "";
    if ((kind === "text" || kind === "button") && !text) continue;
    if (kind === "image" && !/^https?:\/\//.test(src)) continue;
    const weight = row.weight === "bold" || row.weight === "semi" ? row.weight : "regular";
    pieces.push({
      id: clip(row.id, 40) || `line-${pieces.length + 1}`,
      label:
        clip(row.label, 40) ||
        (kind === "button"
          ? "Button"
          : kind === "divider"
            ? "Divider"
          : kind === "image"
            ? "Image"
            : kind === "emblem"
              ? "Center logo"
              : kind === "logo"
                ? "Logo"
                : `Line ${pieces.length + 1}`),
      text:
        text ||
        (kind === "divider"
          ? ""
          : kind === "image"
            ? "Image"
            : kind === "emblem"
              ? "Badge"
              : kind === "button"
                ? "Visit the site"
                : "Logo"),
      size: num(row.size, kind === "image" ? 320 : 18, kind === "image" ? 24 : 8, kind === "image" ? 1600 : 140),
      x: num(row.x, 4, 0, 100),
      y: num(row.y, 8, 0, 100),
      face: clip(row.face, 12) || undefined,
      weight,
      italic: row.italic === true,
      kind,
      src: src || undefined,
      href: kind === "button" ? href || undefined : undefined,
      fill: pieceHex(clip(row.fill, 7), "") || undefined,
      ink: pieceHex(clip(row.ink, 7), "") || undefined,
    });
  }
  return pieces;
}
