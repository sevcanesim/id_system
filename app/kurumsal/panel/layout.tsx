import CorporatePanelClient from "./CorporatePanelClient";

/**
 * Persistent corporate workspace shell.
 *
 * The navigation routes intentionally render no second panel instance. Keeping
 * the shell at the shared /kurumsal/panel layout level prevents the sidebar,
 * header and authenticated workspace from unmounting during route changes.
 */
export default function Layout({ children }: { children: React.ReactNode }) {
  void children;
  return <CorporatePanelClient />;
}
