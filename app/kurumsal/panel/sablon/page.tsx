import { redirect } from "next/navigation";

/**
 * The company card standard now lives in Kartım, next to the personal card
 * fields it affects. Keep the former URL as a redirect for bookmarks.
 */
export default function Page() {
  redirect("/kurumsal/panel/kartim?business=1&brandSettings=1");
}
