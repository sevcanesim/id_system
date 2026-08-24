import { Suspense } from "react";
import CorporatePanelGate from "./CorporatePanelGate";
import { PageLoadingView } from "../../components/ui/States";
import "./employee-action-first.css";

/**
 * Persistent corporate workspace shell.
 *
 * Management routes share CorporatePanelClient so the sidebar stays mounted.
 * /kurumsal/panel/kartim is the personal corporate card editor and must render
 * its own route children (CardWizard) instead of the management console.
 *
 * CorporatePanelClient calls useSearchParams; Next.js static generation
 * requires a Suspense boundary above that hook or every /kurumsal/panel/*
 * route (including /ayarlar) fails the production build.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoadingView label="Panel hazırlanıyor" />}>
      <CorporatePanelGate>{children}</CorporatePanelGate>
    </Suspense>
  );
}
