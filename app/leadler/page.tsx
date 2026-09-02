"use client";

import UserPanelShell from "../components/UserPanelShell";
import NetworkingPanel from "../kurumsal/panel/components/NetworkingPanel";
import { getBrowserSession } from "../../lib/auth/get-browser-session";

export default function IndividualLeadsPage() {
  async function token() {
    const { accessToken } = await getBrowserSession();
    return accessToken;
  }

  return (
    <UserPanelShell
      activeKey="leads"
      eyebrow="NETWORKING"
      title="Network Mail"
      description="Kartından düşen kişilere 1 kredi = 1 follow-up gönder. Gönderen Yenomi ID’dir; yanıtlar doğrulanmış e-postana gelir."
    >
      <NetworkingPanel view="leads" variant="individual" token={token} />
    </UserPanelShell>
  );
}
