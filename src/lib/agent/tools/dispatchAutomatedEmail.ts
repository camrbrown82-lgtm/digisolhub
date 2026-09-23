import {
  findOrCreateContactForSend,
  getResendFrom,
  parseFromAddress,
  parseRecipientList,
  sendEmailToContact,
} from "@/lib/email";
import { getEmailLogoUrl } from "@/lib/emailLogo";
import type { AgentToolDefinition } from "@/lib/agent/types";

const AGENT_SEND_CAP = 15;

export const dispatchAutomatedEmail: AgentToolDefinition = {
  name: "dispatchAutomatedEmail",
  description:
    "Integrations/email tool. Sends via Resend using the Working-on brand. Modes: personalized (one email per contact with merge fields) or bcc (single blast). Dry-run by default — set confirmSend=true to actually fire. Caps at 15 recipients per agent call.",
  tasks: ["email_draft", "email_flare", "campaign_strategy", "general"],
  parameters: {
    type: "object",
    properties: {
      mode: {
        type: "string",
        enum: ["personalized", "bcc"],
        description: "personalized = one send each; bcc = one message with BCC list.",
      },
      subject: {
        type: "string",
        description: "Email subject (supports merge tags in personalized mode).",
      },
      html: {
        type: "string",
        description: "Email body HTML or plain text.",
      },
      templateId: {
        type: "string",
        description: "Optional email_templates id. Used when subject/html omitted.",
      },
      contactIds: {
        type: "array",
        items: { type: "string" },
        description: "CRM contact ids to send to.",
      },
      to: {
        type: "string",
        description: "Comma/space separated emails when not using contactIds.",
      },
      tag: {
        type: "string",
        description: "Optional audience tag filter when selecting from CRM.",
      },
      campaignId: {
        type: "string",
        description: "Optional campaign id to attach to send records.",
      },
      confirmSend: {
        type: "boolean",
        description: "Must be true to actually send. Otherwise returns a dry-run preview.",
      },
    },
    required: ["mode"],
    additionalProperties: false,
  },
  execute: async (args, ctx) => {
    const mode = args.mode === "bcc" ? "bcc" : "personalized";
    const confirmSend = args.confirmSend === true;
    const subject = typeof args.subject === "string" ? args.subject.trim() : "";
    const html = typeof args.html === "string" ? args.html.trim() : "";
    const templateId =
      typeof args.templateId === "string" ? args.templateId.trim() : "";
    const campaignId =
      typeof args.campaignId === "string" ? args.campaignId.trim() : "";
    const tag = typeof args.tag === "string" ? args.tag.trim() : "";

    if (!subject && !html && !templateId) {
      throw new Error("Provide subject+html or templateId");
    }

    type ContactRow = {
      id: string;
      email: string;
      name?: string | null;
      company?: string | null;
      unsubscribed_at?: string | null;
    };

    const contacts: ContactRow[] = [];
    const contactIds = Array.isArray(args.contactIds)
      ? args.contactIds.map((id) => String(id).trim()).filter(Boolean)
      : [];

    if (contactIds.length) {
      const { data, error } = await ctx.supabase
        .from("contacts")
        .select("id, email, name, company, unsubscribed_at")
        .eq("client_id", ctx.clientId)
        .in("id", contactIds.slice(0, AGENT_SEND_CAP));
      if (error) throw new Error(error.message);
      for (const row of data ?? []) {
        if (!row.unsubscribed_at) contacts.push(row);
      }
    } else if (typeof args.to === "string" && args.to.trim()) {
      for (const email of parseRecipientList(args.to).slice(0, AGENT_SEND_CAP)) {
        const contact = await findOrCreateContactForSend(ctx.supabase, {
          email,
          clientId: ctx.clientId,
          companyName: ctx.companyName,
        });
        if (!contact.unsubscribed_at) contacts.push(contact);
      }
    } else {
      let query = ctx.supabase
        .from("contacts")
        .select("id, email, name, company, unsubscribed_at, tags")
        .eq("client_id", ctx.clientId)
        .is("unsubscribed_at", null)
        .order("created_at", { ascending: false })
        .limit(AGENT_SEND_CAP * 3);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      let rows = data ?? [];
      if (tag) {
        const needle = tag.toLowerCase();
        rows = rows.filter((row) => {
          const tags = Array.isArray(row.tags)
            ? row.tags.map((t) => String(t).toLowerCase())
            : [];
          return tags.some((t) => t.includes(needle));
        });
      }
      contacts.push(...rows.slice(0, AGENT_SEND_CAP));
    }

    if (contacts.length === 0) {
      throw new Error("No subscribed recipients matched");
    }

    const capped = contacts.slice(0, AGENT_SEND_CAP);
    const from = parseFromAddress(getResendFrom());
    const preview = {
      section: "integrations",
      mode,
      confirmSend,
      from: from.email,
      recipientCount: capped.length,
      recipients: capped.map((c) => ({
        id: c.id,
        email: c.email,
        name: c.name,
      })),
      subject: subject || "(from template)",
      templateId: templateId || null,
      campaignId: campaignId || null,
    };

    if (!confirmSend) {
      return {
        ...preview,
        dryRun: true,
        message:
          "Dry run only. Re-call dispatchAutomatedEmail with the same payload and confirmSend=true to fire via Resend.",
      };
    }

    const logoSrc = await getEmailLogoUrl(ctx.supabase, ctx.clientId);
    const results: Array<{ contactId: string; email: string; ok: boolean; error?: string }> =
      [];

    if (mode === "bcc") {
      const [primary, ...rest] = capped;
      try {
        await sendEmailToContact({
          contactId: primary.id,
          contact: primary,
          db: ctx.supabase,
          subject: subject || undefined,
          html: html || undefined,
          templateId: templateId || undefined,
          campaignId: campaignId || null,
          companyName: ctx.companyName,
          brand: ctx.brand,
          clientId: ctx.clientId,
          logoSrc,
          bcc: rest.map((c) => c.email),
        });
        results.push({ contactId: primary.id, email: primary.email, ok: true });
        for (const row of rest) {
          results.push({ contactId: row.id, email: row.email, ok: true });
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
      for (const contact of capped) {
        try {
          await sendEmailToContact({
            contactId: contact.id,
            contact,
            db: ctx.supabase,
            subject: subject || undefined,
            html: html || undefined,
            templateId: templateId || undefined,
            campaignId: campaignId || null,
            companyName: ctx.companyName,
            brand: ctx.brand,
            clientId: ctx.clientId,
            logoSrc,
          });
          results.push({ contactId: contact.id, email: contact.email, ok: true });
        } catch (err) {
          results.push({
            contactId: contact.id,
            email: contact.email,
            ok: false,
            error: err instanceof Error ? err.message : "Send failed",
          });
        }
      }
    }

    const failed = results.filter((r) => !r.ok);
    return {
      ...preview,
      dryRun: false,
      sent: results.filter((r) => r.ok).length,
      failed: failed.length,
      results,
      error: failed[0]?.error,
    };
  },
};
