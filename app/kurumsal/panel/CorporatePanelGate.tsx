"use client";

import CorporatePanelClient from "./CorporatePanelClient";
import CorporateUtilityBar from "./CorporateUtilityBar";
import { UnsavedChangesProvider } from "../../components/UnsavedChangesContext";

/**
 * Unified persistent workspace shell for ALL /kurumsal/panel/* routes.
 */
export default function CorporatePanelGate({ children }: { children: React.ReactNode }) {
  return (
    <UnsavedChangesProvider>
      <CorporateUtilityBar />
      <CorporatePanelClient>{children}</CorporatePanelClient>
    </UnsavedChangesProvider>
  );
}

