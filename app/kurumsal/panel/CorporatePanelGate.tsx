"use client";

import { usePathname } from "next/navigation";
import CorporatePanelClient from "./CorporatePanelClient";

/**
 * Persistent management shell for /kurumsal/panel/* except Kartım.
 *
 * Kartım is the corporate card editor (CardWizard). The workspace layout
 * previously discarded route children, so /kurumsal/panel/kartim stayed on
 * the management console and never mounted the editor.
 */
export default function CorporatePanelGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/kurumsal/panel/kartim") return children;
  return <CorporatePanelClient />;
}
