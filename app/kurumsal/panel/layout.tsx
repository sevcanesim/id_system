import CorporatePanelGate from "./CorporatePanelGate";

/**
 * Persistent corporate workspace shell.
 *
 * Management routes share CorporatePanelClient so the sidebar stays mounted.
 * /kurumsal/panel/kartim is the personal corporate card editor and must render
 * its own route children (CardWizard) instead of the management console.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <CorporatePanelGate>{children}</CorporatePanelGate>;
}
