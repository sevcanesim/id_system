"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "../../icons";
import { track } from "../../../lib/analytics";
import { clearCheckoutSession } from "../../../lib/payments/browser-checkout";
import FulfillmentReviewNotice from "./FulfillmentReviewNotice";
import ActivationAction from "./ActivationAction";
import PaymentSuccessShare from "./PaymentSuccessShare";

type VerifyState = "checking" | "verified" | "invalid";
type OrderStatusPayload = {
  paid?: boolean;
  activationRequired?: boolean;
  corporate?: boolean;
  corporateReady?: boolean;
  seatPack?: boolean;
  seatPackFulfillment?: "FULFILLED" | "FAILED" | "PENDING" | null;
  reviewRequired?: boolean;
};

/**
 * Gates the payment-success content behind an order verification check.
 *
 * P0 QA finding: opening /odeme/basarili directly (no order, a stale order,
 * or an order that never actually got paid) rendered "Ödemen başarıyla
 * alındı." unconditionally — the page never checked whether the order in
 * the URL exists or is paid. That is both a false status communication and
 * a trust problem. This component checks /api/commerce/orders/status before
 * showing success, and only fires the success analytics event / clears the
 * checkout session once that check actually passes.
 */
export default function OrderResultGate() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [state, setState] = useState<VerifyState>(orderId ? "checking" : "invalid");
  const [activationRequired, setActivationRequired] = useState(false);
  const [corporate, setCorporate] = useState(false);
  const [corporateReady, setCorporateReady] = useState(false);
  const [seatPack, setSeatPack] = useState(false);
  const [seatPackFulfillment, setSeatPackFulfillment] = useState<"FULFILLED" | "FAILED" | "PENDING" | null>(null);
  const [reviewRequired, setReviewRequired] = useState(searchParams.get("review") === "1");
  const tracked = useRef(false);

  useEffect(() => {
    if (!orderId) {
      setState("invalid");
      return;
    }
    let active = true;
    setState("checking");

    async function verifyPaid() {
      const statusResponse = await fetch(`/api/commerce/orders/status?order=${encodeURIComponent(orderId!)}`, { cache: "no-store" });
      const status = await (statusResponse.ok ? statusResponse.json() : { paid: false });
      return status as OrderStatusPayload;
    }

    void (async () => {
      try {
        let attempts = 0;
        let data = await verifyPaid();

        while (active && attempts < 4 && (!data?.paid || (data.corporate && !data.corporateReady))) {
          attempts++;
          await fetch("/api/payments/iyzico/recover", {
            method: "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ orderId }),
          }).catch(() => null);

          await new Promise((resolve) => setTimeout(resolve, attempts * 750));
          if (!active) return;
          data = await verifyPaid();
        }

        if (!active) return;
        setState(data?.paid ? "verified" : "invalid");
        setActivationRequired(Boolean(data?.activationRequired));
        setCorporate(Boolean(data?.corporate));
        setCorporateReady(Boolean(data?.corporateReady));
        setSeatPack(Boolean(data?.seatPack));
        setSeatPackFulfillment(data?.seatPackFulfillment ?? null);
        setReviewRequired(Boolean(data?.reviewRequired) || searchParams.get("review") === "1");
      } catch {
        if (active) setState("invalid");
      }
    })();
    return () => {
      active = false;
    };
  }, [orderId, searchParams]);

  useEffect(() => {
    if (state !== "verified" || tracked.current) return;
    tracked.current = true;
    track("payment_success", orderId ? { orderId } : {});
    clearCheckoutSession();
  }, [state, orderId]);

  if (state === "checking") {
    return (
      <section className="order-success p5-order-success" aria-busy="true" aria-live="polite">
        <span className="section-kicker">SİPARİŞ DOĞRULANIYOR</span>
        <h1>Ödeme durumun kontrol ediliyor…</h1>
        <p>Bu birkaç saniye sürebilir, lütfen sayfadan ayrılma.</p>
      </section>
    );
  }

  if (state === "invalid") {
    return (
      <section className="order-success p5-order-success" role="alert">
        <span className="section-kicker">DOĞRULANAMADI</span>
        <h1>Bu siparişi doğrulayamadık.</h1>
        <p>Bağlantı geçersiz olabilir veya ödeme henüz kilitlenmemiş olabilir. Çekim olduysa siparişlerimden durumu gör; olmadıysa aynı siparişi yeniden dene.</p>
        <div className="order-success-actions">
          <Link href="/siparislerim">Siparişlerimi Gör</Link>
          <Link className="secondary" href="/urunler/nfc-kart">Kartını Oluştur</Link>
        </div>
      </section>
    );
  }

  const setupIncomplete = corporate && !corporateReady && !activationRequired;

  async function retryFulfillment() {
    if (!orderId) throw new Error("Sipariş bulunamadı.");
    await fetch("/api/payments/iyzico/recover", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const statusResponse = await fetch(`/api/commerce/orders/status?order=${encodeURIComponent(orderId)}`, { cache: "no-store" });
    const data = await (statusResponse.ok ? statusResponse.json() : {}) as OrderStatusPayload;
    setCorporate(Boolean(data.corporate));
    setCorporateReady(Boolean(data.corporateReady));
    setSeatPack(Boolean(data.seatPack));
    setSeatPackFulfillment(data.seatPackFulfillment ?? null);
    setReviewRequired(Boolean(data.reviewRequired));
    if (data.corporate && !data.corporateReady) {
      throw new Error("Kurulum hâlâ tamamlanmadı. Ödeme tekrar alınmaz; destek ile iletişime geçebilirsin.");
    }
    if (data.reviewRequired && !data.activationRequired) {
      throw new Error("Sipariş hâlâ kontrol ediliyor. Ödeme tekrar alınmaz; birkaç dakika sonra yeniden dene.");
    }
  }

  const step2Title = activationRequired
    ? "Hesabını bağla"
    : setupIncomplete
      ? "Kurulumu tamamla"
      : seatPack
        ? (seatPackFulfillment === "FULFILLED"
          ? "Paneli aç ve çalışan ekle"
          : "Kapasiteyi kontrol et")
        : corporate
          ? "Paneli aç"
          : "Profilini hazırla";

  const step2Subtitle = activationRequired
    ? "Maildeki bağlantı ile hesap oluştur veya giriş yap."
    : setupIncomplete
      ? "Şirket kaydı oluşunca panel açılır."
      : seatPack
        ? (seatPackFulfillment === "FULFILLED"
          ? "Yeni çalışanlarınızı ekleyin veya kart taleplerini başlatın."
          : "Ek lisans işlendikten sonra çalışan ekleyebilirsiniz.")
        : corporate
          ? "Çalışan lisanslarını ve kart üretimini yönet."
          : "İletişim bilgilerini ve bağlantılarını ekle.";

  return (
    <section className="order-success p5-order-success">
      <span className="p5-result-icon"><Icon name="check" /></span>
      <span className="section-kicker">SİPARİŞ ALINDI</span>
      <h1>{seatPack
        ? (seatPackFulfillment === "FULFILLED"
          ? "Ek lisans kapasiteniz tanımlandı."
          : "Ödemeniz başarıyla alındı.")
        : "Ödemen alındı. Sırada profilin var."}</h1>
      <p>{activationRequired
        ? (corporate || seatPack
          ? "Siparişin henüz bir hesaba bağlı değil. E-postandaki bağlantı ile hesabını oluştur; şirket panelin orada açılır."
          : "Siparişin henüz bir hesaba bağlı değil. E-postandaki bağlantı ile hesabını oluştur; dijital kullanım hakkın orada açılır.")
        : setupIncomplete
          ? "Ödemen alındı. Şirket paneli, kurulum bitmeden açılmaz. Aşağıdan kurulumu yeniden dene."
          : seatPack
            ? (seatPackFulfillment === "FULFILLED"
              ? "Ek lisans kapasiteniz hesabınıza tanımlandı. Şimdi yeni çalışan ekleyebilirsiniz."
              : "Ek lisans kapasiteniz işleniyor. Kurumsal panelden güncel kapasitenizi kontrol edebilirsiniz.")
            : (corporate
              ? "Siparişin hesabına bağlandı. Şirket panelinden lisansları, çalışanları ve kart üretimini yönetebilirsin."
              : "Siparişin hesabına bağlandı. Kartın hazırlanırken dijital kartvizitini tamamlayabilir ve profilini kullanıma hazır hale getirebilirsin.")}</p>
      <FulfillmentReviewNotice reviewRequired={reviewRequired} setupIncomplete={setupIncomplete} />
      <div className="p5-next-steps" aria-label="Sipariş sonrası adımlar">
        <div className="done"><b>1</b><span><strong>Ödeme tamamlandı</strong><small>{activationRequired ? "Ödemen alındı; sipariş e-postana kaydedildi." : "Siparişin hesabına kaydedildi."}</small></span></div>
        <div><b>2</b><span><strong>{step2Title}</strong><small>{step2Subtitle}</small></span></div>
        <div><b>3</b><span><strong>{corporate || seatPack ? "Kartlar hazırlanır" : "Kart hazırlanır"}</strong><small>Fiziksel kart üretim ve kargo sürecine alınır.</small></span></div>
      </div>
      <ActivationAction
        activationRequired={activationRequired}
        corporate={corporate}
        corporateReady={corporateReady}
        seatPack={seatPack}
        seatPackFulfillment={seatPackFulfillment}
        reviewRequired={reviewRequired}
        orderId={orderId}
        onSetupRetry={retryFulfillment}
      />
      <div className="order-success-actions">
        {activationRequired ? (
          <>
            <Link href="/aktivasyon">Hesabımı Bağla</Link>
            <Link className="secondary" href="/urunler">Ürünlere Dön</Link>
          </>
        ) : (corporate || seatPack) ? (
          setupIncomplete ? null : <Link className="secondary" href="/siparislerim">Siparişimi Takip Et</Link>
        ) : (
          <Link className="secondary" href="/siparislerim">Siparişimi Takip Et</Link>
        )}
      </div>
      <PaymentSuccessShare />
    </section>
  );
}
