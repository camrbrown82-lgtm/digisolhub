import { assignAbVariants } from "@/lib/campaignAb";
import { brandKitPrompt } from "@/lib/branding";
import {
  BRAND_COPY_TEMPERATURE,
  createOpenAIClient,
  getOpenAIApiKey,
} from "@/lib/openai";
import { routeAgentModel } from "@/lib/agent/modelRouter";
import type { AgentToolDefinition } from "@/lib/agent/types";
import {
  WORKFLOW_BUILDER_SYSTEM_PROMPT,
  buildWorkflowUserPrompt,
  parseWorkflowAiResponse,
} from "@/lib/workflowAi";

type AbCopy = {
  subjectA: string;
  bodyA: string;
  subjectB: string;
  bodyB: string;
  hypothesis: string;
};

async function draftAbVariants(input: {
  companyName: string;
  brandPrompt: string;
  goal: string;
  audience: string;
  offer?: string;
}): Promise<AbCopy> {
  if (!getOpenAIApiKey()) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const openai = createOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: routeAgentModel("complex"),
    temperature: BRAND_COPY_TEMPERATURE,
    max_tokens: 1200,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You write A/B email variants for DigiSol Hub campaigns.
Stay inside this brand kit:
${input.brandPrompt}

Return JSON only:
{
  "subjectA":"...",
  "bodyA":"...",
  "subjectB":"...",
  "bodyB":"...",
  "hypothesis":"one sentence on what differs between A and B"
}
Rules: subjects 4–8 words; bodies 80–140 words plain text; soft CTA; start with "Hey {{name}}," when it fits; never invent prices or fake urgency.`,
      },
      {
        role: "user",
        content: `Company: ${input.companyName}
Goal: ${input.goal}
Audience segment: ${input.audience}
Offer / CTA: ${input.offer || "(soft consult booking)"}
Write two meaningfully different variants (angle or proof, not just synonyms).`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Partial<AbCopy>;
  return {
    subjectA: parsed.subjectA?.trim() || "Quick idea for you",
    bodyA: parsed.bodyA?.trim() || "Hey {{name}},\n\nWanted to share a clear next step.",
    subjectB: parsed.subjectB?.trim() || "One thing worth testing",
    bodyB: parsed.bodyB?.trim() || "Hey {{name}},\n\nA small change could lift replies.",
    hypothesis:
      parsed.hypothesis?.trim() ||
      "Variant B tests a sharper proof point vs Variant A's softer consult ask.",
  };
}

export const generateCampaignWorkflow: AgentToolDefinition = {
  name: "generateCampaignWorkflow",
  description:
    "Campaigns section tool. Reads the company profile, samples an audience segment from CRM contacts, designs a DigiSol Hub workflow graph, and writes A/B email variants. Set save=true to persist the workflow (disabled by default).",
  tasks: ["campaign_strategy", "site_workflow", "general", "email_draft"],
  parameters: {
    type: "object",
    properties: {
      goal: {
        type: "string",
        description: "Primary campaign goal.",
      },
      timeline: {
        type: "string",
        description: "Cadence hint, e.g. 7-day nurture.",
      },
      audience: {
        type: "string",
        description: "Audience description (also used if no tag filter).",
      },
      offer: {
        type: "string",
        description: "Offer / CTA.",
      },
      tag: {
        type: "string",
        description: "Optional CRM tag to sample audience from.",
      },
      triggerHint: {
        type: "string",
        description: "Preferred workflow trigger: new_lead | tag_added | email_opened.",
      },
      save: {
        type: "boolean",
        description: "If true, insert the workflow into Supabase (enabled=false).",
      },
    },
    required: ["goal"],
    additionalProperties: false,
  },
  execute: async (args, ctx) => {
    const goal = typeof args.goal === "string" ? args.goal.trim() : "";
    if (!goal) throw new Error("goal is required");
    if (!getOpenAIApiKey()) throw new Error("OPENAI_API_KEY is not configured");

    const tag = typeof args.tag === "string" ? args.tag.trim() : "";
    const audienceHint =
      (typeof args.audience === "string" && args.audience.trim()) ||
      (tag ? `Contacts tagged ${tag}` : "Working-on company CRM contacts");

    let contactQuery = ctx.supabase
      .from("contacts")
      .select("id, name, email, company, tags, service")
      .eq("client_id", ctx.clientId)
      .is("unsubscribed_at", null)
      .order("created_at", { ascending: false })
      .limit(40);

    const { data: contactRows, error: contactError } = await contactQuery;
    if (contactError) throw new Error(contactError.message);

    let contacts = contactRows ?? [];
    if (tag) {
      const needle = tag.toLowerCase();
      contacts = contacts.filter((row) => {
        const tags = Array.isArray(row.tags)
          ? row.tags.map((t) => String(t).toLowerCase())
          : [];
        return tags.some((t) => t.includes(needle));
      });
    }

    const sample = contacts.slice(0, 12);
    const abAssignment = assignAbVariants(sample, 50);
    const audienceSummary = {
      matched: contacts.length,
      sampled: sample.length,
      services: Array.from(
        new Set(sample.map((c) => c.service).filter(Boolean)),
      ).slice(0, 8),
      abSplitPreview: {
        A: sample.filter((c) => abAssignment.get(c.id) === "A").length,
        B: sample.filter((c) => abAssignment.get(c.id) === "B").length,
      },
      contacts: sample.map((c) => ({
        id: c.id,
        name: c.name,
        company: c.company,
        service: c.service,
        tags: c.tags ?? [],
        abVariant: abAssignment.get(c.id) || "A",
      })),
    };

    const openai = createOpenAIClient();
    const brandPrompt = brandKitPrompt(ctx.companyName, ctx.brand, "copy");

    const [workflowCompletion, abCopy] = await Promise.all([
      openai.chat.completions.create({
        model: routeAgentModel("complex"),
        temperature: 0.35,
        max_tokens: 1600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: WORKFLOW_BUILDER_SYSTEM_PROMPT },
          {
            role: "user",
            content: buildWorkflowUserPrompt({
              goal,
              timeline:
                typeof args.timeline === "string" ? args.timeline.trim() : undefined,
              audience: `${audienceHint} · ${contacts.length} subscribed contacts matched`,
              offer: typeof args.offer === "string" ? args.offer.trim() : undefined,
              triggerHint:
                typeof args.triggerHint === "string"
                  ? args.triggerHint.trim()
                  : undefined,
              companyName: ctx.companyName,
              notes: `Brand voice lock:\n${brandPrompt}`,
            }),
          },
        ],
      }),
      draftAbVariants({
        companyName: ctx.companyName,
        brandPrompt,
        goal,
        audience: audienceHint,
        offer: typeof args.offer === "string" ? args.offer.trim() : undefined,
      }),
    ]);

    const content = workflowCompletion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("AI returned an empty workflow");
    const plan = parseWorkflowAiResponse(content);

    let saved: { id: string; name: string; trigger: string } | null = null;
    if (args.save === true) {
      for (const tagRow of plan.tags) {
        const { data: existing } = await ctx.supabase
          .from("tags")
          .select("id, description")
          .ilike("name", tagRow.name)
          .maybeSingle();
        if (existing?.id) {
          if (tagRow.description) {
            await ctx.supabase
              .from("tags")
              .update({ description: tagRow.description })
              .eq("id", existing.id);
          }
        } else {
          await ctx.supabase.from("tags").insert({
            name: tagRow.name,
            description: tagRow.description || null,
            color: "#6366f1",
          });
        }
      }

      const { data, error } = await ctx.supabase
        .from("workflows")
        .insert({
          name: plan.name,
          trigger: plan.trigger,
          graph: plan.graph,
          enabled: false,
          client_id: ctx.clientId,
        })
        .select("id, name, trigger")
        .single();
      if (error) throw new Error(error.message);
      saved = data;
    }

    return {
      section: "campaigns",
      companyName: ctx.companyName,
      audience: audienceSummary,
      workflow: {
        name: plan.name,
        trigger: plan.trigger,
        summary: plan.summary,
        tags: plan.tags,
        graph: plan.graph,
        saved,
      },
      abVariants: abCopy,
      nextStep:
        "Review A/B copy, optionally save templates, then call dispatchAutomatedEmail with confirmSend=true when ready.",
    };
  },
};
