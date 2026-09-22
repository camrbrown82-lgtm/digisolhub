import { redirect } from "next/navigation";

/** Overview removed — metrics live on Analytics. */
export default function HubHomePage() {
  redirect("/hub/analytics");
}
