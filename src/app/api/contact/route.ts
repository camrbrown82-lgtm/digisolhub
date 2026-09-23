import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getResendApiKey, getResendFrom } from "@/lib/email";
import { getWeb3FormsAccessKey } from "@/lib/supabase/env";
import { hasAdminClient, createAdminClient } from "@/lib/supabase/admin";
import { normalizeLead, upsertLead } from "@/lib/leads";
import { sendMetaLeadEvent } from "@/lib/meta/capi";
import { parseAttributionFromBody } from "@/lib/meta/attribution";
import { DIGISOL_SITE_URL } from "@/lib/site";
import { ensureMetaSchema } from "@/lib/ensureMetaSchema";
import { clientIp, rateLimit } from "@/lib/security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OWNER_EMAIL = "cam.r.brown82@gmail.com";

function str(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/** Honeypot filled = bot. Checkbox "on" from autofill tools also counts. */
function isHoneypotTriggered(body: Record<string, unknown>) {
  const botcheck = body.botcheck;
  if (botcheck === true || botcheck === 1) return true;
  if (typeof botcheck === "string" && botcheck.trim() !== "") return true;
  const decoy = str(body.website_url || body.company_website);
  return decoy.length > 0;
}

async function sendViaWeb3Forms(
  accessKey: string,
  fields: {
    name: string;
    email: string;
    company: string;
    service: string;
    message: string;
  },
) {
  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      access_key: accessKey,
      subject: "DigiSol consultation request",
      from_name: "DigiSol Website",
      name: fields.name,
      email: fields.email,
      replyto: fields.email,
      business: fields.company,
      service: fields.service,
      message: fields.message,
      to_notify: OWNER_EMAIL,
      // Never send honeypot fields — autofill tools trip Web3Forms spam.
    }),
  });

  let result: { success?: boolean; message?: string } = {};
  try {
    result = (await response.json()) as { success?: boolean; message?: string };
  } catch {
    result = { message: "Web3Forms returned a non-JSON response." };
  }

  return {
    ok: response.ok && Boolean(result.success),
    message: result.message || (response.ok ? "" : `HTTP ${response.status}`),
  };
}

async function sendViaResend(fields: {
  name: string;
  email: string;
  company: string;
  service: string;
  message: string;
}) {
  const apiKey = getResendApiKey();
  if (!apiKey) return { ok: false, message: "Resend is not configured." };

  const resend = new Resend(apiKey);
  const replyTo =
    process.env.RESEND_REPLY_TO?.trim() || fields.email || OWNER_EMAIL;
  const { error } = await resend.emails.send({
    from: getResendFrom(),
    to: [OWNER_EMAIL],
    replyTo,
    subject: `DigiSol consultation — ${fields.name || fields.email}`,
    text: [
      `Name: ${fields.name}`,
      `Email: ${fields.email}`,
      `Business: ${fields.company}`,
      `Service: ${fields.service}`,
      "",
      fields.message,
    ].join("\n"),
  });

  return {
    ok: !error,
    message: error?.message || "",
  };
}

export async function POST(request: Request) {
  const limited = rateLimit({
    key: `contact:${clientIp(request)}`,
    limit: 8,
    windowMs: 60_000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Silent success for bots — do not tip them off.
  if (isHoneypotTriggered(body)) {
    return NextResponse.json({ ok: true });
  }

  const fields = {
    name: str(body.name),
    email: str(body.email).toLowerCase(),
    company: str(body.company),
    service: str(body.service),
    message: str(body.message),
  };

  if (!fields.email.includes("@") || !fields.name) {
    return NextResponse.json(
      { error: "Name and a valid email are required." },
      { status: 400 },
    );
  }

  const accessKey = getWeb3FormsAccessKey();
  const deliveryErrors: string[] = [];
  let delivered = false;

  if (accessKey) {
    const web3 = await sendViaWeb3Forms(accessKey, fields);
    if (web3.ok) {
      delivered = true;
    } else {
      deliveryErrors.push(web3.message || "Web3Forms rejected the submission.");
      console.error("Web3Forms contact failure", web3.message);
    }
  } else {
    deliveryErrors.push("WEB3FORMS_ACCESS_KEY is not set.");
  }

  if (!delivered) {
    const resend = await sendViaResend(fields);
    if (resend.ok) {
      delivered = true;
    } else if (resend.message) {
      deliveryErrors.push(resend.message);
      console.error("Resend contact fallback failure", resend.message);
    }
  }

  let leadSaved = false;
  let contactId: string | undefined;
  const eventId =
    str(body.event_id) ||
    str(body.eventId) ||
    `lead_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const attribution = parseAttributionFromBody(body);

  if (hasAdminClient()) {
    try {
      const saved = await upsertLead(
        normalizeLead({
          ...body,
          ...fields,
          source: "web3forms",
          event_id: eventId,
          attribution,
          pin_house_client: true,
        }),
      );
      leadSaved = Boolean(saved.id);
      contactId = saved.id;
    } catch (error) {
      console.error("Lead ingest failed", error);
      deliveryErrors.push("Could not save lead to Hub.");
    }
  }

  // Server-side Meta Conversions API (deduped with browser Pixel via event_id).
  let capiOk = false;
  try {
    const forwarded = request.headers.get("x-forwarded-for") || "";
    const clientIp =
      forwarded.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const landing = attribution.landing_path;
    const eventSourceUrl =
      str(body.event_source_url) ||
      (landing
        ? `${DIGISOL_SITE_URL}${landing.startsWith("/") ? "" : "/"}${landing}`
        : `${DIGISOL_SITE_URL}/#contact`);
    const capi = await sendMetaLeadEvent({
      eventId,
      eventSourceUrl,
      user: {
        email: fields.email,
        phone: str(body.phone) || null,
        fbp: attribution.fbp,
        fbc: attribution.fbc,
        clientIpAddress: clientIp,
        clientUserAgent: request.headers.get("user-agent"),
      },
      customData: {
        content_name: "consultation_request",
        content_category: fields.service || undefined,
        utm_campaign: attribution.utm_campaign || undefined,
        utm_content: attribution.utm_content || undefined,
      },
    });
    capiOk = capi.ok;
    if (!capi.skipped && hasAdminClient()) {
      await ensureMetaSchema().catch(() => null);
      const admin = createAdminClient();
      await admin.from("meta_capi_events").upsert(
        {
          event_name: "Lead",
          event_id: eventId,
          contact_id: contactId || null,
          status: capi.ok ? "ok" : "error",
          error_message: capi.error || null,
          response: capi.raw || {},
        },
        { onConflict: "event_id" },
      );
    }
    if (!capi.ok && !capi.skipped) {
      console.error("Meta CAPI Lead failed", capi.error);
    }
  } catch (error) {
    console.error("Meta CAPI Lead exception", error);
  }

  if (!delivered && !leadSaved) {
    return NextResponse.json(
      {
        error:
          deliveryErrors[0] ||
          "Contact delivery is not configured. Set WEB3FORMS_ACCESS_KEY or RESEND_API_KEY on Vercel.",
      },
      { status: 503 },
    );
  }

  // Lead saved even if email provider failed — still treat as success for UX + FB Lead.
  return NextResponse.json({
    ok: true,
    delivered,
    leadSaved,
    eventId,
    capiOk,
    campaignChannel: attribution.campaign_channel,
  });
}
