import type { Metadata } from "next";

import { Suspense } from "react";
import CardWizard from "../../../olustur/CardWizard";

export const metadata: Metadata = {
  title: "Kartım | Yenomi Business",
  description: "Kurumsal panelinizde kendi dijital kart profilinizi yönetin.",
};

export default function CorporateMyCardPage() {
  return (
    <Suspense fallback={null}>
      <CardWizard />
    </Suspense>
  );
}
