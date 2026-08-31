import type { ReactNode } from "react";
import DashboardShell from "../ui/DashboardShell";

type Action = { href?: string; label: string; primary?: boolean; onClick?: () => void; disabled?: boolean };

export default function UserPanelShell({
  title,
  description,
  eyebrow,
  children,
  actions = [],
  activeKey,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  children: ReactNode;
  actions?: Action[];
  activeKey?: string;
}) {
  return (
    <DashboardShell
      title={title}
      description={description}
      eyebrow={eyebrow}
      actions={actions}
      activeKey={activeKey}
    >
      {children}
    </DashboardShell>
  );
}
