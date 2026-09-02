"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import styles from "./Security.module.css";

type Factor = { id: string; friendly_name?: string; status?: string; factor_type?: string };
type Enrollment = { factorId: string; qrCode: string; secret: string } | null;

type PageState = "loading" | "ready" | "unauthorized" | "error";

export default function AdminSecurityPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [factors, setFactors] = useState<Factor[]>([]);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [nextLevel, setNextLevel] = useState<string | null>(null);
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
    if (factorError || aalError) { setMessage(factorError?.message || aalError?.message || "MFA bilgisi okunamadı."); setPageState("error"); return; }
    setFactors((factorData?.all ?? []) as Factor[]);
    setCurrentLevel(aalData.currentLevel);
    setNextLevel(aalData.nextLevel);
    setPageState("ready");
  }

  useEffect(() => { void load(); }, []);

  async function enroll() {
    const supabase = getSupabaseBrowserClient(); if (!supabase) return;
    setBusy(true); setMessage("");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Yenomi ID Super Admin" });
    if (error || !data?.totp) { setMessage(error?.message || "Authenticator kurulumu başlatılamadı."); setBusy(false); return; }
    setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    setBusy(false);
  }

  async function verifyFactor(factorId: string) {
    const supabase = getSupabaseBrowserClient(); if (!supabase) return;
    const normalized = code.replace(/\s/g, "");
    if (!/^\d{6}$/.test(normalized)) { setMessage("Google Authenticator'daki 6 haneli kodu girin."); return; }
    setBusy(true); setMessage("");
    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challengeData) { setMessage(challengeError?.message || "Doğrulama isteği oluşturulamadı."); setBusy(false); return; }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challengeData.id, code: normalized });
    if (verifyError) { setMessage(verifyError.message || "Kod doğrulanamadı."); setBusy(false); return; }
    setCode(""); setEnrollment(null); setMessage("Google Authenticator doğrulandı. Super Admin oturumu artık AAL2 seviyesinde.");
    await load();
    setBusy(false);
  }

  async function removeFactor(factorId: string) {
    const supabase = getSupabaseBrowserClient(); if (!supabase) return;
    if (!window.confirm("Google Authenticator faktörünü kaldırmak istediğinize emin misiniz?")) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) setMessage(error.message || "Authenticator kaldırılamadı.");
    else { setMessage("Authenticator faktörü kaldırıldı."); await load(); }
    setBusy(false);
  }

  if (pageState === "loading") return <main className={styles.page}><section className={styles.shell}><div className={styles.panel}>Güvenlik durumu kontrol ediliyor…</div></section></main>;
  if (pageState === "unauthorized") return <main className={styles.page}><section className={styles.shell}><div className={styles.panel}><h1>Super Admin yetkisi gerekli</h1><p>Bu alan yalnızca Super Admin hesabı için kullanılabilir.</p><Link href="/giris">Giriş yap</Link></div></section></main>;

  return <main className={styles.page} id="main-content">
    <section className={styles.shell}>
      <div className={styles.heading}>
        <div><span className={styles.kicker}>SUPER ADMIN GÜVENLİĞİ</span><h1>Google Authenticator</h1><p>Super Admin işlemlerinde parola oturumuna ek olarak TOTP doğrulaması zorunludur. Google Authenticator, Microsoft Authenticator veya standart TOTP uygulamaları kullanılabilir.</p></div>
        <Link className={styles.back} href="/admin">Satış merkezine dön</Link>
      </div>

      {message && <div className={styles.message} role="status">{message}</div>}

      <div className={styles.statusGrid}>
        <article><small>Mevcut güvenlik seviyesi</small><strong>{currentLevel?.toUpperCase() || "—"}</strong><span>{secure ? "İkinci faktör doğrulandı" : "İkinci faktör doğrulaması gerekli"}</span></article>
        <article><small>Sonraki seviye</small><strong>{nextLevel?.toUpperCase() || "—"}</strong><span>{verifiedTotp ? "Authenticator kayıtlı" : "Authenticator henüz kayıtlı değil"}</span></article>
      </div>

      {!verifiedTotp && !enrollment && <section className={styles.panel}><h2>1. Authenticator ekle</h2><p>Google Authenticator uygulamasında yeni hesap eklemek için bir QR kod oluşturulur. QR kodu yalnızca bu kurulum sırasında gösterin; ekran görüntüsünü veya secret anahtarını paylaşmayın.</p><button className={styles.primary} type="button" onClick={() => void enroll()} disabled={busy}>{busy ? "Hazırlanıyor…" : "QR Kod Oluştur"}</button></section>}

      {enrollment && <section className={styles.panel}><h2>2. QR kodu tara</h2><div className={styles.enrollment}><img src={enrollment.qrCode} alt="Yenomi ID Super Admin Google Authenticator QR kodu" width={220} height={220} /><div><p>Google Authenticator → <strong>+</strong> → <strong>QR kodu tara</strong>.</p><details><summary>QR taranamıyorsa kurulum anahtarını göster</summary><code>{enrollment.secret}</code></details></div></div><label className={styles.codeField}>6 haneli doğrulama kodu<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></label><button className={styles.primary} type="button" onClick={() => void verifyFactor(enrollment.factorId)} disabled={busy}>{busy ? "Doğrulanıyor…" : "Kurulumu Doğrula"}</button></section>}

      {verifiedTotp && !secure && <section className={styles.panel}><h2>Authenticator doğrulaması gerekli</h2><p>Bu tarayıcıdaki oturum henüz AAL2 seviyesinde değil. Google Authenticator'da görünen güncel 6 haneli kodu girin.</p><label className={styles.codeField}>6 haneli kod<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></label><button className={styles.primary} type="button" onClick={() => void verifyFactor(verifiedTotp.id)} disabled={busy}>{busy ? "Doğrulanıyor…" : "Super Admin'i Doğrula"}</button></section>}

      {verifiedTotp && secure && <section className={styles.success}><div><strong>Super Admin koruması aktif</strong><p>Bu oturum AAL2 ile doğrulandı. Yönetim API'leri ikinci faktör doğrulaması olmadan çalışmaz.</p></div><button type="button" className={styles.danger} onClick={() => void removeFactor(verifiedTotp.id)} disabled={busy}>Authenticator'ı Kaldır</button></section>}

      <section className={styles.notice}><strong>Devir güvenliği</strong><p>Super Admin hesabı devredilecekse Google Authenticator faktörü eski cihazdan kaldırılmalı ve yeni yönetici kendi cihazında yeniden kurmalıdır. QR kodu, TOTP secret'ı, şifre veya kurtarma bilgileri devir PDF'ine yazılmamalıdır.</p></section>
    </section>
  </main>;
}
