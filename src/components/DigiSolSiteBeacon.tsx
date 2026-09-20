import { newSiteKey } from "@/lib/site-analytics";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { ensureDigisolClient, getDigisolClient } from "@/lib/workspace";

/**
 * First-party pageview beacon for DigiSol itself so Hub Analytics fills
 * even before GA4 Data API credentials are configured.
 */
export async function DigiSolSiteBeacon() {
  if (!hasAdminClient()) return null;

  try {
    const admin = createAdminClient();
    await ensureDigisolClient(admin);
    let client = await getDigisolClient(admin);
    if (!client) return null;

    if (!client.site_key) {
      const siteKey = newSiteKey();
      const { error } = await admin
        .from("clients")
        .update({ site_key: siteKey })
        .eq("id", client.id);
      if (error) return null;
      client = { ...client, site_key: siteKey };
    }

    const src = `/t.js?k=${encodeURIComponent(client.site_key)}`;
    return <script defer src={src} data-key={client.site_key} />;
  } catch {
    return null;
  }
}
