import type { Metadata } from "next";
import { Suspense } from "react";
import CardWizard from "../../../olustur/CardWizard";
import styles from "../../../olustur/CardEditorLayout.module.css";
import { LoadingState } from "../../../components/ui/States";

export const metadata: Metadata = {
  title: "Kartım | Yenomi Business",
  description: "Kurumsal panelinizde kendi dijital kart profilinizi yönetin.",
};

export default function CorporateMyCardPage() {
  return (
    <div className={styles.editorSurface}>
      <Suspense
        fallback={
          <div className="corporate-route-loading">
            <LoadingState
              variant="panel"
              label="Kartınız hazırlanıyor"
              hint="Profil bilgileri ve canlı önizleme yükleniyor."
            />
          </div>
        }
      >
        <CardWizard />
      </Suspense>
    </div>
  );
}
