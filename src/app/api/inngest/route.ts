import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/functions";

/** Competitive analysis steps (web search, report writing) can each take a minute or more. */
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
