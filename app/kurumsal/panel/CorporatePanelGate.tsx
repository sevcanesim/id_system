"use client";

import CorporatePanelClient from "./CorporatePanelClient";

/**
 * Unified persistent workspace shell for ALL /kurumsal/panel/* routes.
 */
export default function CorporatePanelGate({ children }: { children: React.ReactNode }) {
  return <CorporatePanelClient>{children}</CorporatePanelClient>;
}

