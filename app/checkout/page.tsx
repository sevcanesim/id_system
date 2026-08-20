"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readCart, setCartOwner, type CartItem } from "../../lib/cart";
import { formatTryFromKurus } from "../../lib/config/product";
import { COMMERCIAL_SKUS, digitalServiceBillingAddress, isCorporatePackageSku, isDigitalOnlySku, isPhysicalBundleSku, isPremiumUpgradeSku, isRenewalSku } from "../../lib/config/commercial";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { Icon } from "../icons";
import { TURKEY_CITIES, normalizeTrPhone } from "../../lib/form-standards";
import { parseCompanyBilling } from "../../lib/validation/company";
import { track } from "../../lib/analytics";
import { safeClientMessage } from "../../lib/errors";

import { clearPendingCheckoutOrderId, getOrCreateCheckoutIdempotencyKey, getPendingCheckoutOrderId, rotateCheckoutIdempotencyKey, setPendingCheckoutOrderId, setCheckoutReturnPath } from "../../lib/payments/browser-checkout";
type FormState = {
  recipientName: string;
  email: string;
  phone: string;
  addressLine: string;
  district: string;
  city: string;
  postalCode: string;
  deliveryNote: string;
  latitude?: number;
  longitude?: number;
  identityNumber: string;
  companyName: string;
  companyTaxNumber: string;
  companyTaxOffice: string;
  distanceSalesAccepted: boolean;
  personalizationAccepted: boolean;
};

const initial: FormState = {
  recipientName: "",
  email: "",
  phone: "",
  addressLine: "",
  district: "",
  city: "",
  postalCode: "",
  deliveryNote: "",
  identityNumber: "",
  companyName: "",
  companyTaxNumber: "",
  companyTaxOffice: "",
  distanceSalesAccepted: false,
  personalizationAccepted: false,
};


