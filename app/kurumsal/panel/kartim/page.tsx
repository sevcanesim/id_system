import type { Metadata } from "next";

import { Suspense } from "react";
import CardWizard from "../../../olustur/CardWizard";
import { PageLoadingView } from "../../../components/ui/States";

export const metadata: Metadata = {
  title: "Kartım | Yenomi Business",
  description: "Kurumsal panelinizde kendi dijital kart profilinizi yönetin.",
};

export default function CorporateMyCardPage() {
  return (
    <Suspense fallback={<PageLoadingView label="Kartınız hazırlanıyor" />}>
      <CardWizard />
    </Suspense>
  );
}
