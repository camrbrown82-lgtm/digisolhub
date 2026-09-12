import { redirect } from "next/navigation";

export default function EmailTemplatePage({
  params,
}: {
  params: { id: string };
}) {
  redirect(`/hub/email?template=${params.id}`);
}
