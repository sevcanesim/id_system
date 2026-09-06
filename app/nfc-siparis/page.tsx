"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { getBrowserIdentity } from "../../lib/auth/browser-identity";
import { formatTryFromKurus, getNfcOrderTotalKurus, NFC_PRODUCT } from "../../lib/config/product";
import { highestReachableNfcOrderStep, validateNfcOrderStep } from "../../lib/validation/nfc-order";
import OrderLocationMap from "../components/OrderLocationMap";
import { Icon } from "../icons";
import { NfcCardFront, NfcCardBack } from "../components/ui/NfcCardArt";
import { track } from "../../lib/analytics";
import { TURKEY_CITIES, normalizeEmailField, normalizeTrPhone } from "../../lib/form-standards";
import { cardShareUrl } from "../../lib/public-card/urls";
import { minimizeCoordinates } from "../../lib/location/coordinates";
import { clearPendingCheckoutOrderId, getOrCreateCheckoutIdempotencyKey, lookupPendingCheckoutOrder, rotateCheckoutIdempotencyKey, setPendingCheckoutOrderId, setCheckoutReturnPath } from "../../lib/payments/browser-checkout";
// v22: Bu sayfa artık yalnızca ürünü KİŞİSELLEŞTİRİYOR (renk, isim, teslimat).
// Ödeme ve sipariş oluşturma tek boru hattından geçsin diye
// /api/commerce/checkout kullanılıyor — eski createOrder() + ayrı ödeme route'u
// (nfc_orders tablosu, entitlement/aktivasyon sistemine hiç girmiyordu) kaldırıldı.

type FormData = {
  cardColor: "BLACK" | "WHITE" | "PURPLE";
  printName: string;
  printTitle: string;
  phone: string;
  email: string;
  addressLine: string;
  district: string;
  city: string;
  postalCode: string;
  quantity: number;
  note: string;
  latitude: number | null;
  longitude: number | null;
  mapUrl: string;
};

type CheckoutProfile = {
  id: string;
  public_id: string | null;
  name: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
};

const initial: FormData = {
  cardColor: "BLACK", printName: "", printTitle: "", phone: "", email: "",
  addressLine: "", district: "", city: "", postalCode: "", quantity: 1, note: "", latitude: null, longitude: null, mapUrl: ""
};

