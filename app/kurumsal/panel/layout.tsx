import { Suspense } from "react";
import CorporatePanelGate from "./CorporatePanelGate";
import { PageLoadingView } from "../../components/ui/States";
import styles from "./PanelLayoutAudit.module.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.panelSurface}>
      <Suspense
        fallback={
          <PageLoadingView
            label="Kurumsal panel hazırlanıyor"
            hint="Çalışma alanı ve görünüm tercihleri yükleniyor."
          />
        }
      >
        <CorporatePanelGate>{children}</CorporatePanelGate>
      </Suspense>
    </div>
  );
}
