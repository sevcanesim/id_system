import { redirect } from "next/navigation";

/** Legacy compatibility route. Kart envanteri artık Ekip & Kartlar çalışma alanının parçası. */
export default function Page() {
  redirect("/kurumsal/panel/calisanlar#kart-envanteri");
}
