"use client";

import CorporatePanelClient from "./CorporatePanelClient";
import { UnsavedChangesProvider } from "../../components/UnsavedChangesContext";

/**
 * Unified persistent workspace shell for ALL /kurumsal/panel/* routes.
 */
export default function CorporatePanelGate({ children }: { children: React.ReactNode }) {
  return (
    <UnsavedChangesProvider>
      <CorporatePanelClient>{children}</CorporatePanelClient>
    </UnsavedChangesProvider>
  );
}

