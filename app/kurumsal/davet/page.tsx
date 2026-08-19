"use client";

import { useEffect, useState } from "react";
import AppHeader from "../../components/AppHeader";
import AppFooter from "../../components/AppFooter";
import { Icon } from "../../icons";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import { acceptOrganizationInvite, OrganizationInviteResult } from "../../../lib/auth/organization-invite";

type InviteViewState = { status: "checking" } | OrganizationInviteResult;

export default function InvitePage() {
  const [state, setState] = useState<InviteViewState>({ status: "checking" });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const token = new URLSearchParams(window.location.search).get("token");
      const supabase = getSupabaseBrowserClient();
      const result = await acceptOrganizationInvite(supabase, token);
      if (!cancelled) setState(result);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main id="main-content" className="corporate-invite-page" data-ui-context="public">
      <AppHeader context="Kurumsal Davet" />
      <section className="corporate-invite-shell">
        <div className="corporate-invite-card" role="status" aria-live="polite">
          <span className="corporate-invite-kicker">KURUMSAL DAVET</span>

          {state.status === "checking" && <>
            <h1>Davet doğrulanıyor…</h1>
            <p>Bağlantını kontrol ediyoruz, bu birkaç saniye sürebilir.</p>
          </>}

          {state.status === "needs-login" && <>
            <h1>Önce giriş yapmalısın</h1>
            <p>Daveti kabul etmek için bu e-posta adresiyle giriş yap. Giriş yaptıktan sonra aynı bağlantıyı yeniden aç.</p>
            <a className="corporate-cta" href="/giris?portal=business">Kurumsal Girişe Git <span aria-hidden="true">→</span></a>
          </>}

          {state.status === "error" && <>
            <span className="corporate-invite-icon corporate-invite-icon-error" aria-hidden="true"><Icon name="alert" /></span>
            <h1>Davet kabul edilemedi</h1>
            <p>{state.message}</p>
            <a className="corporate-cta" href="/kurumsal/panel">Kurumsal Panele Git <span aria-hidden="true">→</span></a>
          </>}

          {state.status === "accepted" && <>
            <span className="corporate-invite-icon corporate-invite-icon-success" aria-hidden="true"><Icon name="check" /></span>
            <h1>Davet kabul edildi</h1>
            <p>Ekibin kurumsal alanına eklendin. Şimdi kurumsal kartını oluşturabilir ya da doğrudan panele geçebilirsin.</p>
            <div className="corporate-invite-actions">
              {state.organizationId && <a className="corporate-cta" href={`/olustur?business=1&new=1&organizationId=${state.organizationId}`}>Kurumsal Kartımı Oluştur <span aria-hidden="true">→</span></a>}
              <a className="corporate-secondary-cta" href="/kurumsal/panel">Kurumsal Panele Git</a>
            </div>
          </>}
        </div>
      </section>
      <AppFooter variant="compact" />
    </main>
  );
}
