import { redirect } from "next/navigation";

/** Workflows list lives on the combined Campaigns page. */
export default function WorkflowsIndexRedirect() {
  redirect("/hub/campaigns");
}
