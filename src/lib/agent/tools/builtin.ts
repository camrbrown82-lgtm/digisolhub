import { registerAgentTool } from "@/lib/agent/tools/registry";
import { getCompanyProfile } from "@/lib/agent/tools/getCompanyProfile";
import { runWebsiteAuditTool } from "@/lib/agent/tools/runWebsiteAudit";
import { fetchAnalytics } from "@/lib/agent/tools/fetchAnalytics";
import { generateCampaignWorkflow } from "@/lib/agent/tools/generateCampaignWorkflow";
import { dispatchAutomatedEmail } from "@/lib/agent/tools/dispatchAutomatedEmail";

let registered = false;

/**
 * Phase 1 Master Agent tool registry.
 * Analytics → Branding → Campaigns → Integrations.
 */
export function ensureBuiltinAgentTools() {
  if (registered) return;
  registerAgentTool(getCompanyProfile);
  registerAgentTool(runWebsiteAuditTool);
  registerAgentTool(fetchAnalytics);
  registerAgentTool(generateCampaignWorkflow);
  registerAgentTool(dispatchAutomatedEmail);
  registered = true;
}
