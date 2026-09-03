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
      activeKey="connections"
      eyebrow="BAĞLANTILAR"
      title="Bağlantılarım"
      description="Kartını tarayıp iletişim bilgilerini bırakan kişileri burada takip et. Network Mail ile her bağlantıya seçtiğin içerikte tek bir takip e-postası gönderebilirsin."
    >
      <NetworkingPanel view="leads" variant="individual" token={token} />
    </UserPanelShell>
  );
}
