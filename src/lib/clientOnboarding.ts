import type { SupabaseClient } from "@supabase/supabase-js";
import { recordClientWin } from "@/lib/clientWins";
import { emitHubEvent } from "@/lib/events";
import { DIGISOL_FOUNDER, DIGISOL_FOUNDER_TITLE, DIGISOL_GOOGLE_REVIEW_URL, DIGISOL_PHONE } from "@/lib/site";
import { CLIENT_TAG } from "@/lib/workflowGraph";
import { ensureDigisolClient } from "@/lib/workspace";

export const ONBOARDING_WORKFLOW_NAME = "Client onboarding";

const SIGNATURE = `<p>${DIGISOL_FOUNDER}<br/>${DIGISOL_FOUNDER_TITLE.replace("&", "&amp;")}, DigiSol · ${DIGISOL_PHONE}</p>`;

const TEMPLATES = [
  {
    name: "Onboarding 1 · Welcome",
    subject: "Welcome to DigiSol, {{name}}",
    html: `<p>Hi {{name}},</p>
<p>Thanks for signing up with DigiSol. I'm glad to have {{contact_company}} on board.</p>
<p>Here's what I'll set up for you first:</p>
<ul>
<li><strong>A full website audit</strong> covering speed, security and SEO, so we know exactly where things stand.</li>
<li><strong>Your analytics</strong>, so we can see what brings in visitors and leads.</li>
<li><strong>Your brand kit</strong>: colours, logo and voice, so everything we make looks and sounds like you.</li>
</ul>
<p>If there's something you want me to tackle first, just reply to this email. I read every reply myself.</p>
${SIGNATURE}`,
  },
  {
    name: "Onboarding 2 · Check-in",
    subject: "Quick check-in from DigiSol",
    html: `<p>Hi {{name}},</p>
<p>Just checking in. How's everything going so far?</p>
<p>If you could change one thing about your website or marketing right now, what would it be? Reply with a sentence or two and I'll make it a priority.</p>
${SIGNATURE}`,
  },
  {
    name: "Onboarding 3 · Feedback and review",
    subject: "How are we doing, {{name}}?",
    html: `<p>Hi {{name}},</p>
<p>It's been a couple of weeks since {{contact_company}} joined DigiSol, and I'd love your honest feedback. What's been useful, and what could be better? Just hit reply.</p>
<p>If you've been happy with the work so far, a quick Google review would mean a lot. It helps other local businesses find us and takes about 30 seconds.</p>
<p><a href="${DIGISOL_GOOGLE_REVIEW_URL}">Leave a quick review</a></p>
${SIGNATURE}`,
  },
];

/** DigiSol's "Client onboarding" workflow, created with editable starter emails the first time it's needed. */
export async function ensureOnboardingWorkflow(db: SupabaseClient, houseId: string) {
  const { data: existing } = await db
    .from("workflows")
    .select("id, enabled")
    .eq("client_id", houseId)
    .eq("name", ONBOARDING_WORKFLOW_NAME)
    .limit(1);
  if (existing?.length) return existing[0] as { id: string; enabled: boolean };

  const templateIds: string[] = [];
  for (const template of TEMPLATES) {
    const { data, error } = await db
      .from("email_templates")
      .insert({ ...template, client_id: houseId })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message || "Could not create onboarding emails");
    templateIds.push(data.id as string);
  }

  const steps = [
    { action: "send_template", templateId: templateIds[0], label: TEMPLATES[0].name },
    { action: "wait", duration: "3d", label: "Wait 3d" },
    { action: "send_template", templateId: templateIds[1], label: TEMPLATES[1].name },
    { action: "wait", duration: "11d", label: "Wait 11d" },
    { action: "send_template", templateId: templateIds[2], label: TEMPLATES[2].name },
    { action: "add_tag", tag: "onboarded", tagDescription: "Finished client onboarding emails", label: "Add tag: onboarded" },
  ];
  const nodes = [
    {
      id: "trigger",
      type: "trigger",
      position: { x: 160, y: 40 },
      data: { label: "New lead", trigger: "new_lead", audience: "clients" },
    },
    ...steps.map((data, i) => ({
      id: `step-${i + 1}`,
      type: "workflowStep",
      position: { x: 160, y: 160 + i * 120 },
      data,
    })),
  ];
  const edges = nodes.slice(1).map((node, i) => ({
    id: `e-${nodes[i].id}-${node.id}`,
    source: nodes[i].id,
    target: node.id,
  }));

  const { data: workflow, error } = await db
    .from("workflows")
    .insert({
      name: ONBOARDING_WORKFLOW_NAME,
      trigger: "new_lead",
      enabled: true,
      client_id: houseId,
      graph: { nodes, edges },
    })
    .select("id, enabled")
    .single();
  if (error || !workflow) throw new Error(error?.message || "Could not create the onboarding workflow");
  return workflow as { id: string; enabled: boolean };
}

/**
 * Adds a company's sign-up contact to DigiSol's contacts (tagged client), links it to the company's
 * won lead, and starts the Client onboarding emails.
 */
export async function signUpClientContact(
  db: SupabaseClient,
  input: { clientId: string; email: string; name?: string | null; startOnboarding?: boolean },
) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Add a valid contact email.");

  const houseId = await ensureDigisolClient(db);
  if (!houseId) throw new Error("DigiSol's workspace is missing.");
  const { data: company } = await db.from("clients").select("id, name").eq("id", input.clientId).maybeSingle();
  if (!company) throw new Error("Company not found.");

  const name = input.name?.trim() || null;
  const { data: found } = await db
    .from("contacts")
    .select("id, name, company, tags, unsubscribed_at")
    .eq("client_id", houseId)
    .ilike("email", email)
    .limit(1);
  let contact = found?.[0] ?? null;
  if (contact) {
    const tags = Array.from(new Set([...((contact.tags as string[] | null) ?? []), CLIENT_TAG]));
    await db
      .from("contacts")
      .update({ tags, company: company.name, ...(name && !contact.name ? { name } : {}) })
      .eq("id", contact.id);
  } else {
    const { data: created, error } = await db
      .from("contacts")
      .insert({
        email,
        name,
        company: company.name,
        source: "hub_client",
        client_id: houseId,
        tags: [CLIENT_TAG],
      })
      .select("id, name, company, tags, unsubscribed_at")
      .single();
    if (error || !created) throw new Error(error?.message || "Could not save the contact.");
    contact = created;
  }

  await recordClientWin(db, company.id, contact.id);

  let onboarding: "started" | "off" | "unsubscribed" | "skipped" = "skipped";
  if (input.startOnboarding !== false) {
    if (contact.unsubscribed_at) {
      onboarding = "unsubscribed";
    } else {
      const workflow = await ensureOnboardingWorkflow(db, houseId);
      if (!workflow.enabled) {
        onboarding = "off";
      } else {
        await emitHubEvent("hub/workflow.run", {
          workflowId: workflow.id,
          contactId: contact.id,
          automatic: true,
        });
        onboarding = "started";
      }
    }
  }
  return { contactId: contact.id as string, onboarding };
}
