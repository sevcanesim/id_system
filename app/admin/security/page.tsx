"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import styles from "./Security.module.css";

type Factor = { id: string; friendly_name?: string; status?: string; factor_type?: string };
type Enrollment = { factorId: string; qrCode: string; secret: string } | null;
type PageState = "loading" | "ready" | "unauthorized" | "error";

function safeNextPath() {
  if (typeof window === "undefined") return "/admin";
  const requested = new URLSearchParams(window.location.search).get("next") || "/admin";
  if (!requested.startsWith("/admin") || requested.startsWith("/admin/security")) return "/admin";
  return requested;
}

export default function AdminSecurityPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [factors, setFactors] = useState<Factor[]>([]);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const verifiedTotp = useMemo(() => factors.find((factor) => factor.factor_type === "totp" && factor.status === "verified") ?? null, [factors]);
  const secure = currentLevel === "aal2";

  async function load() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setPageState("unauthorized"); return; }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) { setPageState("unauthorized"); return; }

    const adminResponse = await fetch("/api/admin/security/status", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (adminResponse.status === 403) { setPageState("unauthorized"); return; }
    if (!adminResponse.ok) { setPageState("error"); return; }

    const [{ data: factorData, error: factorError }, { data: aalData, error: aalError }] = await Promise.all([
      supabase.auth.mfa.listFactors(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    if (factorError || aalError) {
      setMessage("Güvenlik bilgileri şu anda kontrol edilemiyor. Lütfen yeniden deneyin.");
      setPageState("error");
      return;
    }
    setFactors((factorData?.all ?? []) as Factor[]);
    setCurrentLevel(aalData.currentLevel);
    setPageState("ready");
  }

  useEffect(() => { void load(); }, []);

  async function enroll() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Yenomi ID Super Admin" });
    if (error || !data?.totp) {
      setMessage("Google Authenticator kurulumu başlatılamadı. Lütfen yeniden deneyin.");
      setBusy(false);
      return;
    }
    setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    setBusy(false);
  }

  async function verifyFactor(factorId: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const normalized = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(normalized)) {
      setMessage("Telefonunuzdaki 6 haneli doğrulama kodunu girin.");
      return;
    }

    setBusy(true);
    setMessage("");
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challengeData) {
      setMessage("Doğrulama başlatılamadı. Lütfen yeni kodla tekrar deneyin.");
      setBusy(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challengeData.id, code: normalized });
    if (verifyError) {
      setMessage("Kod doğrulanamadı. Google Authenticator'daki güncel kodu kontrol edin.");
      setBusy(false);
      return;
    }

    setCode("");
    setEnrollment(null);
    setMessage("Doğrulama tamamlandı. Yönetim ekranına yönlendiriliyorsunuz…");
    await load();
    setBusy(false);
    router.replace(safeNextPath());
    router.refresh();
  }

  async function removeFactor(factorId: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    if (!window.confirm("Google Authenticator korumasını kaldırmak istediğinize emin misiniz? Yönetim işlemleri için yeniden kurmanız gerekecek.")) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) setMessage("Google Authenticator kaldırılamadı. Lütfen yeniden deneyin.");
    else {
      setMessage("Google Authenticator kaldırıldı. Yönetim işlemleri için yeniden kurmanız gerekir.");
      await load();
    }
    setBusy(false);
  }

  if (pageState === "loading") return <main className={styles.page}><section className={styles.shell}><div className={styles.panel}>Hesap güvenliği kontrol ediliyor…</div></section></main>;
  if (pageState === "unauthorized") return <main className={styles.page}><section className={styles.shell}><div className={styles.panel}><h1>Yönetici girişi gerekli</h1><p>Bu güvenlik ekranı yalnızca yetkili yönetici hesabında kullanılabilir.</p><Link className={styles.primaryLink} href="/giris?next=%2Fadmin%2Fsecurity">Giriş yap</Link></div></section></main>;

  return <main className={styles.page} id="main-content">
    <section className={styles.shell}>
      <div className={styles.heading}>
        <div>
          <span className={styles.kicker}>YÖNETİCİ HESABI GÜVENLİĞİ</span>
          <h1>Hesabınızı güvenceye alın</h1>
          <p>Yönetim ekranlarına erişmek için telefonunuzdaki Google Authenticator ile ek bir doğrulama yapmanız gerekir. Kurulum yalnızca birkaç dakika sürer.</p>
        </div>
        <Link className={styles.back} href="/admin">Yönetim merkezine dön</Link>
      </div>

      {message && <div className={styles.message} role="status">{message}</div>}

      <section className={`${styles.securityStatus} ${secure ? styles.securityStatusSecure : ""}`}>
        <div className={styles.statusIcon} aria-hidden="true">{secure ? "✓" : "2"}</div>
        <div>
          <small>Google Authenticator</small>
          <strong>{secure ? "Koruma aktif" : verifiedTotp ? "Doğrulama bekleniyor" : "Henüz kurulmadı"}</strong>
          <p>{secure ? "Bu yönetici oturumu ek güvenlik doğrulamasıyla korunuyor." : verifiedTotp ? "Devam etmek için telefonunuzdaki 6 haneli kodu girin." : "Yönetim ekranlarına devam etmek için telefonunuzu bir kez eşleştirin."}</p>
        </div>
      </section>

      {!verifiedTotp && !enrollment && <section className={styles.panel}>
        <span className={styles.stepLabel}>1. ADIM</span>
        <h2>Google Authenticator'ı bağlayın</h2>
        <p>Telefonunuzda Google Authenticator uygulamasını açın. Bir sonraki ekranda göstereceğimiz QR kodu uygulamayla tarayacaksınız.</p>
        <button className={styles.primary} type="button" onClick={() => void enroll()} disabled={busy}>{busy ? "Hazırlanıyor…" : "Google Authenticator'ı Kur"}</button>
      </section>}

      {enrollment && <section className={styles.panel}>
        <span className={styles.stepLabel}>2. ADIM</span>
        <h2>QR kodu telefonunuzla tarayın</h2>
        <div className={styles.setupGrid}>
          <div className={styles.qrWrap}><img src={enrollment.qrCode} alt="Google Authenticator kurulum QR kodu" width={220} height={220} /></div>
          <ol className={styles.instructions}>
            <li><span>1</span><div><strong>Google Authenticator'ı açın</strong><p>Telefonunuzdaki uygulamayı başlatın.</p></div></li>
            <li><span>2</span><div><strong>+ düğmesine dokunun</strong><p>“QR kodu tara” seçeneğini seçin.</p></div></li>
            <li><span>3</span><div><strong>Bu QR kodu tarayın</strong><p>Telefonunuzda Yenomi ID hesabı oluşacaktır.</p></div></li>
            <li><span>4</span><div><strong>6 haneli kodu aşağıya yazın</strong><p>Kod yaklaşık 30 saniyede bir yenilenir.</p></div></li>
          </ol>
        </div>
        <details className={styles.manualSetup}><summary>QR kodu taranamıyor mu?</summary><p>Google Authenticator'da “Kurulum anahtarı gir” seçeneğini kullanın ve aşağıdaki anahtarı yalnızca kendi cihazınıza girin.</p><code>{enrollment.secret}</code></details>
        <label className={styles.codeField}>Telefonunuzdaki 6 haneli kod<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></label>
        <button className={styles.primary} type="button" onClick={() => void verifyFactor(enrollment.factorId)} disabled={busy}>{busy ? "Doğrulanıyor…" : "Doğrula ve Devam Et"}</button>
      </section>}

      {verifiedTotp && !secure && <section className={styles.panel}>
        <span className={styles.stepLabel}>SON ADIM</span>
        <h2>Telefonunuzdaki kodu girin</h2>
        <p>Google Authenticator'ı açın ve Yenomi ID için görünen güncel 6 haneli kodu yazın.</p>
        <label className={styles.codeField}>6 haneli doğrulama kodu<input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></label>
        <button className={styles.primary} type="button" onClick={() => void verifyFactor(verifiedTotp.id)} disabled={busy}>{busy ? "Doğrulanıyor…" : "Doğrula ve Yönetim Ekranına Geç"}</button>
      </section>}

      {verifiedTotp && secure && <section className={styles.success}>
        <div className={styles.successIcon} aria-hidden="true">✓</div>
        <div><strong>Hesabınız koruma altında</strong><p>Google Authenticator doğrulaması tamamlandı. Yönetim işlemlerine güvenli şekilde devam edebilirsiniz.</p></div>
        <Link className={styles.primaryLink} href={safeNextPath()}>Yönetim ekranına geç</Link>
      </section>}

      <section className={styles.notice}>
        <strong>Yönetici değişirse ne yapmalıyım?</strong>
        <p>Hesap başka bir yöneticiye devredilecekse önce bu cihazdaki Google Authenticator bağlantısını kaldırın. Yeni yönetici kendi telefonunda yeniden kurulum yapmalıdır. QR kodunu, kurulum anahtarını veya şifrenizi başka biriyle paylaşmayın.</p>
        {verifiedTotp && secure && <button type="button" className={styles.dangerText} onClick={() => void removeFactor(verifiedTotp.id)} disabled={busy}>Google Authenticator bağlantısını kaldır</button>}
      </section>
    </section>
  </main>;
}
