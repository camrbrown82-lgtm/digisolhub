import { NextResponse } from "next/server";
import { requireHubSession } from "@/lib/auth";
import { brandFromClient, brandKitPrompt } from "@/lib/branding";
import { normalizeCampaignChannel } from "@/lib/campaignChannels";
import { normalizeContactAbVariant } from "@/lib/contactAbVariants";
import {
  findOrCreateContactForSend,
  getResendFrom,
  parseFromAddress,
  parseRecipientList,
  sendEmailToContact,
} from "@/lib/email";
import { getEmailLogoUrl } from "@/lib/emailLogo";
import { TEMPLATE_VARIABLES } from "@/lib/emailTemplates";
import { ensureCampaignChannelSchema } from "@/lib/ensureCampaignChannelSchema";
import {
  BRAND_COPY_TEMPERATURE,
  createOpenAIClient,
  getOpenAIApiKey,
  getOpenAITextModel,
} from "@/lib/openai";
import { resolveClientId, getWorkspaceClient } from "@/lib/workspace";

type SendMode = "personalized" | "bcc" | "ai_each";

type SendBody = {
  templateId?: string;
  contactId?: string;
  to?: string;
  segment?: "all" | "tag" | "service";
  tag?: string;
  service?: string;
  campaignChannel?: string;
  abVariant?: string;
  subject?: string;
  html?: string;
  campaignName?: string;
  /** personalized = one email each with merge fields; bcc = one blast; ai_each = AI rewrite per CRM contact */
  mode?: SendMode;
  /** Also BCC these addresses on every personalized send */
  bccAlso?: string[] | string;
};

type ContactRow = {
  id: string;
  email: string;
  name?: string | null;
  company?: string | null;
  service?: string | null;
  notes_preview?: string | null;
  unsubscribed_at?: string | null;
};

