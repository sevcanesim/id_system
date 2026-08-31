"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UserPanelShell from "../components/UserPanelShell";
import { Button, Card, Field, Input } from "../components/ui";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [securityMessage, setSecurityMessage] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase?.auth.getUser() || { data: { user: null } };
      if (cancelled) return;
      if (!data.user) {
        router.replace("/giris?next=%2Fayarlar");
        return;
      }
      setEmail(data.user.email || "");
      setName(String(data.user.user_metadata?.name || data.user.user_metadata?.full_name || ""));
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setSavingAccount(true);
    setAccountMessage("");

    const { error } = await supabase.auth.updateUser({
      email: email.trim(),
      data: { name: name.trim() },
    });

    setAccountMessage(
      error
        ? "Hesap bilgileri kaydedilemedi. E-posta adresini kontrol edip tekrar deneyin."
        : "Hesap bilgileriniz güncellendi. E-posta değiştiyse doğrulama bağlantısını gelen kutunuzdan onaylayın.",
    );
    setSavingAccount(false);
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase || password.trim().length < 8) return;
    setSavingPassword(true);
    setSecurityMessage("");

    const { error } = await supabase.auth.updateUser({ password });
    setSecurityMessage(
      error
        ? "Şifre güncellenemedi. En az 8 karakter kullandığınızdan emin olup tekrar deneyin."
        : "Şifreniz güncellendi.",
    );
    if (!error) setPassword("");
    setSavingPassword(false);
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    router.replace("/giris");
  }

  return (
    <UserPanelShell
      activeKey="settings"
      eyebrow="HESAP"
      title="Profil ve Ayarlar"
      description="Hesap bilgilerinizi, güvenliğinizi, oturumunuzu ve gizlilik bağlantılarını yönetin."
    >
      <div className="p9-settings-grid">
        <div className="p9-settings-main">
          <Card>
            <form onSubmit={saveAccount} noValidate>
              <h2 className="ds-card-title">Hesap bilgileri</h2>
              <p className="p9-section-copy">Giriş ve hesap iletişim bilgileriniz. E-posta değişikliğinde yeniden doğrulama istenebilir.</p>
              <div className="p9-form-grid">
                <Field label="Ad Soyad">
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    autoComplete="name"
                    enterKeyHint="next"
                  />
                </Field>
                <Field label="E-posta">
                  <Input
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    enterKeyHint="done"
                    required
                  />
                </Field>
              </div>
              {accountMessage && <div className="p9-message" role="status" aria-live="polite">{accountMessage}</div>}
              <div className="p9-settings-actions">
                <Button type="submit" variant="primary" disabled={savingAccount}>
                  {savingAccount ? "Kaydediliyor…" : "Hesap Bilgilerini Kaydet"}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <form onSubmit={savePassword}>
              <h2 className="ds-card-title">Güvenlik</h2>
              <p className="p9-section-copy">Şifrenizi hesap bilgilerinden bağımsız olarak güncelleyin.</p>
              <div className="p9-form-grid">
                <Field label="Yeni Şifre" help="En az 8 karakter">
                  <Input
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    enterKeyHint="done"
                    required
                  />
                </Field>
              </div>
              {securityMessage && <div className="p9-message" role="status" aria-live="polite">{securityMessage}</div>}
              <div className="p9-settings-actions">
                <Button type="submit" variant="primary" disabled={savingPassword || password.trim().length < 8}>
                  {savingPassword ? "Güncelleniyor…" : "Şifreyi Güncelle"}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <aside className="p9-settings-side">
          <Card>
            <h2 className="ds-card-title">Oturum</h2>
            <p className="p9-section-copy">Bu cihazdaki Yenomi ID oturumunuzu yönetebilirsiniz.</p>
            <div className="p9-session-row">
              <div>
                <strong>Mevcut oturum</strong>
                <span>Bu cihazda giriş yapılmış durumda.</span>
              </div>
              <Button onClick={signOut}>Çıkış Yap</Button>
            </div>
          </Card>
          <Card>
            <h2 className="ds-card-title">Gizlilik ve hesap</h2>
            <p className="p9-section-copy">Verileriniz ve hizmet koşullarıyla ilgili temel belgeler.</p>
            <ul className="p9-privacy-list">
              <li><Link href="/kvkk">KVKK Aydınlatma Metni</Link></li>
              <li><Link href="/gizlilik">Gizlilik Politikası</Link></li>
              <li><Link href="/iade-iptal">İade ve İptal Koşulları</Link></li>
            </ul>
          </Card>
        </aside>
      </div>
    </UserPanelShell>
  );
}
