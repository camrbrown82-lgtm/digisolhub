import { readFileSync } from "fs";
import path from "path";
import { parse, type Font } from "opentype.js";

type Weight = "regular" | "semi";

const cache = new Map<Weight, Font>();

function load(file: "Inter-Regular.woff" | "Inter-SemiBold.woff") {
  const buf = readFileSync(path.join(process.cwd(), "src/lib/fonts", file));
  return parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

function font(weight: Weight) {
  const existing = cache.get(weight);
  if (existing) return existing;
  const parsed = load(weight === "semi" ? "Inter-SemiBold.woff" : "Inter-Regular.woff");
  cache.set(weight, parsed);
  return parsed;
}

export function textWidth(text: string, size: number, weight: Weight) {
  return font(weight).getAdvanceWidth(text, size);
}

export function fitSize(text: string, weight: Weight, maxWidth: number, start: number, min: number) {
  let size = start;
  while (size > min && textWidth(text, size, weight) > maxWidth) size -= 1;
  return size;
}

export function wrapToWidth(text: string, size: number, weight: Weight, maxWidth: number, maxLines: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && textWidth(next, size, weight) > maxWidth) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function n(value: number) {
  return Math.round(value * 10) / 10;
}

/**
 * SVG path for one line. `y` is the baseline.
 * TrueType curves are quadratics. They are converted to cubics so every SVG
 * renderer draws the whole word.
 */
export function textPath(text: string, x: number, y: number, size: number, weight: Weight, fill: string) {
  const path = font(weight).getPath(text, x, y, size);
  let d = "";
  let cx = 0;
  let cy = 0;
  for (const cmd of path.commands) {
    if (cmd.type === "M") {
      cx = cmd.x;
      cy = cmd.y;
      d += `M${n(cx)} ${n(cy)}`;
    } else if (cmd.type === "L") {
      cx = cmd.x;
      cy = cmd.y;
      d += `L${n(cx)} ${n(cy)}`;
    } else if (cmd.type === "C") {
      d += `C${n(cmd.x1)} ${n(cmd.y1)} ${n(cmd.x2)} ${n(cmd.y2)} ${n(cmd.x)} ${n(cmd.y)}`;
      cx = cmd.x;
      cy = cmd.y;
    } else if (cmd.type === "Q") {
      const x1 = cx + (2 / 3) * (cmd.x1 - cx);
      const y1 = cy + (2 / 3) * (cmd.y1 - cy);
      const x2 = cmd.x + (2 / 3) * (cmd.x1 - cmd.x);
      const y2 = cmd.y + (2 / 3) * (cmd.y1 - cmd.y);
      d += `C${n(x1)} ${n(y1)} ${n(x2)} ${n(y2)} ${n(cmd.x)} ${n(cmd.y)}`;
      cx = cmd.x;
      cy = cmd.y;
    } else {
      d += "Z";
    }
  }
  if (!d) return "";
  return `<path d="${d}" fill="${fill}"/>`;
}
