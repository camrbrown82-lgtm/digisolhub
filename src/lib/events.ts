import { inngest } from "@/inngest/client";

export type HubEventName =
  | "hub/lead.created"
  | "hub/tag.added"
  | "hub/email.opened"
  | "hub/workflow.run";

export async function emitHubEvent(
  name: HubEventName,
  data: Record<string, unknown>,
) {
  if (!process.env.INNGEST_EVENT_KEY && process.env.NODE_ENV === "production") {
    console.warn("INNGEST_EVENT_KEY missing; skipping", name);
    return;
  }
  try {
    await inngest.send({ name, data });
  } catch (error) {
    console.error("Inngest send failed", name, error);
  }
}
