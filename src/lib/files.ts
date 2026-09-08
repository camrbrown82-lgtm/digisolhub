export const FILE_KINDS = ["image", "datasheet", "related"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const FILE_KIND_LABELS: Record<FileKind, string> = {
  image: "Images",
  datasheet: "Data sheets",
  related: "Related files",
};

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tif", "tiff", "avif"]);
const DATASHEET_EXT = new Set(["pdf", "csv", "tsv", "xls", "xlsx", "ods", "numbers"]);

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export function extensionOf(filename: string) {
  return filename.split(".").pop()?.trim().toLowerCase() || "";
}

export function isFileKind(value: string): value is FileKind {
  return FILE_KINDS.includes(value as FileKind);
}

export function inferFileKind(filename: string, mimeType = ""): FileKind {
  const ext = extensionOf(filename);
  if (IMAGE_EXT.has(ext) || mimeType.startsWith("image/")) return "image";
  if (
    DATASHEET_EXT.has(ext) ||
    mimeType === "application/pdf" ||
    mimeType === "text/csv" ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel")
  ) {
    return "datasheet";
  }
  return "related";
}

export function safeDownloadName(filename: string) {
  const cleaned = filename.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
  return cleaned || "file";
}

export function uniqueZipName(used: Set<string>, filename: string) {
  const base = safeDownloadName(filename);
  if (!used.has(base.toLowerCase())) {
    used.add(base.toLowerCase());
    return base;
  }
  const ext = extensionOf(base);
  const stem = ext ? base.slice(0, -(ext.length + 1)) : base;
  let i = 2;
  let next = ext ? `${stem}-${i}.${ext}` : `${stem}-${i}`;
  while (used.has(next.toLowerCase())) {
    i += 1;
    next = ext ? `${stem}-${i}.${ext}` : `${stem}-${i}`;
  }
  used.add(next.toLowerCase());
  return next;
}
