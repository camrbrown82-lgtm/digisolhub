import OpenAI from "openai";

export function getOpenAIApiKey() {
  const raw = process.env.OPENAI_API_KEY ?? "";
  return raw.trim().replace(/^["']|["']$/g, "");
}

export function createOpenAIClient() {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
}

export function getOpenAITextModel() {
  return process.env.OPENAI_EMAIL_MODEL?.trim() || "gpt-4o-mini";
}

export const BRAND_COPY_TEMPERATURE = 0.35;
export const BRAND_VISUAL_TEMPERATURE = 0.3;

export function openaiErrorMessage(err: unknown) {
  const status =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status?: number }).status)
      : undefined;
  const message =
    err && typeof err === "object"
      ? (err as { error?: { message?: string }; message?: string }).error
          ?.message || (err as { message?: string }).message
      : undefined;
  const text = (message || "").trim();
  const lower = text.toLowerCase();

  if (status === 401 || lower.includes("unauthorized") || lower.includes("invalid api key") || lower.includes("incorrect api key")) {
    return "OpenAI returned unauthorized. Set a valid OPENAI_API_KEY in Vercel Production and .env.local. Create a secret key at platform.openai.com/api-keys.";
  }
  if (
    status === 403 ||
    lower.includes("must be verified") ||
    lower.includes("not eligible") ||
    lower.includes("does not have access")
  ) {
    return "This OpenAI account cannot use the selected image model. Set OPENAI_IMAGE_MODEL=dall-e-3 on Vercel, or verify the org for gpt-image-1.";
  }
  return text || "Image generation failed";
}

export function shouldFallbackImageModel(err: unknown) {
  const status =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status?: number }).status)
      : undefined;
  const message = openaiErrorMessage(err).toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    message.includes("unauthorized") ||
    message.includes("cannot use") ||
    message.includes("not found") ||
    message.includes("does not have access") ||
    message.includes("must be verified")
  );
}
