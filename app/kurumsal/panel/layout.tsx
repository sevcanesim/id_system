import { Suspense } from "react";
import CorporatePanelGate from "./CorporatePanelGate";
import { PageLoadingView } from "../../components/ui/States";
import "./analytics-polish.css";
import "./shell-chrome-fix.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