export default function NfcOrderPage() {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [distanceSalesAccepted, setDistanceSalesAccepted] = useState(false);
  const [personalizationAccepted, setPersonalizationAccepted] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [publicId, setPublicId] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [qrPreview, setQrPreview] = useState("");
  const [activeStep, setActiveStep] = useState(1);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [legalVersions, setLegalVersions] = useState<{ distanceSales: string; personalization: string; privacy: string } | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<"PAYTR" | null>(null);
  const paymentProviderName = "PayTR";

  const publicCardUrl = useMemo(() => publicId ? cardShareUrl(publicId) : "", [publicId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const identity = await getBrowserIdentity();
      if (!identity) {
        router.replace("/giris?next=%2Fnfc-siparis");
        return;
      }
      const response = await fetch("/api/profiles/mine", { credentials: "same-origin", cache: "no-store" });
      const payload = response.ok ? await response.json() as { profiles?: CheckoutProfile[] } : null;
      const profile = payload?.profiles?.[0];
      if (cancelled) return;
      setUserId(identity.user.id);
      track("order_start", { hasPublishedProfile: Boolean(profile?.public_id) });
      if (profile) {
        setProfileId(profile.id);
        setPublicId(profile.public_id || "");
        setForm((current) => ({ ...current, printName: profile.name ?? "", printTitle: profile.role ?? "", phone: profile.phone ?? "", email: profile.email ?? identity.user.email ?? "" }));
      } else {
        setForm((current) => ({ ...current, email: identity.user.email ?? "" }));
      }
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [router]);


  useEffect(() => {
    fetch("/api/public-config")
      .then(async (response) => {
        if (!response.ok) throw new Error("config unavailable");
        return response.json();
      })
      .then((data) => {
        setLegalVersions(data.legalVersions);
        setPaymentProvider(data?.payment?.provider === "PAYTR" ? "PAYTR" : null);
      })
      .catch(() => setMessage("Hukuk sürümleri DB’den yüklenemedi; ödeme başlatılamaz."));
  }, []);

  useEffect(() => {
    void lookupPendingCheckoutOrder()
      .then((data) => {
        if (data.paid && data.paymentResultUrl) {
          window.location.replace(data.paymentResultUrl);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!publicId) { setQrPreview(""); return; }
    QRCode.toDataURL(publicCardUrl, { width: 360, margin: 1, errorCorrectionLevel: "H" })
      .then(setQrPreview)
      .catch(() => setQrPreview(""));
  }, [publicCardUrl, publicId]);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }


  async function resolveCoordinates(latitude: number, longitude: number, message = "Konumdan adres önerildi. Bina ve daire bilgisini kontrol et.") {
    const coordinates = minimizeCoordinates(latitude, longitude);
    if (!coordinates) {
      setLocationMessage("Konum geçersiz görünüyor. Adresi elle girebilirsin.");
      return;
    }
    const minimizedLatitude = coordinates.latitude;
    const minimizedLongitude = coordinates.longitude;
    setLocationMessage("Adres çözümleniyor...");
    try {
      const response = await fetch(`/api/location/reverse?lat=${minimizedLatitude}&lng=${minimizedLongitude}`);
      const result = await response.json();
      setForm((current) => ({
        ...current,
        addressLine: result.addressLine || current.addressLine,
        district: result.district || current.district,
        city: result.city || current.city,
        postalCode: result.postalCode || current.postalCode,
        latitude: minimizedLatitude,
        longitude: minimizedLongitude,
        mapUrl: `https://www.google.com/maps?q=${minimizedLatitude},${minimizedLongitude}`,
      }));
      setLocationMessage(response.ok ? message : (result.error || "Konum seçildi; adresi kontrol ederek tamamla."));
    } catch {
      setForm((current) => ({ ...current, latitude: minimizedLatitude, longitude: minimizedLongitude, mapUrl: `https://www.google.com/maps?q=${minimizedLatitude},${minimizedLongitude}` }));
      setLocationMessage("Konum seçildi ancak adres otomatik doldurulamadı. Adresi elle tamamla.");
    }
  }

  async function useCurrentLocation() {
    setLocationMessage("");
    if (!("geolocation" in navigator)) {
      setLocationMessage("Tarayıcın konum özelliğini desteklemiyor. Adresi elle girebilirsin.");
      return;
    }
    setLocating(true);
    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      setLocating(false);
      setLocationMessage("Konum özelliği yalnızca HTTPS bağlantısında çalışır. Adresi elle girebilirsin.");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      await resolveCoordinates(position.coords.latitude, position.coords.longitude);
      setLocating(false);
    }, (error) => {
      setLocating(false);
      if (error.code === error.PERMISSION_DENIED) {
        setLocationMessage("Konum izni reddedildi. Tarayıcı adres çubuğundaki konum iznini açabilir veya adresi elle girebilirsin.");
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        setLocationMessage("Cihaz konumu belirleyemedi. Wi‑Fi veya konum servislerini açıp tekrar dene.");
      } else if (error.code === error.TIMEOUT) {
        setLocationMessage("Konum isteği zaman aşımına uğradı. Tekrar dene veya adresi elle gir.");
      } else {
        setLocationMessage("Konum alınamadı. Adresi elle girebilirsin.");
      }
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return; // çift tıklama / çift gönderim koruması
    setMessage("");
    if (!userId) { setMessage("Sipariş vermek için önce giriş yapmalısın."); return; }
    if (!profileId) { setMessage("Önce dijital kartvizitini oluşturmalısın."); return; }
    if (!legalVersions) { setMessage("Hukuk sürümleri DB’den yüklenmeden ödeme başlatılamaz."); return; }
    const consentVersions = legalVersions;
    setSubmitting(true);
    if (!paymentProvider) {
      setSubmitting(false);
      setMessage("PayTR güvenli ödeme servisi şu anda hazır değil. Lütfen kısa süre sonra tekrar dene.");
      return;
    }
    const finalValidationError = validateNfcOrderStep(5, form, Boolean(publicId));
    if (finalValidationError) {
      setSubmitting(false);
      setMessage(finalValidationError);
      return;
    }
    const identity = await getBrowserIdentity();
    const currentUserId = identity?.user.id ?? null;
    if (!currentUserId) {
      setSubmitting(false);
      setMessage("Oturumun sona ermiş. Lütfen tekrar giriş yap.");
      return;
    }
    if (currentUserId !== userId) {
      setSubmitting(false);
      setUserId(currentUserId);
      setMessage("Hesabın değişti gibi görünüyor. Bilgilerini kontrol edip tekrar dene.");
      return;
    }
    setCheckoutReturnPath("/nfc-siparis");
    track("payment_start", { profileId, quantity: form.quantity });
    const pending = await lookupPendingCheckoutOrder();
    if (pending.paid && pending.paymentResultUrl) {
      setSubmitting(false);
      window.location.replace(pending.paymentResultUrl);
      return;
    }
    const retryOrderId = pending.awaitingPayment ? pending.orderId : null;
    // Tek çağrı: sipariş oluşturma + ödeme başlatma artık aynı ticaret borusundan
    // (commerce_orders → entitlements → aktivasyon) geçiyor.
    const response = await fetch("/api/commerce/checkout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "x-idempotency-key": getOrCreateCheckoutIdempotencyKey() },
      body: JSON.stringify({
        items: [{
          productSlug: NFC_PRODUCT.slug,
          variantSku: NFC_PRODUCT.defaultOfferSku,
          quantity: form.quantity,
          configuration: { cardColor: "BLACK", printName: form.printName.trim(), printTitle: form.printTitle.trim(), profileId, profilePublicId: publicId || null },
        }],
        customer: {
          name: form.printName.trim() || "Yenomi Müşteri",
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
        shipping: {
          recipientName: form.printName.trim() || "Yenomi Müşteri",
          phone: form.phone.trim(),
          addressLine: form.addressLine.trim(),
          district: form.district.trim(),
          city: form.city.trim(),
          postalCode: form.postalCode.trim() || null,
          deliveryNote: form.note.trim() || null,
          latitude: form.latitude,
          longitude: form.longitude,
          countryCode: "TR",
        },
        retryOrderId,
        consents: {
          distanceSalesAccepted,
          personalizationAccepted,
          distanceSalesVersion: consentVersions.distanceSales,
          personalizationVersion: consentVersions.personalization,
          privacyVersion: consentVersions.privacy,
        },
      }),
    });
    const result = await response.json();
    setSubmitting(false);
    if (!response.ok || !result.paymentPageUrl) {
      if (result.orderId) setPendingCheckoutOrderId(result.orderId);
      if (result.retryable) rotateCheckoutIdempotencyKey();
      if (result.resetOrder) clearPendingCheckoutOrderId();
      setMessage(result.error ?? "Ödeme sayfası açılamadı. Siparişin kayıtlı kaldı; yeniden deneyebilirsin.");
      return;
    }
    if (result.orderId) setPendingCheckoutOrderId(result.orderId);
    window.location.assign(result.paymentPageUrl);
  }

  useEffect(() => {
    if (loading || userId) return;
    window.location.replace("/giris?next=%2Fnfc-siparis");
  }, [loading, userId]);

  const currentStepError = useMemo(
    () => validateNfcOrderStep(activeStep, form, Boolean(publicId)),
    [activeStep, form, publicId]
  );
  const highestReachableStep = useMemo(
    () => highestReachableNfcOrderStep(form, Boolean(publicId)),
    [form, publicId]
  );

  if (loading) return <main className="order-page"><div className="result-empty"><h1>Sipariş ekranı yükleniyor.</h1></div></main>;
  if (!userId) return <main className="order-page order-page-v166"><section className="result-empty"><span className="section-kicker">GÜVENLİ SİPARİŞ</span><h1>Sipariş için hesabına giriş yap.</h1><p>Kartını kişisel Yenomi ID profiline güvenle bağlamak için oturum açmalısın.</p><div className="order-success-actions"><Link href="/giris?next=%2Fnfc-siparis">Giriş Yap</Link></div></section></main>;

  function nextStep() {
    if (currentStepError) {
      setMessage(currentStepError);
      return;
    }
    setMessage("");
    setActiveStep((step) => Math.min(5, step + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function previousStep() {
    setMessage("");
    setActiveStep((step) => Math.max(1, step - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <main id="main-content" className="order-page order-page-v166">

    <section className="premium-order-shell">
      <aside className="premium-product-stage">
        <div className="product-stage-copy">
          <span className="section-kicker">YENOMI NFC + QR KARTVİZİT</span>
          <h1>Kartı kişiselleştir.<br/>Kimliği kilitle.</h1>
          <p>Rengi seç, QR&apos;ı bağla, teslimatı yaz. Ödeme {paymentProviderName}&apos;ın güvenli sayfasında tamamlanır; kart numarası Yenomi&apos;de saklanmaz.</p>
        </div>

        <div className="stacked-card-preview" aria-label="Kart ön ve arka yüz önizlemesi">
          <NfcCardFront className="stacked-card-front" color={form.cardColor} qrImage={qrPreview || undefined} />
          <NfcCardBack className="stacked-card-back" color={form.cardColor} />
        </div>

        <div className="product-trust-grid">
          <span><b><Icon name="nfc" /></b><strong>NFC</strong><small>Tek dokunuşla açılır</small></span>
          <span><b><Icon name="qr" /></b><strong>Kişisel QR</strong><small>Her kamerayla okutulur</small></span>
          <span><b><Icon name="refresh" /></b><strong>Güncellenebilir</strong><small>Tekrar baskı gerekmez</small></span>
          <span><b><Icon name="contact" /></b><strong>Tek kart</strong><small>Tüm bağlantıların</small></span>
        </div>
      </aside>

      <form className="premium-checkout-card" onSubmit={submit}>
        <div className="premium-checkout-head">
          <div><span className="section-kicker">KİŞİSELLEŞTİR VE SİPARİŞ VER</span><h2>NFC kartını hazırla.</h2><p>Beş adım. Solda kartın güncellenir; sağda sipariş kilitlenir.</p></div>
          <div className="step-counter">{activeStep}/5</div>
        </div>

        <nav className="checkout-progress" aria-label="Sipariş adımları">
          {["Kart", "Yenomi ID", "İletişim", "Teslimat", "Ödeme"].map((label, index) => {
            const step=index+1;
            const locked = step > highestReachableStep;
            return <button type="button" key={label} disabled={locked} aria-disabled={locked} className={`${activeStep===step?"active":activeStep>step?"done":""} ${locked?"locked":""}`} onClick={()=>{ if (!locked) { setMessage(""); setActiveStep(step); } }}><span>{activeStep>step?<Icon name="check" />:step}</span><b>{label}</b></button>
          })}
        </nav>

        {activeStep === 1 && <section className="wizard-pane">
          <div className="pane-heading"><span>01</span><div><h3>Kartını seç</h3><p>Siyah mat NFC + QR. Adedi belirle.</p></div></div>
          <div className="quantity-premium"><div><strong>Adet</strong><small>Her kart aynı Yenomi ID'ye bağlanır.</small></div><div><button type="button" onClick={()=>update("quantity",Math.max(1,form.quantity-1))}>−</button><b>{form.quantity}</b><button type="button" onClick={()=>update("quantity",Math.min(100,form.quantity+1))}>+</button></div></div>
        </section>}

        {activeStep === 2 && <section className="wizard-pane">
          <div className="pane-heading"><span>02</span><div><h3>Yenomi ID</h3><p>Fiziksel kartında yalnız bu kimlik ve QR kodun yer alır.</p></div></div>
          <div className="identity-preview-card qr-only-preview">
            <div className="qr-only-copy"><strong>Kartına basılacak kişisel QR</strong><span>QR kod, yayınlanan dijital kartvizitine yönlenir.</span><small>Kullanıcı adı veya bağlantı kartın üzerinde yazmaz.</small></div>
            {qrPreview ? <img src={qrPreview} alt="Kartına basılacak QR kod önizlemesi"/> : <div className="qr-placeholder">QR</div>}
          </div>
          <div className="premium-note"><b>Ön yüz: kişisel QR + NFC</b><span>Arka yüzde yalnız “YENOMI ID” adı yer alır. Logo ve kişisel bilgi basılmaz; QR okunabilirliği korunur.</span></div>
        </section>}

        {activeStep === 3 && <section className="wizard-pane">
          <div className="pane-heading"><span>03</span><div><h3>İletişim bilgileri</h3><p>Yalnızca teslimat ve sipariş iletişimi için kullanılır.</p></div></div>
          <div className="field-grid"><label>Ad Soyad<input required value={form.printName} onChange={(e)=>update("printName",e.target.value)}/></label><label>Telefon<input required type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e)=>update("phone",normalizeTrPhone(e.target.value))} placeholder="+90 5xx xxx xx xx"/></label></div>
          <label>E-posta<input required type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} value={form.email} onChange={(e)=>update("email",e.target.value)} onBlur={()=>update("email",normalizeEmailField(form.email))} placeholder="ornek@firma.com"/></label>
        </section>}

        {activeStep === 4 && <section className="wizard-pane">
          <div className="pane-heading"><span>04</span><div><h3>Teslimat adresi</h3><p>Konumunu kullan veya adresi elle gir.</p></div></div>
          <div className="smart-location-row"><div><strong>{form.addressLine?"Konum belirlendi":"Konumunu hızlıca ekle"}</strong><small>{form.addressLine?`${form.district} / ${form.city}`:"GPS ile adres alanlarını otomatik doldur."}</small></div><button type="button" onClick={useCurrentLocation} disabled={locating}>{locating?"Alınıyor...":"Konumumu Kullan"}</button></div>
          {locationMessage&&<div className="location-message">{locationMessage}{form.mapUrl&&<a href={form.mapUrl} target="_blank" rel="noreferrer">Haritada aç</a>}</div>}
          <label>Açık adres<textarea required value={form.addressLine} onChange={(e)=>update("addressLine",e.target.value)} placeholder="Mahalle, cadde, sokak, bina ve daire"/></label>
          <div className="field-grid"><label>İlçe<input required autoComplete="address-level2" value={form.district} onChange={(e)=>update("district",e.target.value)} placeholder="İlçe"/></label><label>İl<select required autoComplete="address-level1" value={form.city} onChange={(e)=>update("city",e.target.value)}><option value="">İl seç</option>{TURKEY_CITIES.map((city)=><option key={city} value={city}>{city}</option>)}</select></label></div>
          <label>Posta kodu<input value={form.postalCode} onChange={(e)=>update("postalCode",e.target.value)}/></label>
          <button type="button" className="map-toggle" onClick={()=>setMapExpanded(v=>!v)}>{mapExpanded?"Haritayı Gizle":"Haritada Düzenle"}</button>
          {mapExpanded&&<div className="map-modal-inline"><OrderLocationMap latitude={form.latitude} longitude={form.longitude} onPositionChange={({latitude,longitude})=>resolveCoordinates(latitude,longitude,"Haritadaki yeni konuma göre adres güncellendi.")}/></div>}
          <label>Sipariş notu<textarea value={form.note} onChange={(e)=>update("note",e.target.value)} placeholder="Teslimat veya üretim notu"/></label>
        </section>}

        {activeStep === 5 && <section className="wizard-pane">
          <div className="pane-heading"><span>05</span><div><h3>Güvenli ödeme</h3><p>Siparişini kontrol et; ödeme {paymentProviderName}&apos;ın güvenli sayfasında tamamlanacak.</p></div></div>
          <div className="payment-privacy-note"><strong>Gizlilik notu</strong><span>Kart bilgilerin {paymentProviderName}&apos;ın güvenli sayfasında işlenir; Yenomi&apos;de saklanmaz.</span></div>
          <div className="stripe-summary"><div><span>NFC Kart</span><b>{formatTryFromKurus(getNfcOrderTotalKurus(form.quantity))}</b></div><div><span>Kargo</span><b>Ücretsiz</b></div><div className="total"><span>Toplam</span><b>{formatTryFromKurus(getNfcOrderTotalKurus(form.quantity))}</b></div></div>
          <label className="consent-check"><input type="checkbox" checked={distanceSalesAccepted} onChange={(e)=>setDistanceSalesAccepted(e.target.checked)} /><span><Link href="/mesafeli-satis-sozlesmesi" target="_blank">Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme Formu</Link>&apos;nu okudum ve kabul ediyorum.</span></label>
          <label className="consent-check"><input type="checkbox" checked={personalizationAccepted} onChange={(e)=>setPersonalizationAccepted(e.target.checked)} /><span>Siparişimin ad, unvan, QR bağlantısı ve seçtiğim üretim bilgileriyle bana özel hazırlanacağını; kişiselleştirilmiş ürünlere ilişkin koşulların <Link href="/mesafeli-satis-sozlesmesi" target="_blank">sözleşmede</Link> ayrıca açıklandığını okudum ve kabul ediyorum.</span></label>
          <p className="checkout-legal-note">Kişisel verilerin nasıl işlendiğini <Link href="/gizlilik" target="_blank">Gizlilik ve KVKK Aydınlatma Metni</Link>&apos;nden inceleyebilirsin. Bu bağlantı ayrı bir pazarlama izni anlamına gelmez.</p>
        </section>}

        {message&&<div className="auth-message">{message}</div>}
        <div className="wizard-actions">
          {activeStep>1?<button type="button" className="secondary" onClick={previousStep}>Önceki adım</button>:<Link className="secondary-link" href="/kartim">Kartıma dön</Link>}
          {activeStep<5?<button type="button" className="primary" onClick={nextStep}>{["Kimliği bağla","İletişime geç","Teslimatı yaz","Ödemeyi kilitle"][activeStep-1]} →</button>:<button className="primary" disabled={submitting||!legalVersions||!distanceSalesAccepted||!personalizationAccepted}>{submitting?"Güvenli ödeme açılıyor...":`${paymentProviderName} ile güvenle öde →`}</button>}
        </div>
        <small className="secure-caption">Güvenli ödeme altyapısı {paymentProviderName} tarafından sağlanır.</small>
      </form>
    </section>
  </main>;
}
