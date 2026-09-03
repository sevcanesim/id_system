import { redirect } from "next/navigation";

/** Legacy plural route retained only for existing bookmarks. */
export default function MyCardsLegacyRoute() {
  redirect("/kartim");
}