async function personalizeForContact(input: {
  subject: string;
  body: string;
  companyName: string;
  brandPrompt: string;
  contact: ContactRow;
}) {
  const openai = createOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: getOpenAITextModel(),
    temperature: BRAND_COPY_TEMPERATURE,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You personalize one outbound email for a single CRM contact while staying inside this brand kit.

${input.brandPrompt}

Return JSON only: {"subject":"...","body":"..."}.
Keep merge tags exact when useful: ${TEMPLATE_VARIABLES.join(", ")}.
Use the contact's real name/company in the prose when known. Stay 80-140 words. Soft CTA. No HTML unless already present.
Do not invent invoices, prices, or false claims.`,
      },
      {
        role: "user",
        content: `Brand company: ${input.companyName}
Contact name: ${input.contact.name || "(unknown)"}
Contact email: ${input.contact.email}
Contact company: ${input.contact.company || "(unknown)"}
Contact service/industry: ${input.contact.service || "(unknown)"}
Contact notes: ${input.contact.notes_preview || "(none)"}

Base subject:
${input.subject}

Base body:
${input.body}

Rewrite so this message feels written for this contact alone.`,
      },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(raw) as { subject?: string; body?: string };
  return {
    subject: parsed.subject?.trim() || input.subject,
    body: parsed.body?.trim() || input.body,
  };
}

export async function POST(request: Request) {
  const { supabase, error } = await requireHubSession();
  if (error) return error;

  let body: SendBody;
  try {
    body = (await request.json()) as SendBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    await ensureCampaignChannelSchema().catch(() => null);
    return await sendCampaign(supabase, body);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Send failed" },
      { status: 400 },
    );
  }
}

async function sendCampaign(
  supabase: Awaited<ReturnType<typeof requireHubSession>>["supabase"],
  body: SendBody,
) {
  if (!body.templateId && !body.html) {
    return NextResponse.json({ error: "Template or HTML is required" }, { status: 400 });
  }

  const mode: SendMode =
    body.mode === "bcc" || body.mode === "ai_each" ? body.mode : "personalized";

  const active = await getWorkspaceClient(supabase);
  const clientId = (await resolveClientId(supabase)) || active?.id || "";
  const { companyName, brand } = brandFromClient(active);
  const logoSrc = await getEmailLogoUrl(supabase, clientId || null);
  const contacts: ContactRow[] = [];

  if (body.to?.trim()) {
    const emails = parseRecipientList(body.to);
    if (emails.length === 0) {
      return NextResponse.json({ error: "Add at least one valid email" }, { status: 400 });
    }
    for (const email of emails) {
      const contact = await findOrCreateContactForSend(supabase, {
        email,
        clientId: clientId || null,
        companyName,
      });
      if (contact.unsubscribed_at) continue;
      // Enrich from CRM when present
      const { data: full } = await supabase
        .from("contacts")
        .select("id, email, name, company, service, notes_preview, unsubscribed_at")
        .eq("id", contact.id)
        .maybeSingle();
      contacts.push((full as ContactRow) || contact);
    }
  } else if (body.contactId) {
    let query = supabase
      .from("contacts")
      .select("id, email, name, company, service, notes_preview, unsubscribed_at")
      .eq("id", body.contactId);
    if (clientId) query = query.eq("client_id", clientId);
    const { data: scoped } = await query.maybeSingle();
    if (!scoped) {
      return NextResponse.json(
        { error: "That contact is not in the selected company" },
        { status: 400 },
      );
    }
    contacts.push(scoped);
  } else {
    let query = supabase
      .from("contacts")
      .select("id, email, name, company, service, notes_preview, unsubscribed_at")
      .is("unsubscribed_at", null);
    if (clientId) query = query.eq("client_id", clientId);

    if (body.segment === "tag" && body.tag) {
      query = query.contains("tags", [body.tag]);
    }
    if (body.segment === "service" && body.service) {
      query = query.eq("service", body.service);
    }
    const channel = normalizeCampaignChannel(body.campaignChannel);
    if (channel) query = query.eq("campaign_channel", channel);
    const ab = normalizeContactAbVariant(body.abVariant);
    if (ab) query = query.eq("ab_variant", ab);

    const { data, error: queryError } = await query;
    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 400 });
    }
    contacts.push(...(data ?? []));
  }

  if (contacts.length === 0) {
    return NextResponse.json({ error: "No matching contacts" }, { status: 400 });
  }

  if (body.templateId && (body.subject || body.html)) {
    await supabase
      .from("email_templates")
      .update({
        ...(body.subject ? { subject: body.subject } : {}),
        ...(body.html ? { html: body.html } : {}),
      })
      .eq("id", body.templateId);
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .insert({
      name: body.campaignName || "One-off send",
      template_id: body.templateId ?? null,
      segment: {
        mode: body.to?.trim()
          ? "recipients"
          : body.contactId
            ? "single"
            : body.segment ?? "all",
        to: body.to,
        tag: body.tag,
        service: body.service,
        campaignChannel: body.campaignChannel || null,
        abVariant: body.abVariant || null,
        sendMode: mode,
      },
      status: "sending",
      client_id: clientId || null,
    })
    .select("id")
    .single();

  const extraBcc = Array.from(
    new Set(
      (Array.isArray(body.bccAlso)
        ? body.bccAlso
        : typeof body.bccAlso === "string"
          ? parseRecipientList(body.bccAlso)
          : []
      )
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.includes("@")),
    ),
  );

  const results: {
    contactId: string;
    email?: string;
    ok: boolean;
    error?: string;
    personalized?: boolean;
  }[] = [];

  if (mode === "bcc") {
    // One message: first contact is To, everyone else (plus optional list) on BCC.
    const [primary, ...rest] = contacts;
    const bcc = [
      ...rest.map((row) => row.email),
      ...extraBcc.filter(
        (email) => email !== primary.email.trim().toLowerCase(),
      ),
    ];
    try {
      await sendEmailToContact({
        contactId: primary.id,
        contact: primary,
        db: supabase,
        templateId: body.templateId,
        subject: body.subject,
        html: body.html,
        campaignId: campaign?.id,
        companyName,
        logoSrc,
        clientId: clientId || null,
        brand,
        bcc,
      });
      // Record sends for BCC recipients for monitoring (same campaign).
      for (const contact of rest) {
        await supabase.from("sends").insert({
          campaign_id: campaign?.id ?? null,
          contact_id: contact.id,
          template_id: body.templateId ?? null,
          status: "sent",
          variant: null,
        });
      }
      results.push({ contactId: primary.id, email: primary.email, ok: true });
      for (const contact of rest) {
        results.push({ contactId: contact.id, email: contact.email, ok: true });
      }
    } catch (err) {
      results.push({
        contactId: primary.id,
        email: primary.email,
        ok: false,
        error: err instanceof Error ? err.message : "Send failed",
      });
    }
  } else {
    if (mode === "ai_each" && !getOpenAIApiKey()) {
      return NextResponse.json(
        {
          error:
            "AI personalize needs OPENAI_API_KEY. Use Personalized or BCC, or add the key in Vercel.",
        },
        { status: 503 },
      );
    }

    const brandPrompt = brandKitPrompt(companyName, brand, "copy");
    const maxAi = 25;
    const aiTargets = mode === "ai_each" ? contacts.slice(0, maxAi) : contacts;

    // Audit BCC once — not on every personalized copy (that floods one inbox + spam).
    let auditBccSent = false;

    for (const contact of aiTargets) {
      try {
        let subject = body.subject;
        let html = body.html;
        let personalized = false;
        if (mode === "ai_each") {
          const tailored = await personalizeForContact({
            subject: body.subject || "",
            body: body.html || "",
            companyName,
            brandPrompt,
            contact,
          });
          subject = tailored.subject;
          html = tailored.body;
          personalized = true;
        }
        const toEmail = contact.email.trim().toLowerCase();
        if (!toEmail.includes("@")) {
          results.push({
            contactId: contact.id,
            email: contact.email,
            ok: false,
            error: "Contact has no valid email",
          });
          continue;
        }
        const bccThisSend =
          !auditBccSent && extraBcc.length
            ? extraBcc.filter((email) => email !== toEmail)
            : [];
        await sendEmailToContact({
          contactId: contact.id,
          contact,
          db: supabase,
          templateId: body.templateId,
          subject,
          html,
          campaignId: campaign?.id,
          companyName,
          logoSrc,
          clientId: clientId || null,
          brand,
          bcc: bccThisSend,
        });
        if (bccThisSend.length) auditBccSent = true;
        results.push({
          contactId: contact.id,
          email: contact.email,
          ok: true,
          personalized,
        });
      } catch (err) {
        results.push({
          contactId: contact.id,
          email: contact.email,
          ok: false,
          error: err instanceof Error ? err.message : "Send failed",
        });
      }
    }

    if (mode === "ai_each" && contacts.length > maxAi) {
      results.push({
        contactId: contacts[maxAi].id,
        email: contacts[maxAi].email,
        ok: false,
        error: `AI personalize capped at ${maxAi} contacts this send. Re-run for the rest or use Personalized/BCC.`,
      });
    }
  }

  if (campaign?.id) {
    await supabase
      .from("campaigns")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaign.id);
  }

  const failed = results.filter((item) => !item.ok);
  const deliveredTo = results
    .filter((item) => item.ok && item.email)
    .map((item) => item.email as string);
  const from = parseFromAddress(getResendFrom());
  return NextResponse.json({
    campaignId: campaign?.id,
    mode,
    sent: results.filter((item) => item.ok).length,
    failed: failed.length,
    personalized: results.filter((item) => item.personalized).length,
    deliveredTo,
    auditBcc: mode === "bcc" ? extraBcc : extraBcc.slice(0, 1).length ? extraBcc : [],
    error: failed[0]?.error,
    from: from.email,
    results,
  });
}
