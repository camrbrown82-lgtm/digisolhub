import type { AgentToolDefinition } from "@/lib/agent/types";
import { brandKitPrompt } from "@/lib/branding";

export const getCompanyProfile: AgentToolDefinition = {
  name: "getCompanyProfile",
  description:
    "Branding section tool. Pulls the Working-on company profile from Supabase: tone, voice, audience, doSay/dontSay, colors, logo notes. Call this before writing copy or campaigns.",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  execute: async (_args, ctx) => {
    const { data: client } = await ctx.supabase
      .from("clients")
      .select("id, name, domain, site_key, notes")
      .eq("id", ctx.clientId)
      .maybeSingle();

    return {
      section: "branding",
      companyName: ctx.companyName,
      clientId: ctx.clientId,
      domain: client?.domain || null,
      siteKey: client?.site_key || null,
      notes: client?.notes || null,
      profile: {
        tagline: ctx.brand.tagline,
        voice: ctx.brand.voice,
        audience: ctx.brand.audience,
        doSay: ctx.brand.doSay,
        dontSay: ctx.brand.dontSay,
        fonts: ctx.brand.fonts,
        visualStyle: ctx.brand.visualStyle,
        extra: ctx.brand.extra,
        colors: {
          background: ctx.brand.backgroundColor,
          text: ctx.brand.textColor,
          highlights: ctx.brand.highlightColor,
          primary: ctx.brand.primaryColor,
          secondary: ctx.brand.secondaryColor,
          accent: ctx.brand.accentColor,
        },
        logo: {
          url: ctx.brand.logoUrl || null,
          description: ctx.brand.logoDescription || null,
        },
      },
      brandKitPrompt: brandKitPrompt(ctx.companyName, ctx.brand, "copy"),
    };
  },
};
