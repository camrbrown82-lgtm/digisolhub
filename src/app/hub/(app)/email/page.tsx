import Link from "next/link";
import { NewTemplateButton } from "@/components/hub/NewTemplateButton";
import { WorkspaceScope } from "@/components/hub/WorkspaceScope";
import { createClient } from "@/lib/supabase/server";
import { getActiveClient } from "@/lib/workspace";

export default async function EmailPage() {
  const supabase = await createClient();
  const active = await getActiveClient(supabase);
  let templatesQuery = supabase
    .from("email_templates")
    .select("id, name, subject, updated_at")
    .order("updated_at", { ascending: false });
  let campaignsQuery = supabase
    .from("campaigns")
    .select("id, name, status, sent_at")
    .order("created_at", { ascending: false })
    .limit(8);
  if (active) {
    templatesQuery = templatesQuery.eq("client_id", active.id);
    campaignsQuery = campaignsQuery.eq("client_id", active.id);
  }
  const { data: templates } = await templatesQuery;
  const { data: campaigns } = await campaignsQuery;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white">Email</h1>
          <WorkspaceScope companyName={active?.name} noun="templates" />
        </div>
        <NewTemplateButton />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Template</th>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {(templates ?? []).length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-zinc-500">
                  No templates yet.
                </td>
              </tr>
            ) : (
              (templates ?? []).map((template) => (
                <tr key={template.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3">
                    <Link
                      href={`/hub/email/${template.id}`}
                      className="text-white hover:text-indigo-300"
                    >
                      {template.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{template.subject}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Date(template.updated_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Recent campaigns</h2>
        <ul className="space-y-2 text-sm text-zinc-400">
          {(campaigns ?? []).length === 0 ? (
            <li>No campaigns sent yet.</li>
          ) : (
            (campaigns ?? []).map((campaign) => (
              <li key={campaign.id}>
                {campaign.name} · {campaign.status}
                {campaign.sent_at
                  ? ` · ${new Date(campaign.sent_at).toLocaleString()}`
                  : ""}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
