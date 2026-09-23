import type { ChatCompletionTool } from "openai/resources/chat/completions";

/**
 * OpenAI function-calling schemas for the Master Agent.
 * Names and parameters match the hub governance contract.
 */
export const MASTER_TOOL_SCHEMAS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getCompanyProfile",
      description:
        "Fetch brand rules for a company from Supabase: tone, voice, tagline, colors, words to avoid (dontSay), visual style/sizes, and logo notes. Always call before writing branded copy.",
      parameters: {
        type: "object",
        properties: {
          companyId: {
            type: "string",
            description: "Supabase clients.id for the company to load.",
          },
        },
        required: ["companyId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "runWebsiteAudit",
      description:
        "Scan a website URL, compile structural/SEO metrics (title, meta, H1, OG, HTTPS, TTFB), and return a scored performance report.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "Absolute URL to audit (https preferred).",
          },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fetchCompanyAnalytics",
      description:
        "Evaluate traffic, conversion signals, and weak points for a company using Hub site_events, CRM send metrics, lead pipeline, and DigiSol GA4 when available.",
      parameters: {
        type: "object",
        properties: {
          companyId: {
            type: "string",
            description: "Supabase clients.id whose analytics to fetch.",
          },
          days: {
            type: "integer",
            description: "Lookback window in days (7–30). Default 14.",
            minimum: 7,
            maximum: 30,
          },
        },
        required: ["companyId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generateCampaignWorkflow",
      description:
        "Build an A/B campaign structure from the company profile and contact segments: Variant A & B copy, channel (email/cold_call/etc.), audience percentage split, and DigiSol workflow graph. Does not send email.",
      parameters: {
        type: "object",
        properties: {
          companyId: {
            type: "string",
            description: "Supabase clients.id to plan for.",
          },
          campaignGoal: {
            type: "string",
            description: "Primary campaign goal / brief.",
          },
          channel: {
            type: "string",
            enum: [
              "email",
              "cold_call",
              "door_to_door",
              "facebook",
              "instagram",
              "linkedin",
              "mixed",
            ],
            description: "Primary outreach channel. Default email.",
          },
          audiencePercentA: {
            type: "integer",
            description: "Percent of audience for Variant A (10–90). Default 50.",
            minimum: 10,
            maximum: 90,
          },
          save: {
            type: "boolean",
            description: "If true, persist the workflow (enabled=false) and a draft campaign row.",
          },
        },
        required: ["companyId", "campaignGoal"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "dispatchEmailCampaign",
      description:
        "Coordinate with Resend to send personalized or bulk BCC emails for a campaign. Dry-run unless confirmSend=true. Caps recipients per call.",
      parameters: {
        type: "object",
        properties: {
          campaignId: {
            type: "string",
            description: "Supabase campaigns.id to send against.",
          },
          variantData: {
            type: "object",
            description: "Variant payload for this send.",
            properties: {
              mode: {
                type: "string",
                enum: ["personalized", "bcc"],
                description: "personalized = one email each; bcc = single blast.",
              },
              variant: {
                type: "string",
                enum: ["A", "B", "both"],
                description: "Which A/B arm to send. Default both when is_ab.",
              },
              subject: { type: "string" },
              html: { type: "string" },
              templateId: { type: "string" },
              templateAId: { type: "string" },
              templateBId: { type: "string" },
              confirmSend: {
                type: "boolean",
                description: "Must be true to actually fire Resend.",
              },
              limit: {
                type: "integer",
                description: "Max recipients this call (1–15).",
                minimum: 1,
                maximum: 15,
              },
            },
            required: ["mode"],
            additionalProperties: false,
          },
        },
        required: ["campaignId", "variantData"],
        additionalProperties: false,
      },
    },
  },
];

export type MasterToolName =
  | "getCompanyProfile"
  | "runWebsiteAudit"
  | "fetchCompanyAnalytics"
  | "generateCampaignWorkflow"
  | "dispatchEmailCampaign";
