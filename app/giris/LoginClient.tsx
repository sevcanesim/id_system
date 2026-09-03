"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRememberedLogin, getSupabaseBrowserClient, setRememberedLogin } from "../../lib/supabase/browser";
import { isSupabaseConfigured, supabaseConfigIssue } from "../../lib/supabase/config";
import { writeSessionCookie } from "../components/AuthSessionBridge";
import { Icon } from "../icons";
import { YenomiProductVisual } from "../ui/YenomiProductVisual";
import { authErrorMessage } from "../../lib/errors";
import { normalizeEmail, SIGNUP_PASSWORD_RULES, validateEmail, validateSignupPassword } from "../../lib/auth/credentials";
import {
  parseLoginMode,
  resolveLoginReturnPath,
  type LoginAuthMode,
} from "../../lib/auth/login-search";
import type { LoginPortal } from "../../lib/auth/account-type";
import { passwordLogin } from "../../lib/auth/password-login";
import { isAdminSession } from "../../lib/auth/portal-guard";
import { resolveLoginDestination } from "../../lib/auth/account-router";
import { clearLegacyCart, setCartOwner } from "../../lib/cart";

type AuthMode = LoginAuthMode;

export default function LoginClient({
  initialNext,
  initialPortal,
  initialMode,
  initialMessage,
}: {
  initialNext: string;
  initialPortal: LoginPortal;
  initialMode: AuthMode;
  initialMessage: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">(initialMessage ? "error" : "info");
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [signupCompleted, setSignupCompleted] = useState(false);
  const [activeSessionEmail, setActiveSessionEmail] = useState<string | null>(null);
  const [returnPath, setReturnPath] = useState(initialNext || "/hesabim");

  function loginRedirectPath(mode?: "recovery") {
    const params = new URLSearchParams({ portal: initialPortal, next: returnPath });
    if (mode) params.set("mode", mode);
    return `${window.location.origin}/giris?${params.toString()}`;
  }

  function showMessage(text: string, tone: "info" | "success" | "error" = "info") {
    setMessage(text);
    setMessageTone(tone);
  }

  useEffect(() => {
    const remembered = getRememberedLogin();
    setRememberMe(remembered.remember);
    if (remembered.remember && remembered.email) setEmail(remembered.email);

    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get("mode");
    setReturnPath(resolveLoginReturnPath(initialPortal, params.get("next")));
    if (parseLoginMode(requestedMode) === "recovery") setMode("recovery");
    if (params.get("error")) {
      params.delete("error");
      const nextSearch = params.toString();
      window.history.replaceState(null, "", nextSearch ? `/giris?${nextSearch}` : "/giris");
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user) return;
      if (requestedMode === "recovery") {
        setActiveSessionEmail(data.session.user.email ?? null);
        return;
      }
      const sessionStored = await writeSessionCookie(
        data.session.access_token,
        data.session.expires_at,
        data.session.refresh_token,
      );
      if (!sessionStored) {
        await supabase.auth.signOut();
        clearLegacyCart();
        setCartOwner(null, { claimGuest: false });
        showMessage("Oturum kaydedilemedi. Lütfen yeniden dene.", "error");
        return;
      }
      if (await isAdminSession(data.session.access_token)) {
        window.location.replace("/admin/operations");
        return;
      }
      setCartOwner(data.session.user.id, { claimGuest: true });
      setActiveSessionEmail(data.session.user.email ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("recovery");
        setShowPassword(false);
        setPassword("");
        showMessage("Yeni şifreni belirleyebilirsin.", "info");
      }
      if (event === "SIGNED_OUT") {
        setCartOwner(null, { claimGuest: false });
        setActiveSessionEmail(null);
      }
      if (session?.user && event === "PASSWORD_RECOVERY") setActiveSessionEmail(session.user.email ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!activeSessionEmail || mode === "recovery") return;
    const supabase = getSupabaseBrowserClient();
      void resolveLoginDestination(supabase, initialPortal, returnPath).then((destination) => {
      window.location.replace(destination.startsWith("/giris") ? "/hesabim" : destination);
    });
  }, [activeSessionEmail, initialPortal, mode, returnPath, router]);

  async function signInWithGoogle() {
    showMessage("");
    if (!isSupabaseConfigured) return showMessage(`Supabase bağlantısı kurulamadı: ${supabaseConfigIssue}`, "error");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return showMessage("Giriş hizmeti şu anda kullanılamıyor.", "error");
    setRememberedLogin(rememberMe, email ? normalizeEmail(email) : undefined);
    setLoading(true);
    const redirectTo = loginRedirectPath();
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) {
      setLoading(false);
      showMessage(authErrorMessage(error, "Google ile giriş başlatılamadı. Lütfen yeniden dene."), "error");
    }
  }

  async function signInWithLinkedIn() {
    showMessage("");
    if (!isSupabaseConfigured) return showMessage(`Supabase bağlantısı kurulamadı: ${supabaseConfigIssue}`, "error");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return showMessage("Giriş hizmeti şu anda kullanılamıyor.", "error");
    setRememberedLogin(rememberMe, email ? normalizeEmail(email) : undefined);
    setLoading(true);
    const redirectTo = loginRedirectPath();
    let { error } = await supabase.auth.signInWithOAuth({ provider: "linkedin_oidc", options: { redirectTo, scopes: "openid profile email" } });
    if (error && (error.message?.includes("provider") || error.message?.includes("not supported"))) {
      const fallback = await supabase.auth.signInWithOAuth({ provider: "linkedin" as never, options: { redirectTo, scopes: "r_liteprofile r_emailaddress" } });
      error = fallback.error;
    }
    if (error) {
      setLoading(false);
      showMessage(authErrorMessage(error, "LinkedIn ile giriş başlatılamadı. Lütfen yeniden dene."), "error");
    }
  }

  async function sendPasswordReset() {
    const normalizedEmail = normalizeEmail(email);
    const emailError = validateEmail(normalizedEmail);
    if (emailError) return showMessage(emailError, "error");
    if (!isSupabaseConfigured) return showMessage(`Supabase bağlantısı kurulamadı: ${supabaseConfigIssue}`, "error");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return showMessage("Giriş hizmeti şu anda kullanılamıyor.", "error");
    setLoading(true);
    const redirectTo = loginRedirectPath("recovery");
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
    setLoading(false);
    if (error) return showMessage(authErrorMessage(error, "Şifre yenileme bağlantısı gönderilemedi."), "error");
    setEmail(normalizedEmail);
    showMessage("Şifre yenileme bağlantısını e-posta adresine gönderdik. Gelen kutunu kontrol et.", "success");
  }

  async function updateRecoveredPassword(event: FormEvent) {
    event.preventDefault();
    const passwordError = validateSignupPassword(password);
    if (passwordError) return showMessage(passwordError, "error");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return showMessage("Giriş hizmeti şu anda kullanılamıyor.", "error");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return showMessage(authErrorMessage(error, "Şifre güncellenemedi. Bağlantıyı yeniden isteyebilirsin."), "error");
    setPassword("");
    showMessage("Şifren güncellendi. Hesabına yönlendiriliyorsun.", "success");
    window.setTimeout(() => router.replace("/hesabim"), 450);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading || transitioning) return;
    showMessage("");
    const normalizedEmail = normalizeEmail(email);
    const emailError = validateEmail(normalizedEmail);
    if (emailError) return showMessage(emailError, "error");
    if (!password.trim()) return showMessage("Şifreni gir.", "error");
    if (mode === "signup") {
      const passwordError = validateSignupPassword(password);
      if (passwordError) return showMessage(passwordError, "error");
    }
    if (!isSupabaseConfigured) return showMessage(`Supabase bağlantısı kurulamadı: ${supabaseConfigIssue}`, "error");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return showMessage("Giriş hizmeti şu anda kullanılamıyor.", "error");
    setRememberedLogin(rememberMe, normalizedEmail);
    setLoading(true);
    setEmail(normalizedEmail);

    const emailRedirectTo = loginRedirectPath();
    let result;
    try {
      if (mode === "signup") {
        const authCall = supabase.auth.signUp({ email: normalizedEmail, password, options: { emailRedirectTo } });
        result = await Promise.race([
          authCall,
          new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error("AUTH_TIMEOUT")), 12_000);
          }),
        ]);
      } else {
        const signedIn = await passwordLogin({
          email: normalizedEmail,
          password,
          remember: rememberMe,
          portal: initialPortal,
        });
        if (!signedIn.ok) {
          setLoading(false);
          return showMessage(signedIn.message, "error");
        }
        const { data, error } = await supabase.auth.getSession();
        result = { data, error: error ?? (data.session ? null : { message: "Oturum kaydedilemedi. Lütfen yeniden dene." }) };
      }
    } catch {
      setLoading(false);
      return showMessage("Giriş hizmetine ulaşılamadı. Bağlantını kontrol edip yeniden dene.", "error");
    }

    const authErrorCode = result.error && typeof result.error === "object" ? (result.error as { code?: string }).code : undefined;
    const signupIdentities = result.data && "user" in result.data
      ? (result.data.user as { identities?: unknown[] } | null)?.identities
      : undefined;
    const duplicateSignup = mode === "signup" && (
      authErrorCode === "user_already_exists" ||
      authErrorCode === "email_exists" ||
      Array.isArray(signupIdentities) && signupIdentities.length === 0
    );
    if (duplicateSignup) {
      setLoading(false);
      setMode("login");
      setSignupCompleted(false);
      setPassword("");
      return showMessage("Bu e-posta adresiyle zaten bir hesap var. Şifrenle giriş yaparak devam edebilirsin.", "info");
    }
    if (result.error) {
      setLoading(false);
      return showMessage(authErrorMessage(result.error, mode === "login" ? "E-posta veya şifre hatalı." : "Hesap oluşturulamadı. Bilgilerini kontrol et."), "error");
    }
    if (mode === "signup" && !result.data.session) {
      setLoading(false);
      setSignupCompleted(true);
      return showMessage("Hesabın oluşturuldu. E-posta doğrulama bağlantısını kontrol et.", "success");
    }
    if (result.data.session?.user) {
      setPassword("");
      setTransitioning(true);
      setCartOwner(result.data.session.user.id, { claimGuest: true });
      const sessionStored = mode === "signup"
        ? await writeSessionCookie(
            result.data.session.access_token,
            result.data.session.expires_at,
            result.data.session.refresh_token,
          )
        : true;
      if (!sessionStored) {
        setTransitioning(false);
        setLoading(false);
        await supabase.auth.signOut();
        clearLegacyCart();
        setCartOwner(null, { claimGuest: false });
        return showMessage("Oturum kaydedilemedi. Lütfen yeniden dene.", "error");
      }

      let admin = false;
      try {
        admin = await isAdminSession(result.data.session.access_token);
      } catch {
        admin = false;
      }
      if (admin) {
        setLoading(false);
        window.location.replace("/admin/operations");
        return;
      }

      setLoading(false);
      setActiveSessionEmail(result.data.session.user.email ?? normalizedEmail);
      let destination = returnPath;
      try {
        destination = await Promise.race([
          resolveLoginDestination(supabase, "individual", returnPath),
          new Promise<string>((resolve) => window.setTimeout(() => resolve("/hesabim"), 4000)),
        ]);
      } catch {
        destination = "/hesabim";
      }
      window.location.replace(destination.startsWith("/giris") ? "/hesabim" : destination);
      return;
    }
    setLoading(false);
    window.location.replace(returnPath);
  }

  const title = mode === "recovery"
    ? "Yeni şifreni belirle"
    : mode === "forgot"
      ? "Şifreni yenile"
      : returnPath === "/checkout"
        ? mode === "signup"
          ? "Siparişini hesaba bağlamak istersen hesap oluştur"
          : "Siparişini hesaba bağlamak istersen giriş yap"
        : mode === "signup"
          ? "Yenomi ID hesabını oluştur"
          : "Hesabına giriş yap";

  const description = mode === "recovery"
    ? "Yeni şifreni oluşturduktan sonra doğru çalışma alanına yönlendirileceksin."
    : mode === "forgot"
      ? "Hesabındaki e-posta adresini yaz. Sana güvenli bir yenileme bağlantısı gönderelim."
      : returnPath === "/checkout"
        ? "Hesap açmadan ödeme yapabilirsin. Giriş yalnızca siparişi bu e-posta ile hesabına bağlamak içindir."
        : mode === "signup"
          ? "Hesabını oluştur. Çalışma alanın hesabına tanımlanan yetkilere göre otomatik hazırlanır."
          : "E-posta ve şifrenle giriş yap. Doğru çalışma alanına otomatik yönlendirileceksin.";

  const busy = loading || transitioning;
  const showWorkspace = (transitioning || activeSessionEmail) && mode !== "recovery" && messageTone !== "error";
  const authAlert = message ? (
    <div
      id="p6-auth-message-alert"
      className={`p6-auth-message ${messageTone}`}
      role={messageTone === "error" ? "alert" : "status"}
      aria-live={messageTone === "error" ? "assertive" : "polite"}
    >
      <div className="p6-auth-message-content"><span>{message}</span></div>
    </div>
  ) : null;

  return (
    <main id="main-content" className="p6-auth-page" data-ui-context="public">
      <section className="p6-auth-shell">
        <aside className="p6-auth-story" aria-label="Yenomi ID ürün özeti">
          <span className="p6-auth-kicker">YENOMI ID</span>
          <h1>Kartın sende.<br /><span className="p6-gold-text">Profilin her an güncel.</span></h1>
          <p>Yaklaştır, paylaş. Unvanın değişince baskı yok. Kart numarası Yenomi’de saklanmaz.</p>
          <div className="p6-auth-product-flow" aria-label="Karttan dijital profile geçiş">
            <div className="p6-auth-visual-card"><YenomiProductVisual variant="card" compact /></div>
            <div className="p6-auth-flow-arrow" aria-hidden="true"><Icon name="external" /></div>
            <div className="p6-auth-mini-phone"><YenomiProductVisual variant="profile" compact /><small>Canlı dijital kartvizit</small></div>
          </div>
          <div className="p6-auth-features-bento" aria-label="Yenomi ID avantajları">
            <div className="p6-bento-card"><div className="p6-bento-icon"><Icon name="share" /></div><div className="p6-bento-content"><strong>Tek dokunuşla paylaş</strong><small>NFC veya QR ile uygulama gerektirmeden.</small></div></div>
            <div className="p6-bento-card"><div className="p6-bento-icon"><Icon name="refresh" /></div><div className="p6-bento-content"><strong>Bilgilerin hep güncel</strong><small>Kartı yeniden bastırmadan profilini değiştir.</small></div></div>
            <div className="p6-bento-card"><div className="p6-bento-icon"><Icon name="shield" /></div><div className="p6-bento-content"><strong>Güvenli erişim</strong><small>Hesap yetkilerin arka planda güvenli biçimde doğrulanır.</small></div></div>
          </div>
        </aside>

        <section className="p6-auth-form-side">
          <div className="p6-auth-form-card">
            {returnPath === "/checkout" && mode !== "recovery" && (
              <div className="p6-checkout-context" role="status">
                <span>HESAP İSTEĞE BAĞLI</span>
                <Link href="/checkout">Ödemeye dön — hesap gerekmez</Link>
              </div>
            )}
            {authAlert}

            {showWorkspace ? (
              <div className="p6-auth-state" role="status" aria-live="polite">
                <span className="p6-auth-state-icon"><Icon name="lock" /></span>
                <h2>Hesabın açılıyor</h2>
                <p>{activeSessionEmail ? <><strong>{activeSessionEmail}</strong> olarak giriş yaptın. </> : null}Doğru çalışma alanına yönlendiriliyorsun.</p>
              </div>
            ) : signupCompleted ? (
              <div className="p6-auth-state" role="status" aria-live="polite">
                <span className="p6-auth-state-icon"><Icon name="mail" /></span>
                <h2>E-postanı doğrula</h2>
                <p><strong>{email}</strong> adresine gönderdiğimiz bağlantıya tıkla. Ardından bu ekrandan giriş yapabilirsin.</p>
                <button className="p6-auth-submit" type="button" onClick={() => { setSignupCompleted(false); setMode("login"); setPassword(""); setMessage(""); }}>Giriş ekranına dön <Icon name="chevronRight" /></button>
                <small>Mail görünmüyorsa Gereksiz / Diğer klasörlerini kontrol et.</small>
              </div>
            ) : (
              <>
                <header className="p6-auth-heading">
                  <span>Yenomi hesabı</span>
                  <h2>{title}</h2>
                  <p>{description}</p>
                </header>

                {mode === "login" && (
                  <div className="p6-auth-socials">
                    <button type="button" onClick={() => void signInWithGoogle()} disabled={busy}>
                      <span className="p6-auth-google" aria-hidden="true">
                        <svg viewBox="0 0 18 18" width="18" height="18" focusable="false">
                          <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.61Z"/>
                          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.9-2.26c-.81.54-1.84.87-3.06.87-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z"/>
                          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l2.99-2.33Z"/>
                          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z"/>
                        </svg>
                      </span>
                      <span>Google ile devam et</span>
                    </button>
                    <button type="button" onClick={() => void signInWithLinkedIn()} disabled={busy}><span className="p6-auth-linkedin" aria-hidden="true"><Icon name="social" /></span><span>LinkedIn ile devam et</span></button>
                  </div>
                )}

                {mode === "login" && <div className="p6-auth-divider"><span>veya e-posta ile</span></div>}

                {mode === "forgot" ? (
                  <form className="p6-auth-form" noValidate onSubmit={(event) => { event.preventDefault(); void sendPasswordReset(); }}>
                    <label><span>E-posta adresi</span><div className="p6-auth-input"><Icon name="mail" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setEmail(normalizeEmail(email))} required maxLength={254} autoComplete="email" placeholder="ornek@mail.com" /></div></label>
                    <button className="p6-auth-submit" disabled={busy}>{loading ? "Gönderiliyor…" : "Yenileme bağlantısı gönder"}<Icon name="chevronRight" /></button>
                    <button className="p6-auth-text-action" type="button" onClick={() => { setMode("login"); setMessage(""); }}>Giriş ekranına dön</button>
                  </form>
                ) : mode === "recovery" ? (
                  <form className="p6-auth-form" noValidate onSubmit={updateRecoveredPassword}>
                    <label><span>Yeni şifre</span><div className="p6-auth-input"><Icon name="lock" /><input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} maxLength={72} autoComplete="new-password" placeholder="Yeni şifren" /><button type="button" className="p6-auth-password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={showPassword}><Icon name={showPassword ? "eye-off" : "eye"} /></button></div></label>
                    <div className="p6-auth-password-rules" aria-label="Şifre kuralları">{SIGNUP_PASSWORD_RULES.map((rule) => <span key={rule.key} className={rule.test(password) ? "valid" : ""}><i aria-hidden="true" />{rule.label}</span>)}</div>
                    <button className="p6-auth-submit" disabled={busy}>{loading ? "Güncelleniyor…" : "Şifremi güncelle"}<Icon name="check" /></button>
                  </form>
                ) : (
                  <form method="post" action="/api/auth/login" onSubmit={submit} className="p6-auth-form" noValidate>
                    {mode === "login" ? <input type="hidden" name="next" value={returnPath} /> : null}
                    <label><span>E-posta adresi</span><div className="p6-auth-input"><Icon name="mail" /><input type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setEmail(normalizeEmail(email))} required maxLength={254} placeholder="ornek@mail.com" autoComplete="email" /></div></label>
                    <label><span>Şifre</span><div className="p6-auth-input"><Icon name="lock" /><input type={showPassword ? "text" : "password"} name="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={mode === "signup" ? 8 : 6} maxLength={72} placeholder="Şifreni gir" autoComplete={mode === "signup" ? "new-password" : "current-password"} /><button type="button" className="p6-auth-password-toggle" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={showPassword}><Icon name={showPassword ? "eye-off" : "eye"} /></button></div></label>

                    {mode === "login" && <div className="p6-auth-login-options"><label className="p6-auth-remember"><input type="checkbox" name="remember" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /><span>Beni hatırla</span></label><button type="button" onClick={() => { setMode("forgot"); setPassword(""); setMessage(""); }}>Şifremi unuttum</button></div>}
                    {mode === "signup" && <div className="p6-auth-password-rules" aria-label="Şifre kuralları">{SIGNUP_PASSWORD_RULES.map((rule) => <span key={rule.key} className={rule.test(password) ? "valid" : ""}><i aria-hidden="true" />{rule.label}</span>)}</div>}

                    <button className="p6-auth-submit" disabled={busy}>{loading ? (mode === "signup" ? "Hesap açılıyor…" : "Giriş yapılıyor…") : mode === "signup" ? (returnPath === "/checkout" ? "Hesabı aç ve ödemeye dön" : "Hesap oluştur") : returnPath === "/checkout" ? "Giriş yap ve ödemeye dön" : "Hesabına gir"}<Icon name="chevronRight" /></button>
                  </form>
                )}

                {mode !== "forgot" && mode !== "recovery" && (
                  <button className="p6-auth-switch" type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); setSignupCompleted(false); setPassword(""); }}>
                    {mode === "login" ? "Hesabın yok mu? Hesap oluştur" : "Zaten hesabın var mı? Giriş yap"}
                  </button>
                )}
              </>
            )}

            <div className="p6-auth-security"><Icon name="secure" /><span><strong>Güvenli oturum</strong><small>Oturum şifreli tutulur. Hesap türü ve yetkiler girişten sonra güvenli biçimde belirlenir.</small></span></div>
            {!isSupabaseConfigured && <div className="p6-auth-message info">Giriş hizmeti şu anda yapılandırılıyor. Lütfen daha sonra tekrar dene.</div>}
          </div>
        </section>
      </section>
    </main>
  );
}
