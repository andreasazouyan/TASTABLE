import { redirect } from "next/navigation";

/** Preferences are edited in the My Preferences section of the profile page. */
export default function PreferencesPage() {
  redirect("/profile#preferences");
}
