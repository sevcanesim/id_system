"use client";

import UserPanelShell from "../components/UserPanelShell";
import NetworkingPanel from "../kurumsal/panel/components/NetworkingPanel";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";

export default function IndividualLeadsPage() {
  async function token() {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
    return data.session?.access_token ?? null;
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
