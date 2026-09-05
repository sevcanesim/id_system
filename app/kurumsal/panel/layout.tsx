import { Suspense } from "react";
import "./employee-action-first.css";
import "./overview-polish.css";
import "./template-studio.css";
import "./card-inventory-separation.css";
import "./networking-inbox.css";
import "./corporate-consistency-pass.css";
import "./premium-ui-pass.css";
import "./team-management.css";
import "./content-history-polish.css";
import "./content-layout-v2.css";
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
