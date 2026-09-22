import { redirect } from "next/navigation";

/** Leads folded into Contacts — pipeline stats stay on Analytics. */
export default function LeadsPage() {
  redirect("/hub/contacts");
}