export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [form, setForm] = useState<FormState>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [legalVersions, setLegalVersions] = useState<{ distanceSales: string; personalization: string; privacy: string } | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeStep, setActiveStep] = useState<"buyer" | "shipping" | "approval">("buyer");
  const [deliveryNoteOpen, setDeliveryNoteOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [organizationTargets, setOrganizationTargets] = useState<Record<string, { name: string; role: string }>>({});

  useEffect(() => {
    fetch("/api/public-config")
      .then(async (response) => {
        if (!response.ok) throw new Error("config unavailable");
        return response.json();
      })
      .then((data) => setLegalVersions(data.legalVersions))
      .catch(() => setMessage("Hukuk sürümleri DB’den yüklenemedi; ödeme başlatılamaz."));
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const cart = readCart();
    setItems(cart);

    if (!supabase) {
      setCheckoutReady(true);
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (!session) {
        setCheckoutReady(true);
        return;
      }

      setIsAuthenticated(true);
      setCartOwner(session.user.id, { claimGuest: true });
      const mergedCart = readCart();
      setItems(mergedCart);
      setForm((current) => ({ ...current, email: session.user.email ?? current.email }));
      const organizationIds = Array.from(new Set(mergedCart.map((item) => item.configuration?.organizationId).filter((id): id is string => typeof id === "string")));
      if (organizationIds.length && session.access_token) {
        void fetch("/api/organizations/mine?management=true", { headers: { authorization: `Bearer ${session.access_token}` } })
          .then((response) => response.ok ? response.json() : null)
          .then((payload) => {
            const next: Record<string, { name: string; role: string }> = {};
            for (const row of payload?.organizations || []) {
              if (organizationIds.includes(row.organization_id)) next[row.organization_id] = { name: row.organizations?.name || "Kurumsal hesap", role: row.role || "" };
            }
            setOrganizationTargets(next);
          })
          .catch(() => undefined);
      }
      setCheckoutReady(true);
    });
  }, []);

  useEffect(() => {
    const wipeIdentity = () => setForm((current) => (current.identityNumber ? { ...current, identityNumber: "" } : current));
    window.addEventListener("pagehide", wipeIdentity);
    return () => window.removeEventListener("pagehide", wipeIdentity);
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPriceKurus * item.quantity, 0),
    [items],
  );
  const hasInitialBundle = items.some((item) => isPhysicalBundleSku(item.variantSku));
  const hasExtraCard = items.some((item) => item.variantSku === COMMERCIAL_SKUS.ADDITIONAL_CARD);
  const hasRenewal = items.some((item) => isRenewalSku(item.variantSku));
  const hasPremiumUpgrade = items.some((item) => isPremiumUpgradeSku(item.variantSku));
  const hasReplacement = items.some((item) => item.variantSku === COMMERCIAL_SKUS.REPLACEMENT_CARD);
  const hasBusinessCapacity = items.some((item) => typeof item.configuration?.organizationId === "string" && !isCorporatePackageSku(item.variantSku));
  const hasCorporatePackage = items.some((item) => isCorporatePackageSku(item.variantSku));
  const digitalOnlyCart = items.length > 0 && items.every((item) => isDigitalOnlySku(item.variantSku));

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const companyComplete = !hasCorporatePackage || parseCompanyBilling({
    name: form.companyName,
    taxNumber: form.companyTaxNumber,
    taxOffice: form.companyTaxOffice,
  }).ok;
  const buyerComplete = form.recipientName.trim().length >= 3 && /^\S+@\S+\.\S+$/.test(form.email.trim()) && form.phone.replace(/\D/g, "").length >= 10 && form.identityNumber.length === 11 && companyComplete;
  const shippingComplete = digitalOnlyCart
    ? Boolean(form.city.trim() && form.district.trim())
    : form.addressLine.trim().length >= 10 && !!form.district.trim() && !!form.city.trim();
  const approvalComplete = form.distanceSalesAccepted && form.personalizationAccepted;

  function buyerError() {
    if (form.recipientName.trim().length < 3) return "Ad soyad bilgisini kontrol et.";
    if (form.phone.replace(/\D/g, "").length < 10) return "Telefon numaranı kontrol et.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Geçerli bir e-posta adresi gir.";
    if (form.identityNumber.length !== 11) return "T.C. kimlik numarası 11 haneli olmalı.";
    if (hasCorporatePackage) {
      const parsed = parseCompanyBilling({
        name: form.companyName,
        taxNumber: form.companyTaxNumber,
        taxOffice: form.companyTaxOffice,
      });
      if (!parsed.ok) return parsed.error;
    }
    return "";
  }

  function shippingError() {
    if (digitalOnlyCart) {
      if (!form.city.trim() || !form.district.trim()) return "Fatura için şehir ve ilçe alanlarını tamamla.";
      return "";
    }
    if (form.addressLine.trim().length < 10) return "Teslimat adresini daha ayrıntılı yaz.";
    if (!form.city.trim() || !form.district.trim()) return "Şehir ve ilçe alanlarını tamamla.";
    return "";
  }

  function advanceBuyer() {
    const error = buyerError();
    if (error) return setMessage(error);
    setMessage("");
    setActiveStep("shipping");
  }

  function advanceShipping() {
    const error = shippingError();
    if (error) return setMessage(error);
    setMessage("");
    setActiveStep("approval");
  }

  function validate() {
    if (form.recipientName.trim().length < 3) return "Ad soyad bilgisini kontrol et.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Geçerli bir e-posta adresi gir.";
    if (form.phone.replace(/\D/g, "").length < 10) return "Telefon numaranı kontrol et.";
    if (form.identityNumber.length !== 11) return "T.C. kimlik numarası 11 haneli olmalı.";
    if (hasCorporatePackage) {
      const parsed = parseCompanyBilling({
        name: form.companyName,
        taxNumber: form.companyTaxNumber,
        taxOffice: form.companyTaxOffice,
      });
      if (!parsed.ok) return parsed.error;
    }
    if (digitalOnlyCart) {
      if (!form.district.trim() || !form.city.trim()) return "Fatura için ilçe ve şehir alanlarını tamamla.";
    } else {
      if (form.addressLine.trim().length < 10) return "Teslimat adresini daha ayrıntılı yaz.";
      if (!form.district.trim() || !form.city.trim()) return "İlçe ve şehir alanlarını tamamla.";
    }
    if (!form.distanceSalesAccepted) return "Mesafeli satış ve ön bilgilendirme metinlerini onaylamalısın.";
    if (!form.personalizationAccepted) return "Kişiselleştirilmiş ürün koşullarını onaylamalısın.";
    return "";
  }

  async function useLocation() {
    setMessage("");
    if (!navigator.geolocation) {
      setMessage("Tarayıcın konum özelliğini desteklemiyor. Adresi elle girebilirsin.");
      return;
    }

    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        try {
          const response = await fetch(`/api/location/reverse?lat=${latitude}&lng=${longitude}`);
          const data = await response.json();
          if (response.ok) {
            setForm((current) => ({
              ...current,
              latitude,
              longitude,
              city: data.city || current.city,
              district: data.district || current.district,
              addressLine: data.formattedAddress || current.addressLine,
            }));
            setToast("Konum bulundu. Adresini kontrol ederek devam edebilirsin.");
            window.setTimeout(() => setToast(""), 2600);
          } else {
            setForm((current) => ({ ...current, latitude, longitude }));
            setMessage(data.error || "Konum bulundu ancak adres çözümlenemedi. Alanları elle tamamla.");
          }
        } catch {
          setForm((current) => ({ ...current, latitude, longitude }));
          setMessage("Konum bulundu ancak adres servisine ulaşılamadı. Alanları elle tamamla.");
        } finally {
          setLocationBusy(false);
        }
      },
      () => {
        setLocationBusy(false);
        setMessage("Konum izni verilmedi. Teslimat adresini elle girebilirsin.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!items.length) {
      setMessage("Sepetin boş.");
      return;
    }
    if (!legalVersions) {
      setMessage("Hukuk sürümleri DB’den yüklenmeden ödeme başlatılamaz.");
      return;
    }

    const validationMessage = validate();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setCheckoutReturnPath("/checkout");
    setBusy(true);
    track("checkout_started", { itemCount: items.length, authenticated: isAuthenticated });
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-idempotency-key": getOrCreateCheckoutIdempotencyKey(),
      };
      if (sessionData.session?.access_token) headers.authorization = `Bearer ${sessionData.session.access_token}`;

      const response = await fetch("/api/commerce/checkout", {
        method: "POST",
        headers,
        body: JSON.stringify({
          items: items.map((item) => ({
            productSlug: item.productId,
            variantSku: item.variantSku,
            quantity: item.quantity,
            configuration: item.configuration,
          })),
          customer: {
            name: form.recipientName.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone,
            identityNumber: form.identityNumber,
          },
          company: hasCorporatePackage ? {
            name: form.companyName.trim(),
            taxNumber: form.companyTaxNumber,
            taxOffice: form.companyTaxOffice.trim(),
          } : undefined,
          shipping: {
            recipientName: form.recipientName.trim(),
            phone: form.phone,
            addressLine: digitalOnlyCart ? digitalServiceBillingAddress(form.city, form.addressLine) : form.addressLine.trim(),
            district: form.district.trim(),
            city: form.city.trim(),
            postalCode: form.postalCode || null,
            deliveryNote: digitalOnlyCart ? null : form.deliveryNote || null,
            latitude: digitalOnlyCart ? null : form.latitude ?? null,
            longitude: digitalOnlyCart ? null : form.longitude ?? null,
            countryCode: "TR",
          },
          retryOrderId: getPendingCheckoutOrderId(),
          consents: {
            distanceSalesAccepted: form.distanceSalesAccepted,
            personalizationAccepted: form.personalizationAccepted,
            distanceSalesVersion: legalVersions?.distanceSales || "",
            personalizationVersion: legalVersions?.personalization || "",
            privacyVersion: legalVersions?.privacy || "",
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.orderId) setPendingCheckoutOrderId(data.orderId);
        if (data.retryable) rotateCheckoutIdempotencyKey();
        if (data.resetOrder) clearPendingCheckoutOrderId();
        throw new Error(safeClientMessage(data, "Ödeme başlatılamadı."));
      }
      if (!data.paymentPageUrl) throw new Error("Ödeme sayfası oluşturulamadı.");
      if (data.orderId) setPendingCheckoutOrderId(data.orderId);
      track("payment_start", { orderId: data.orderId, reused: Boolean(data.reused) });
      update("identityNumber", "");
      window.location.href = data.paymentPageUrl;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ödeme başlatılamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main-content" className="checkout-page p5-checkout-page yi-footer-compact">
      {/* Public chrome is provided by PublicSiteShell. Do not remount AppHeader/AppFooter. */}
      <section className="checkout-shell checkout-confirm-shell">
        <div className="checkout-heading checkout-heading-compact">
          <h1>{hasCorporatePackage ? "Kurumsal ödemeyi tamamla." : digitalOnlyCart ? "Dijital ödemeyi tamamla." : "Ödemeyi tamamla."}</h1>
          <p>{hasCorporatePackage ? "Fatura ve teslimatı doğrula. Son adımda iyzico kartını alır; Yenomi saklamaz." : digitalOnlyCart ? "Fatura ili ve ilçesini doğrula. Teslimat adresi yok. Kartın iyzico’da kalır." : "Alıcı ve teslimatı doğrula. Kart numarası iyzico’da işlenir; Yenomi’de saklanmaz."}</p>
          <div className="checkout-account-note" role="status">{isAuthenticated ? <><Icon name="check" /> Hesabın bağlı. Siparişin hesabına otomatik eklenir.</> : <><Icon name="mail" /> Hesap açmadan tamamlayabilirsin. Satın alma sonrası siparişini bu e-posta ile hesabına bağlayabilirsin.</>}</div>
          <div className="checkout-trust-row checkout-trust-row-compact" aria-label="Sipariş avantajları">
            {!digitalOnlyCart && <span><Icon name="truck" />Ücretsiz kargo</span>}
            {hasInitialBundle && <span><Icon name="clock" />Ana kart 2 iş gününde hazırlanır</span>}
            {hasInitialBundle && <span><Icon name="shield" />1 yıllık dijital kullanım</span>}
            {hasExtraCard && <span><Icon name="shield" />Mevcut Yenomi ID hizmetine bağlı</span>}
            {hasRenewal && <span><Icon name="shield" />Yalnız dijital hizmet yenilemesi</span>}
            {hasReplacement && <span><Icon name="shield" />Mevcut profilin korunur</span>}
            {hasCorporatePackage && <span><Icon name="building" />Kurumsal fatura: unvan, vergi no, vergi dairesi</span>}
            {hasCorporatePackage && <span><Icon name="clock" />NFC kartlar 2 iş gününde hazırlanır</span>}
            {hasCorporatePackage && <span><Icon name="shield" />1 yıllık kurumsal sistem</span>}
          </div>
          <div className="checkout-progress" aria-label="Sipariş ilerlemesi">
            <div className="done"><i><Icon name="check" /></i><span>Ürün</span></div>
            <b />
            <button type="button" className={activeStep === "buyer" ? "active" : buyerComplete ? "done" : ""} onClick={() => setActiveStep("buyer")}><i>{buyerComplete ? <Icon name="check" /> : "2"}</i><span>Bilgiler</span></button>
            <b />
            <button type="button" className={activeStep === "shipping" ? "active" : shippingComplete ? "done" : ""} onClick={() => buyerComplete && setActiveStep("shipping")}><i>{shippingComplete ? <Icon name="check" /> : "3"}</i><span>{digitalOnlyCart ? "Fatura" : "Teslimat"}</span></button>
            <b />
            <button type="button" className={activeStep === "approval" ? "active" : approvalComplete ? "done" : ""} onClick={() => buyerComplete && shippingComplete && setActiveStep("approval")}><i>{approvalComplete ? <Icon name="check" /> : "4"}</i><span>Ödeme</span></button>
          </div>
        </div>

        {!checkoutReady ? (
          <div className="cart-empty"><h2>Ödeme hazırlanıyor…</h2><p>Sepetini ve güvenli ödeme bağlantını hazırlıyoruz.</p></div>
        ) : !items.length ? (
          <div className="cart-empty"><h2>Kartın henüz sepette değil.</h2><Link href="/urunler/nfc-kart">NFC Kartı Satın Al</Link></div>
        ) : (
          <form onSubmit={submit} className="checkout-layout checkout-layout-confirm" noValidate>
            <div className="checkout-accordion">
              <section className={`checkout-step ${activeStep === "buyer" ? "open" : ""} ${buyerComplete ? "complete" : ""}`}>
                <button type="button" className="checkout-step-trigger" onClick={() => setActiveStep("buyer")}>
                  <span className="checkout-step-icon"><Icon name="contact" /></span>
                  <span><strong>Alıcı Bilgileri</strong>{buyerComplete && activeStep !== "buyer" ? <small>{hasCorporatePackage ? `${form.companyName} · ${form.recipientName}` : `${form.recipientName} · ${form.phone}`}</small> : <small>{hasCorporatePackage ? "Sipariş, fatura ve şirket bilgileri" : "Sipariş ve fatura bilgileri"}</small>}</span>
                  <em>{buyerComplete ? <Icon name="check" /> : <Icon name="chevronRight" />}</em>
                </button>
                {activeStep === "buyer" && <div className="checkout-step-body">
                  <label>Ad Soyad<input required autoComplete="name" value={form.recipientName} onChange={(e) => update("recipientName", e.target.value)} placeholder="Kartın ve faturanın sahibi" /></label>
                  <label>Telefon<input required inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => update("phone", normalizeTrPhone(e.target.value))} placeholder="+90 5xx xxx xx xx" />{form.phone.replace(/\D/g, "").length >= 10 && <small className="field-ok"><Icon name="check" /> Telefon doğrulandı</small>}</label>
                  <label>E-posta<input required type="email" autoComplete="email" value={form.email} onChange={(e) => !isAuthenticated && update("email", e.target.value)} readOnly={isAuthenticated} />{isAuthenticated ? <small className="field-ok"><Icon name="check" /> Hesabına bağlı e-posta</small> : <small>Hesap açmadan güvenli ödeme yapabilirsin. Sipariş bilgilerin bu e-posta adresine gönderilir.</small>}</label>
                  <label>T.C. kimlik numarası<input required inputMode="numeric" maxLength={11} name="iyzico-identity" autoComplete="off" autoCorrect="off" spellCheck={false} value={form.identityNumber} onChange={(e) => update("identityNumber", e.target.value.replace(/\D/g, ""))} placeholder="11 haneli T.C. kimlik numarası" /><small>iyzico ödeme doğrulaması için kullanılır; saklanmaz.</small></label>
                  {hasCorporatePackage ? (
                    <div className="checkout-company-fields">
                      <p className="checkout-company-kicker">ŞİRKET FATURASI</p>
                      <label>Şirket unvanı<input required autoComplete="organization" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Resmi şirket unvanı" /></label>
                      <label>Vergi kimlik no<input required inputMode="numeric" maxLength={11} autoComplete="off" value={form.companyTaxNumber} onChange={(e) => update("companyTaxNumber", e.target.value.replace(/\D/g, ""))} placeholder="10 haneli VKN veya 11 haneli TCKN" /><small>Kurumsal faturada görünür. Şahış şirketleri TCKN kullanabilir.</small></label>
                      <label>Vergi dairesi<input required autoComplete="off" value={form.companyTaxOffice} onChange={(e) => update("companyTaxOffice", e.target.value)} placeholder="Örn. Kadıköy" /></label>
                    </div>
                  ) : null}
                  <button type="button" className="checkout-next" onClick={advanceBuyer}>{digitalOnlyCart ? "Fatura adresine geç" : "Teslimatı doğrula"} <Icon name="chevronRight" /></button>
                  {message && activeStep === "buyer" ? <div className="checkout-message" role="alert">{message}</div> : null}
                </div>}
              </section>

              <section className={`checkout-step ${activeStep === "shipping" ? "open" : ""} ${shippingComplete ? "complete" : ""}`}>
                <button type="button" className="checkout-step-trigger" onClick={() => buyerComplete && setActiveStep("shipping")} disabled={!buyerComplete}>
                  <span className="checkout-step-icon"><Icon name="map" /></span>
                  <span><strong>{digitalOnlyCart ? "Fatura adresi" : "Teslimat"}</strong>{shippingComplete && activeStep !== "shipping" ? <small>{form.district}, {form.city}</small> : <small>{digitalOnlyCart ? "Ödeme ve fatura doğrulaması için" : "Türkiye içi ücretsiz teslimat"}</small>}</span>
                  <em>{shippingComplete ? <Icon name="check" /> : <Icon name="chevronRight" />}</em>
                </button>
                {activeStep === "shipping" && <div className="checkout-step-body">
                  {digitalOnlyCart ? (
                    <>
                      <small>Yenileme ve yükseltme dijital hizmettir; kargo adresi istenmez. Fatura doğrulaması için il ve ilçe yeterlidir.</small>
                      <label>Şehir<select required value={form.city} onChange={(e) => { update("city", e.target.value); update("district", ""); }}><option value="">Şehir seç</option>{TURKEY_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
                      <label>İlçe<input required autoComplete="address-level2" value={form.district} onChange={(e) => update("district", e.target.value)} placeholder="İlçeni yaz" /></label>
                    </>
                  ) : (
                    <>
                      <div className="checkout-address-tools"><span>Adres bilgileri</span><button type="button" onClick={useLocation} disabled={locationBusy}><Icon name="map" />{locationBusy ? "Konum aranıyor…" : "Konumu Algıla"}</button></div>
                      <label>Açık adres<textarea required autoComplete="street-address" value={form.addressLine} onChange={(e) => update("addressLine", e.target.value)} rows={3} placeholder="Mahalle, cadde/sokak, bina no, kat ve daire" /></label>
                      <label>Şehir<select required value={form.city} onChange={(e) => { update("city", e.target.value); update("district", ""); }}><option value="">Şehir seç</option>{TURKEY_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
                      <label>İlçe<input required autoComplete="address-level2" value={form.district} onChange={(e) => update("district", e.target.value)} placeholder="İlçeni yaz" /></label>
                      {!deliveryNoteOpen ? <button type="button" className="checkout-note-toggle" onClick={() => setDeliveryNoteOpen(true)}><Icon name="plus" /> Teslimat Notu Ekle</button> : <label>Teslimat notu <small>(isteğe bağlı)</small><input autoFocus value={form.deliveryNote} onChange={(e) => update("deliveryNote", e.target.value)} placeholder="Kapı kodu, teslim saati vb." /></label>}
                    </>
                  )}
                  <button type="button" className="checkout-next" onClick={advanceShipping}>Ödemeye geç <Icon name="chevronRight" /></button>
                </div>}
              </section>

              <section className={`checkout-step ${activeStep === "approval" ? "open" : ""} ${approvalComplete ? "complete" : ""}`}>
                <button type="button" className="checkout-step-trigger" onClick={() => buyerComplete && shippingComplete && setActiveStep("approval")} disabled={!buyerComplete || !shippingComplete}>
                  <span className="checkout-step-icon"><Icon name="shield" /></span>
                  <span><strong>Onay ve Ödeme</strong><small>Sözleşmeleri onaylayıp güvenli ödemeye geç</small></span>
                  <em>{approvalComplete ? <Icon name="check" /> : <Icon name="chevronRight" />}</em>
                </button>
                {activeStep === "approval" && <div className="checkout-step-body checkout-approval-body">
                  <label className="checkout-consent checkout-consent-compact"><input type="checkbox" checked={form.distanceSalesAccepted} onChange={(e) => update("distanceSalesAccepted", e.target.checked)} /><span><Link href="/mesafeli-satis-sozlesmesi" target="_blank">Mesafeli Satış Sözleşmesini</Link> ve ön bilgilendirme koşullarını kabul ediyorum.</span></label>
                  <label className="checkout-consent checkout-consent-compact"><input type="checkbox" checked={form.personalizationAccepted} onChange={(e) => update("personalizationAccepted", e.target.checked)} /><span>Kişiye özel üretim koşullarını kabul ediyorum.</span></label>
                  <div className="checkout-policy-links"><Link href="/gizlilik">KVKK</Link><span>•</span><Link href="/iade-iptal">İade Politikası</Link><span>•</span><Link href="/mesafeli-satis-sozlesmesi">Ön Bilgilendirme</Link></div>
                  {message && <div className="checkout-message" role="alert">{message}</div>}
                </div>}
              </section>
            </div>

            <div className="checkout-summary-col">
              <aside className="checkout-summary checkout-summary-confirm">
                <div className="checkout-summary-head"><small>SİPARİŞ ÖZETİ</small><Link href="/sepet"><Icon name="pencil" />Düzenle</Link></div>
                {hasCorporatePackage && <div className="checkout-assignment-card">
                  <small>KURUMSAL FATURA</small>
                  <div className="checkout-assignment-target">
                    <div><span>Şirket</span><strong>{form.companyName || "Unvan bekleniyor"}</strong></div>
                    <div><span>Vergi no</span><strong>{form.companyTaxNumber || "—"}</strong></div>
                    <div><span>Vergi dairesi</span><strong>{form.companyTaxOffice || "—"}</strong></div>
                    <p>Ödeme sonrası şirket paneli bu bilgilerle açılır. NFC kartlar üretim kaydına alınır; çalışan eşleştirmesi panelden yapılır.</p>
                  </div>
                </div>}
                {hasBusinessCapacity && <div className="checkout-assignment-card">
                  <small>KURUMSAL TANIMLAMA</small>
                  {Array.from(new Set(items.map((item) => item.configuration?.organizationId).filter((id): id is string => typeof id === "string"))).map((organizationId) => {
                    const target = organizationTargets[organizationId];
                    const seatCount = items.filter((item) => item.configuration?.organizationId === organizationId).reduce((sum, item) => sum + Number(item.configuration?.seatCount || 0) * item.quantity, 0);
                    const publicId = `YI-${organizationId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
                    return <div className="checkout-assignment-target" key={organizationId}>
                      <div><span>Tanımlanacağı şirket</span><strong>{target?.name || "Kurumsal hesap"}</strong></div>
                      <div><span>Yönetici hesabı</span><strong>{form.email || "—"}</strong></div>
                      <div><span>Şirket ID</span><strong title={organizationId}>{publicId}</strong></div>
                      {seatCount > 0 && <div><span>Yeni kapasite</span><strong>+{seatCount} çalışan koltuğu</strong></div>}
                      <p>Bu paket mevcut kurumsal abonelik döneminin sonuna kadar şirket havuzuna eklenir. Fiziksel kartlar üretim kaydına alınır; çalışan eşleştirmesi panelden yapılır.</p>
                    </div>;
                  })}
                </div>}
                <div className="checkout-summary-items">{items.map((item) => <div key={`${item.productId}-${item.variantSku}`} className="checkout-summary-row"><div className={`checkout-summary-thumb${isDigitalOnlySku(item.variantSku) ? " digital-renewal" : ""}`} aria-hidden>{isDigitalOnlySku(item.variantSku) ? <Icon name="refresh" /> : <><div className="checkout-summary-thumb-card back" /><div className="checkout-summary-thumb-card front"><b>YENOMI ID</b></div></>}</div><div><strong>{item.name}</strong><span>{item.quantity} adet</span></div><b>{formatTryFromKurus(item.unitPriceKurus * item.quantity)}</b></div>)}</div>
                <div className="checkout-summary-line"><span>Ürün</span><strong>{formatTryFromKurus(total)}</strong></div>
                <div className="checkout-summary-line"><span>Kargo</span><strong className="checkout-summary-free">{digitalOnlyCart ? "Uygulanmaz" : "Ücretsiz"}</strong></div>
                <div className="checkout-summary-line"><span>KDV</span><strong>Dahil</strong></div>
                <div className="checkout-summary-total"><span>TOPLAM</span><div><strong>{formatTryFromKurus(total)}</strong><small>KDV dahil</small></div></div>
                <div className="checkout-summary-benefits">
                  {!digitalOnlyCart && <span><Icon name="check" /> Türkiye içi kargo dahil</span>}
                  {hasInitialBundle && <span><Icon name="check" /> 1 yıllık dijital kullanım</span>}
                  {hasExtraCard && <span><Icon name="check" /> Mevcut profile bağlı; yeni süre başlatmaz</span>}
                  {hasRenewal && <span><Icon name="check" /> Mevcut kartınla 1 yıl dijital hizmet yenilemesi</span>}
                  {hasRenewal && <span><Icon name="check" /> Kartın zaten sende; yeni kart satın alman gerekmez</span>}
                  {hasPremiumUpgrade && <span><Icon name="check" /> 100 Network Mail bu döneme eklenir; ikinci kart gönderilmez</span>}
                  {hasReplacement && <span><Icon name="check" /> Kayıp kartın yerine; profilin ve hizmet süren korunur</span>}
                  {hasBusinessCapacity && <span><Icon name="check" /> Mevcut abonelik dönemi sonuna kadar ek kapasite</span>}
                  {hasCorporatePackage && <span><Icon name="check" /> 1 yıllık kurumsal panel + NFC kartlar</span>}
                  {hasCorporatePackage && <span><Icon name="check" /> Fatura: unvan, vergi no, vergi dairesi</span>}
                  {!digitalOnlyCart && <span><Icon name="check" /> Fiziksel kart üretim kaydı oluşturulur</span>}
                </div>
                <button type="submit" className="checkout-pay-button" disabled={busy || !legalVersions || !buyerComplete || !shippingComplete || !approvalComplete}><Icon name="lock" />{busy ? "Ödeme hazırlanıyor…" : "iyzico ile güvenle öde"}</button>
                {(!buyerComplete || !shippingComplete || !approvalComplete) && !busy ? <p className="checkout-pay-hint">{digitalOnlyCart ? "Ödemeye geçmek için alıcı, fatura ve onay adımlarını tamamlayın." : "Ödemeye geçmek için alıcı, teslimat ve onay adımlarını tamamlayın."}</p> : null}
                <div className="checkout-secure-list"><span><Icon name="lock" /> SSL Güvenli</span>{!digitalOnlyCart && <span><Icon name="truck" /> Ücretsiz Kargo</span>}<span><Icon name="refresh" /> Kolay Aktivasyon</span><span><Icon name="shield" /> iyzico Güvencesi</span></div>
              </aside>
            </div>
          </form>
        )}
        {toast && <div className="checkout-toast" role="status"><Icon name="check" />{toast}</div>}
      </section>
    </main>
  );
}
