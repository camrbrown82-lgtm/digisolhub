import type { AgentToolDefinition } from "@/lib/agent/types";
import { runWebsiteAudit } from "@/lib/agent/websiteAudit";

export const runWebsiteAuditTool: AgentToolDefinition = {
  name: "runWebsiteAudit",
  description:
    "Integrations/site tool. Triggers a performance + SEO check on a target URL and returns metrics, SEO fields, score, and prioritized issues. Prefer the Working-on company domain when the user does not specify a URL.",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description:
          "Absolute URL to audit. If omitted, uses the Working-on company domain from Supabase.",
      },
    },
    additionalProperties: false,
  },
  execute: async (args, ctx) => {
    let url = typeof args.url === "string" ? args.url.trim() : "";
    if (!url) {
      const { data: client } = await ctx.supabase
        .from("clients")
        .select("domain")
        .eq("id", ctx.clientId)
        .maybeSingle();
      const domain = client?.domain?.trim();
      if (!domain) throw new Error("url is required (no company domain on file)");
      url = domain.startsWith("http") ? domain : `https://${domain}`;
    }
    const audit = await runWebsiteAudit(url);
    return { section: "integrations", audit };
  },
};
