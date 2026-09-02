import type { ReactNode } from "react";
import AdminSecurityDock from "./components/AdminSecurityDock";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>
    <AdminSecurityDock />
    {children}
  </>;
}
