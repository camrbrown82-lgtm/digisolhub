import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify Resend (Svix) webhook signatures.
 * Set RESEND_WEBHOOK_SECRET from Resend → Webhooks → signing secret (whsec_…).
 */
export function verifyResendWebhookSignature(options: {
  payload: string;
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
}): { ok: boolean; error?: string } {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return { ok: false, error: "RESEND_WEBHOOK_SECRET is not configured" };
  }
  if (!options.svixId || !options.svixTimestamp || !options.svixSignature) {
    return { ok: false, error: "Missing Svix signature headers" };
  }

  const ts = Number(options.svixTimestamp);
  if (!Number.isFinite(ts)) {
    return { ok: false, error: "Invalid Svix timestamp" };
  }
  if (Math.abs(Date.now() / 1000 - ts) > 300) {
    return { ok: false, error: "Svix timestamp outside tolerance" };
  }

  let key: Buffer;
  if (secret.startsWith("whsec_")) {
    key = Buffer.from(secret.slice("whsec_".length), "base64");
  } else {
    key = Buffer.from(secret, "utf8");
  }

  const signedContent = `${options.svixId}.${options.svixTimestamp}.${options.payload}`;
  const expected = createHmac("sha256", key)
    .update(signedContent)
    .digest("base64");

  const signatures = options.svixSignature.split(" ");
  for (const part of signatures) {
    const [version, signature] = part.split(",");
    if (version !== "v1" || !signature) continue;
    try {
      const a = Buffer.from(signature);
      const b = Buffer.from(expected);
      if (a.length === b.length && timingSafeEqual(a, b)) {
        return { ok: true };
      }
    } catch {
      // continue
    }
  }

  return { ok: false, error: "Invalid Svix signature" };
}
