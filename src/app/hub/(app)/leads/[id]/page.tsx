import { redirect } from "next/navigation";

export default function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Legacy lead URLs land on contacts; detail id may not map 1:1.
  void params;
  redirect("/hub/contacts");
}
