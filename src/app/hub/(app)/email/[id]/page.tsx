import { notFound } from "next/navigation";
import { TemplateEditor } from "@/components/hub/TemplateEditor";
import { createClient } from "@/lib/supabase/server";

export default async function EmailTemplatePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data: template } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!template) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-white">Edit template</h1>
      <TemplateEditor template={template} />
    </div>
  );
}
