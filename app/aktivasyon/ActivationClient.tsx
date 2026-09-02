"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppHeader from "../components/AppHeader";
import AppFooter from "../components/AppFooter";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { passwordLogin } from "../../lib/auth/password-login";
import { normalizeEmailField } from "../../lib/form-standards";
import { setCartOwner } from "../../lib/cart";
import { INDIVIDUAL_POST_PURCHASE_HREF } from "../../lib/commerce/post-purchase";

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
  const [activationMessage, setActivationMessage] = useState("");
  const [resendMessage, setResendMessage] = useState("");
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

  useEffect(() => {
    function onPageHide(event: PageTransitionEvent) {
      if (!event.persisted) clearHeldToken();
    }
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  useEffect(() => () => {
    setPassword("");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setActivationMessage("Aktivasyon bağlantısı eksik. E-postandaki bağlantıyı kullan veya aşağıdan yeni bağlantı iste.");
      return;
    }

    setBusy(true);
    setActivationMessage("");
    try {
      let corporate = false;
      if (mode === "new") {
        const response = await fetch("/api/commerce/activate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token, email, password }),
        });
        const data = await response.json() as { error?: string; corporate?: boolean };
        if (!response.ok) throw new Error(data.error || "Hesap oluşturulamadı.");
        corporate = Boolean(data.corporate);

        const signedIn = await passwordLogin({ email, password });
        if (signedIn.ok) {
          const supabase = getSupabaseBrowserClient();
          const session = supabase ? (await supabase.auth.getSession()).data.session : null;
          if (session?.user?.id) setCartOwner(session.user.id, { claimGuest: true });
        }
      } else {
        const signedIn = await passwordLogin({ email, password });
        if (!signedIn.ok) throw new Error(signedIn.message);
        const supabase = getSupabaseBrowserClient();
        const session = supabase ? (await supabase.auth.getSession()).data.session : null;
        if (!session) throw new Error("E-posta veya şifre hatalı.");

        const response = await fetch("/api/commerce/claim", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ token }),
        });
        const payload = await response.json() as { error?: string; corporate?: boolean };
        if (!response.ok) throw new Error(payload.error || "Sipariş hesaba bağlanamadı.");
        corporate = Boolean(payload.corporate);
      }

      clearHeldToken();
      setPassword("");
      router.push(corporate ? "/kurumsal/panel" : INDIVIDUAL_POST_PURCHASE_HREF);
    } catch (error) {
      setActivationMessage(error instanceof Error ? error.message : "Aktivasyon tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setResending(true);
    setResendMessage("");
    try {
      const response = await fetch("/api/commerce/activation/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, orderNumber: orderNumber || undefined }),
      });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error || "Bağlantı gönderilemedi.");
      setResendMessage(data.message || "Yeni bağlantı gönderildi.");
    } catch (error) {
      setResendMessage(error instanceof Error ? error.message : "Bağlantı gönderilemedi.");
    } finally {
      setResending(false);
    }
  }

  return (
    <main id="main-content" className="activation-page p5-activation-page p6-activation-page">
      <AppHeader showDefaultCta={false} />
      <section className="activation-shell">
        <span className="section-kicker">HESABI BAĞLA</span>
        <h1>Siparişini hesabına bağla.</h1>
        <p>E-postandaki bağlantı hakkı kilitler. Kurumsal pakette şirket paneli açılır; bireyselde dijital kartvizitin. Girişli alışverişte hak zaten tanımlıdır.</p>

        {token ? (
          <>
            <div className="activation-tabs" role="tablist" aria-label="Aktivasyon hesap türü">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "new"}
                className={mode === "new" ? "active" : ""}
                onClick={() => {
                  setMode("new");
                  setActivationMessage("");
                }}
              >
                Yeni hesap
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "existing"}
                className={mode === "existing" ? "active" : ""}
                onClick={() => {
                  setMode("existing");
                  setActivationMessage("");
                }}
              >
                Mevcut hesabım
              </button>
            </div>
            <form onSubmit={submit}>
              <label>
                E-posta
                <input
                  required
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={254}
                  enterKeyHint="next"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => setEmail(normalizeEmailField(email))}
                  placeholder="ornek@mail.com"
                />
              </label>
              <label>
                Şifre
                <input
                  required
                  type="password"
                  minLength={8}
                  autoComplete={mode === "new" ? "new-password" : "current-password"}
                  enterKeyHint="done"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              {activationMessage && <div className="checkout-message" role="status" aria-live="polite">{activationMessage}</div>}
              <button type="submit" disabled={busy}>
                {busy ? "Bağlanıyor…" : mode === "new" ? "Hesabımı Oluştur ve Bağla" : "Giriş Yap ve Siparişi Bağla"}
              </button>
            </form>
          </>
        ) : (
          <p>E-postandaki bağlantı bu sayfayı token ile açar. Bağlantın yoksa veya süresi dolduysa aşağıdaki formdan yeni bağlantı iste.</p>
        )}

        <div className="activation-resend">
          <h2>Bağlantın gelmedi mi?</h2>
          <p>Ödemenin düştüğü e-postaya yeni bağlantı gönderilir. Kart numarası bu ekranda istenmez.</p>
          <label>
            E-posta
            <input
              required
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              enterKeyHint="next"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setEmail(normalizeEmailField(email))}
              placeholder="ornek@mail.com"
            />
          </label>
          <label>
            Sipariş numarası <small>(isteğe bağlı)</small>
            <input
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              autoCapitalize="characters"
              enterKeyHint="send"
              placeholder="YI-..."
            />
          </label>
          {resendMessage && <div className="checkout-message" role="status" aria-live="polite">{resendMessage}</div>}
          <button type="button" onClick={resend} disabled={resending || !email}>
            {resending ? "Gönderiliyor…" : "Bağlantıyı yeniden gönder"}
          </button>
        </div>
      </section>
      <AppFooter variant="compact" />
    </main>
  );
}
