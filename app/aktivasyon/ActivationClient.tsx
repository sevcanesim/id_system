"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { normalizeEmailField } from "../../lib/form-standards";
import { setCartOwner } from "../../lib/cart";

const ACTIVATION_TOKEN_KEY = "yenomi-activation-token";

function readHeldToken() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(ACTIVATION_TOKEN_KEY) || "";
}

function clearHeldToken() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ACTIVATION_TOKEN_KEY);
}

export default function ActivationClient() {
  const params = useSearchParams();
  const router = useRouter();
  const urlToken = params.get("token") || "";
  const [token, setToken] = useState(urlToken || readHeldToken());
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!urlToken) {
      setToken(readHeldToken());
      return;
    }
    window.sessionStorage.setItem(ACTIVATION_TOKEN_KEY, urlToken);
    setToken(urlToken);
    router.replace("/aktivasyon", { scroll: false });
  }, [router, urlToken]);

  useEffect(() => () => {
    setPassword("");
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      setMessage("Aktivasyon bağlantısı eksik. E-postandaki bağlantıyı kullan veya aşağıdan yeni bağlantı iste.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      let corporate = false;
      if (mode === "new") {
        const response = await fetch("/api/commerce/activate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, email, password }) });
        const data = await response.json() as { error?: string; corporate?: boolean };
        if (!response.ok) throw new Error(data.error || "Hesap oluşturulamadı.");
        corporate = Boolean(data.corporate);
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          const signedIn = await supabase.auth.signInWithPassword({ email, password });
          if (signedIn.data.user?.id) setCartOwner(signedIn.data.user.id, { claimGuest: true });
        }
      } else {
        const supabase = getSupabaseBrowserClient();
        if (!supabase) throw new Error("Giriş hizmeti yapılandırılamadı.");
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.session) throw new Error("E-posta veya şifre hatalı.");
        const response = await fetch("/api/commerce/claim", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ token }) });
        const payload = await response.json() as { error?: string; corporate?: boolean };
        if (!response.ok) throw new Error(payload.error || "Sipariş hesaba bağlanamadı.");
        corporate = Boolean(payload.corporate);
      }
      clearHeldToken();
      setPassword("");
      router.push(corporate ? "/kurumsal/panel" : "/kartlarim?legacy-activated=1");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Aktivasyon tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setResending(true);
    setMessage("");
    try {
      const response = await fetch("/api/commerce/activation/resend", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, orderNumber: orderNumber || undefined }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Bağlantı gönderilemedi.");
      setMessage(data.message || "Yeni bağlantı gönderildi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bağlantı gönderilemedi.");
    } finally {
      setResending(false);
    }
  }

  return <main id="main-content" className="activation-page p5-activation-page p6-activation-page"><AppHeader context="Sipariş Aktivasyonu" /><section className="activation-shell">
    <span className="section-kicker">HESABI BAĞLA</span><h1>Siparişini hesabına bağla.</h1><p>Misafir satın almalarda hak, e-postandaki bağlantı ile hesaba bağlanır. Kurumsal pakette şirket paneli açılır; bireyselde dijital kartvizit hakkın tanımlanır. Girişli satın almalarda hak otomatik tanımlanır.</p>
    {token ? (
      <>
        <div className="activation-tabs"><button className={mode === "new" ? "active" : ""} onClick={() => setMode("new")}>Yeni hesap</button><button className={mode === "existing" ? "active" : ""} onClick={() => setMode("existing")}>Mevcut hesabım</button></div>
        <form onSubmit={submit} autoComplete="off"><label>E-posta<input required type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setEmail(normalizeEmailField(email))} placeholder="ornek@mail.com" /></label><label>Şifre<input required type="password" minLength={8} autoComplete={mode === "new" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>{message && <div className="checkout-message">{message}</div>}<button disabled={busy}>{busy ? "Bağlanıyor…" : mode === "new" ? "Hesabımı Oluştur ve Bağla" : "Giriş Yap ve Siparişi Bağla"}</button></form>
      </>
    ) : (
      <p>E-postandaki bağlantı bu sayfayı token ile açar. Bağlantın yoksa veya süresi dolduysa aşağıdaki formdan yeni bağlantı iste.</p>
    )}
    <div className="activation-resend"><h2>Bağlantın gelmedi mi?</h2><p>Ödeme aldığın e-postaya yeni bir aktivasyon bağlantısı gönderebilirsin.</p>{!token && message && <div className="checkout-message">{message}</div>}<label>E-posta<input required type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setEmail(normalizeEmailField(email))} placeholder="ornek@mail.com" /></label><label>Sipariş numarası <small>(isteğe bağlı)</small><input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="YI-..." /></label><button type="button" onClick={resend} disabled={resending || !email}>{resending ? "Gönderiliyor…" : "Yeni Bağlantı Gönder"}</button></div>
  </section><AppFooter variant="compact" /></main>;
}
