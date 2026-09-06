"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { writeCart } from "../../../lib/cart";
import { CORPORATE_POST_PURCHASE_HREF, INDIVIDUAL_POST_PURCHASE_HREF } from "../../../lib/commerce/post-purchase";
import { normalizeEmailField } from "../../../lib/form-standards";
import { clearPendingCheckoutOrderId, rotateCheckoutIdempotencyKey } from "../../../lib/payments/browser-checkout";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";

type Props = {
  activationRequired: boolean;
  corporate?: boolean;
  corporateReady?: boolean;
  seatPack?: boolean;
  seatPackFulfillment?: "FULFILLED" | "FAILED" | "PENDING" | null;
  reviewRequired?: boolean;
  resultReference?: string | null;
  onSetupRetry?: () => Promise<void>;
};

export default function ActivationAction({
  activationRequired,
  corporate = false,
  corporateReady = false,
  seatPack = false,
  seatPackFulfillment = null,
  reviewRequired = false,
  resultReference = null,
  onSetupRetry,
}: Props) {
  const [ready, setReady] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    writeCart([]);
    clearPendingCheckoutOrderId();
    rotateCheckoutIdempotencyKey();
    if (activationRequired || corporate || seatPack) {
      setReady(null);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setReady(false);
      return;
    }
    void supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) {
        setReady(false);
        return;
      }
      const response = await fetch("/api/commerce/entitlements", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
      setReady(response.ok && Boolean((await response.json()).active));
    });
  }, [activationRequired, corporate, seatPack, reviewRequired]);

  async function resend(event: FormEvent) {
    event.preventDefault();
    setResending(true);
    setMessage("");
    try {
      const response = await fetch("/api/commerce/activation/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalizeEmailField(email) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Bağlantı gönderilemedi.");
      setMessage(data.message || "Uygun bir sipariş bulunursa yeni bağlantı gönderildi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bağlantı gönderilemedi.");
    } finally {
      setResending(false);
    }
  }

  async function retrySetup() {
    if (!resultReference || !onSetupRetry) return;
    setRetrying(true);
    setMessage("");
    try {
      await onSetupRetry();
      if (corporate || seatPack) return;
      const supabase = getSupabaseBrowserClient();
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const token = data.session?.access_token;
      if (!token) {
        setReady(false);
        return;
      }
      const response = await fetch("/api/commerce/entitlements", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
      setReady(response.ok && Boolean((await response.json()).active));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kurulum yenilenemedi.");
    } finally {
      setRetrying(false);
    }
  }

  if (activationRequired) {
    return (
      <div className="activation-callout">
        <h2>{corporate || seatPack ? "Şirket panelini e-postadaki bağlantı ile aç" : "Hesabını e-postadaki bağlantı ile aç"}</h2>
        <p>{corporate || seatPack
          ? "Aktivasyon bağlantısı sipariş e-postana gönderildi. Bağlantı 7 gün geçerlidir. Hesabını bağladığında şirket panelin açılır."
          : "Aktivasyon bağlantısı sipariş e-postana gönderildi. Bağlantı 7 gün geçerlidir. Mail gelmediyse aynı adresi yazarak yeniden gönderebilirsin."}</p>
        <form onSubmit={resend}>
          <label>Sipariş e-postası
            <input
              required
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setEmail(normalizeEmailField(email))}
              placeholder="ornek@mail.com"
            />
          </label>
          {message ? <div className="checkout-message">{message}</div> : null}
          <button type="submit" disabled={resending || !email.trim()}>{resending ? "Gönderiliyor…" : "Bağlantıyı Yeniden Gönder"}</button>
        </form>
        <Link href="/aktivasyon">Aktivasyon sayfasını aç →</Link>
      </div>
    );
  }

  if (seatPack && seatPackFulfillment === "FULFILLED" && !reviewRequired) {
    return (
      <div className="activation-callout">
        <h2>Ek lisans kapasiteniz tanımlandı</h2>
        <p>Ek lisans kapasiteniz hesabınıza tanımlandı. Şimdi yeni çalışan ekleyebilirsiniz.</p>
        <Link href="/kurumsal/panel/calisanlar">
          Kurumsal Panele Dön ve Çalışan Ekle
        </Link>
      </div>
    );
  }

  if (seatPack && (seatPackFulfillment === "PENDING" || !seatPackFulfillment) && !reviewRequired) {
    return (
      <div className="activation-callout">
        <h2>Ödemeniz başarıyla alındı.</h2>
        <p>Ek lisans kapasiteniz işleniyor. Kurumsal panelden güncel kapasitenizi kontrol edebilirsiniz.</p>
        <Link href="/kurumsal/panel/kartlar">
          Kapasiteyi Kontrol Et
        </Link>
      </div>
    );
  }

  if (seatPack && (seatPackFulfillment === "FAILED" || reviewRequired)) {
    return (
      <div className="activation-callout">
        <h2>Ek lisans tanımlaması kontrol ediliyor</h2>
        <p>Ödemen alındı; yeni bir çekim yapılmaz. Ek lisansınız hesabınıza aktarılırken bir kontrol gerekiyor.</p>
        {message ? <div className="checkout-message">{message}</div> : null}
        {resultReference ? (
          <button type="button" onClick={() => void retrySetup()} disabled={retrying}>
            {retrying ? "Durum kontrol ediliyor…" : "Durumu Yeniden Kontrol Et"}
          </button>
        ) : null}
        <Link href="/siparislerim">Siparişimi takip et →</Link>
      </div>
    );
  }

  if (corporate && !corporateReady) {
    return (
      <div className="activation-callout">
        <h2>Şirket kurulumu henüz tamamlanmadı</h2>
        <p>Ödemen alındı. Şirket paneli ancak kurulum bitince açılır. Yeni bir çekim yapılmaz.</p>
        {message ? <div className="checkout-message">{message}</div> : null}
        {resultReference ? (
          <button type="button" onClick={() => void retrySetup()} disabled={retrying}>
            {retrying ? "Kurulum deneniyor…" : "Kurulumu tekrar dene"}
          </button>
        ) : null}
        <Link href="/siparislerim">Siparişimi takip et →</Link>
      </div>
    );
  }

  if (!corporate && !seatPack && (reviewRequired || ready === false)) {
    return (
      <div className="activation-callout">
        <h2>{reviewRequired ? "Siparişin hesabına bağlanırken kontrol gerekiyor" : "Dijital hakkın henüz hesabına yazılmadı"}</h2>
        <p>Ödemen alındı; yeni bir çekim yapılmaz. Kartvizit editörü, hakların aktif olunca açılır.</p>
        {message ? <div className="checkout-message">{message}</div> : null}
        {resultReference ? (
          <button type="button" onClick={() => void retrySetup()} disabled={retrying}>
            {retrying ? "Bağlantı deneniyor…" : "Hesaba bağlamayı tekrar dene"}
          </button>
        ) : null}
        <Link href="/siparislerim">Siparişimi takip et →</Link>
      </div>
    );
  }

  if (seatPack && reviewRequired) {
    return (
      <div className="activation-callout">
        <h2>Ek lisans tanımlaması kontrol ediliyor</h2>
        <p>Ödemen alındı; yeni bir çekim yapılmaz. Ek lisansınız hesabınıza aktarılırken bir kontrol gerekiyor.</p>
        {message ? <div className="checkout-message">{message}</div> : null}
        {resultReference ? (
          <button type="button" onClick={() => void retrySetup()} disabled={retrying}>
            {retrying ? "Durum kontrol ediliyor…" : "Durumu Yeniden Kontrol Et"}
          </button>
        ) : null}
        <Link href="/siparislerim">Siparişimi takip et →</Link>
      </div>
    );
  }

  if (!corporate && !seatPack && ready !== true) {
    return (
      <div className="activation-callout">
        <h2>Hizmetin hesabına yazılıyor</h2>
        <p>Ödemen alındı. Kartvizitini, dijital hakkın aktif olduktan sonra hazırlayabilirsin.</p>
      </div>
    );
  }

  return (
    <div className="activation-callout">
      <h2>{corporate ? "Şirket hesabın hazır" : "Yenomi ID hizmetin hesabına tanımlandı"}</h2>
      <p>{corporate
        ? "Aktivasyon koduyla uğraşmana gerek yok. Çalışan lisanslarını, kart üretimini ve paneli buradan yönet."
        : "Aktivasyon koduyla uğraşmana gerek yok. Şimdi kartvizit bilgilerini doldur; fiziksel kartın bu profile bağlansın."}</p>
      <Link href={corporate ? CORPORATE_POST_PURCHASE_HREF : INDIVIDUAL_POST_PURCHASE_HREF}>
        {corporate ? "Kurumsal Paneli Aç" : "Kartvizitimi Hazırla"}
      </Link>
    </div>
  );
}
