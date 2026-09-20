import { DIGISOL_INSTAGRAM_URL } from "@/lib/site";

async function filesFromUrls(urls: string[]) {
  const files: File[] = [];
  const limited = urls.slice(0, 10);
  for (let index = 0; index < limited.length; index += 1) {
    const url = limited[index];
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const blob = await response.blob();
      const type = blob.type || "image/png";
      const ext = type.includes("jpeg") || type.includes("jpg") ? "jpg" : "png";
      files.push(
        new File([blob], `digisol-share-${index + 1}.${ext}`, { type }),
      );
    } catch {
      // skip unreachable assets
    }
  }
  return files;
}

/**
 * Instagram has no public web “compose” sharer like Facebook.
 * Best path: copy caption → Web Share sheet (mobile can pick Instagram) → open IG.
 */
export async function shareToInstagram(input: {
  caption: string;
  url?: string;
  imageUrls?: string[];
}): Promise<"shared" | "copied_opened"> {
  const caption = input.caption.trim();
  if (caption && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      // continue even if clipboard is blocked
    }
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      const data: ShareData = {
        text: caption,
        ...(input.url ? { url: input.url } : {}),
      };
      const imageUrls = (input.imageUrls || []).filter(Boolean);
      if (imageUrls.length > 0) {
        const files = await filesFromUrls(imageUrls);
        if (
          files.length > 0 &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files })
        ) {
          data.files = files;
        }
      }
      await navigator.share(data);
      return "shared";
    } catch (error) {
      // User cancelled or share unsupported — fall through to open Instagram.
      if (error instanceof DOMException && error.name === "AbortError") {
        return "copied_opened";
      }
    }
  }

  window.open(DIGISOL_INSTAGRAM_URL, "_blank", "noopener,noreferrer");
  return "copied_opened";
}
