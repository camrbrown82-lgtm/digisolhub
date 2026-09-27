import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = loadEnv(".env.local");
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const emails = ["digisol2026@yahoo.com", "cam.r.brown82@gmail.com"];

const { data: clients, error: clientErr } = await supabase
  .from("clients")
  .select("id, name")
  .order("created_at", { ascending: true })
  .limit(5);
if (clientErr) throw clientErr;
console.log("clients:", clients);
const clientId = clients?.[0]?.id;
if (!clientId) throw new Error("No clients row — pick a workspace in Hub first");

for (const email of emails) {
  const { data: existing } = await supabase
    .from("contacts")
    .select("id, email, name, tags, client_id")
    .ilike("email", email)
    .maybeSingle();

  if (!existing) {
    const { data: created, error } = await supabase
      .from("contacts")
      .insert({
        email,
        name: "Cameron Brown",
        company: "DigiSol",
        source: "manual",
        tags: ["operator", "self_test"],
        client_id: clientId,
      })
      .select("id, email, name, tags")
      .single();
    if (error) throw error;
    console.log("CREATED", created);
  } else {
    const tags = Array.from(
      new Set([...(existing.tags || []), "operator", "self_test"]),
    );
    const { data: updated, error } = await supabase
      .from("contacts")
      .update({
        name: existing.name || "Cameron Brown",
        company: "DigiSol",
        tags,
        client_id: existing.client_id || clientId,
      })
      .eq("id", existing.id)
      .select("id, email, name, tags")
      .single();
    if (error) throw error;
    console.log("UPDATED", updated);
  }
}

const { data: me } = await supabase
  .from("contacts")
  .select("id, email, name, company, tags, created_at")
  .or(
    "email.ilike.digisol2026@yahoo.com,email.ilike.cam.r.brown82@gmail.com",
  );
console.log("\n=== YOUR CONTACTS ===");
console.table(me);

const ids = (me || []).map((c) => c.id);
if (ids.length) {
  const { data: runs } = await supabase
    .from("workflow_runs")
    .select("id, workflow_id, contact_id, status, started_at, finished_at, log")
    .in("contact_id", ids)
    .order("started_at", { ascending: false })
    .limit(10);
  console.log("\n=== YOUR WORKFLOW RUNS ===");
  console.log(JSON.stringify(runs, null, 2));

  const { data: sends } = await supabase
    .from("sends")
    .select("id, contact_id, resend_id, status, created_at, template_id")
    .in("contact_id", ids)
    .order("created_at", { ascending: false })
    .limit(10);
  console.log("\n=== YOUR SENDS (linked to Resend) ===");
  console.log(JSON.stringify(sends, null, 2));
}

const { data: recentSends } = await supabase
  .from("sends")
  .select("id, contact_id, resend_id, status, created_at")
  .order("created_at", { ascending: false })
  .limit(15);
console.log("\n=== RECENT SENDS (any contact) ===");
console.log(JSON.stringify(recentSends, null, 2));
