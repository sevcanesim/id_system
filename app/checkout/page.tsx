"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readCart, writeCart, type CartItem } from "../../lib/cart";
import { formatTryFromKurus } from "../../lib/config/product";
import { COMMERCIAL_FULFILLMENT, COMMERCIAL_SKUS, digitalServiceBillingAddress, isCorporatePackageSku, isDigitalOnlySku, isPhysicalBundleSku, isPremiumUpgradeSku, isRenewalSku, requiresPortalAccountSku } from "../../lib/config/commercial";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { Icon } from "../icons";
import { Button } from "../components/ui/DesignSystem";
import { TURKEY_CITIES, normalizeTrPhone } from "../../lib/form-standards";
import { isCompanyEntityType, parseCompanyBilling, type CompanyEntityType } from "../../lib/validation/company";
import { track } from "../../lib/analytics";
import { safeClientMessage } from "../../lib/errors";
import { clearPendingCheckoutOrderId, getOrCreateCheckoutIdempotencyKey, lookupPendingCheckoutOrder, rotateCheckoutIdempotencyKey, setPendingCheckoutOrderId, setCheckoutReturnPath } from "../../lib/payments/browser-checkout";
import { bootstrapAuthenticatedCheckout, type OrganizationCheckoutTarget } from "../../lib/commerce/checkout-session-bootstrap";
import { parseCheckoutResumeDraft } from "../../lib/commerce/checkout-resume-draft";

type FormState = {
  recipientName: string;
  email: string;
  phone: string;
  addressLine: string;
  district: string;
  city: string;
  postalCode: string;
  deliveryNote: string;
  companyEntityType: "" | CompanyEntityType;
  latitude?: number;
  longitude?: number;
  companyName: string;
  companyTaxNumber: string;
  companyTaxOffice: string;
  distanceSalesAccepted: boolean;
  personalizationAccepted: boolean;
};

type PaymentProvider = "PAYTR" | null;

const initial: FormState = {
  recipientName: "",
  email: "",
  phone: "",
  addressLine: "",
  district: "",
  city: "",
  postalCode: "",
  deliveryNote: "",
  companyEntityType: "",
  companyName: "",
  companyTaxNumber: "",
  companyTaxOffice: "",
  distanceSalesAccepted: false,
  personalizationAccepted: false,
};

function checkoutFailureMessage(payload: unknown): string {
  const message = safeClientMessage(payload, "Ödeme başlatılamadı.");
  const reference = payload && typeof payload === "object" && typeof (payload as { reference?: unknown }).reference === "string"
    ? (payload as { reference: string }).reference
    : null;

  // Error references are intentionally short, generated server-side values.
  // Never echo arbitrary response data into a customer-visible payment screen.
  return reference && /^[A-Z][A-Z0-9-]{3,79}$/.test(reference)
    ? `${message} Destek kodu: ${reference}.`
    : message;
}

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
  const [organizationTargets, setOrganizationTargets] = useState<Record<string, OrganizationCheckoutTarget>>({});
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>(null);
  const portalPurchase = items.some((item) => requiresPortalAccountSku(item.variantSku));
  const portalLoginHref = `/giris?portal=${items.some((item) => isCorporatePackageSku(item.variantSku)) ? "business" : "individual"}&purchase=portal&next=%2Fcheckout`;
  const requiresPortalLogin = portalPurchase && !isAuthenticated;

  useEffect(() => {
    fetch("/api/public-config")
      .then(async (response) => {
        if (!response.ok) throw new Error("config unavailable");
        return response.json();
      })
      .then((config) => {
        setLegalVersions(config.legalVersions);
        setPaymentProvider(config?.payment?.provider === "PAYTR" ? "PAYTR" : null);
      })
      .catch(() => setMessage("Hukuk sürümleri DB’den yüklenemedi; ödeme başlatılamaz."));
  }, []);

  useEffect(() => {
    const sync = () => {
      const mergedCart = readCart();
      setItems(mergedCart);
    };
    sync();
    window.addEventListener("yenomi-cart-change", sync);
    return () => window.removeEventListener("yenomi-cart-change", sync);
  }, []);

  useEffect(() => {
    void lookupPendingCheckoutOrder()
      .then((pendingOrder) => {
        if (pendingOrder.paid && pendingOrder.orderId) {
          window.location.replace(`/odeme/basarili?order=${encodeURIComponent(pendingOrder.orderId)}`);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const resumeToken = new URLSearchParams(window.location.search).get("resume");
    if (resumeToken) {
      window.location.replace(`/api/commerce/checkout/resume?token=${encodeURIComponent(resumeToken)}`);
      return () => { cancelled = true; };
    }

    void (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      await bootstrapAuthenticatedCheckout(data.session, {
        setForm,
        setItems,
        setIsAuthenticated,
        setOrganizationTargets,
        setCheckoutReady: () => undefined,
      });
      if (cancelled) return;

      try {
        const response = await fetch("/api/commerce/checkout/resume", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (response.status === 404) return;
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Sipariş taslağı yüklenemedi.");
        const draft = parseCheckoutResumeDraft(payload.draft);
        if (!draft || typeof payload.orderId !== "string") throw new Error("Sipariş taslağı doğrulanamadı.");
        writeCart(draft.items);
        setItems(draft.items);
        setPendingCheckoutOrderId(payload.orderId);
        setForm((current) => ({
          ...current,
          ...draft.form,
          companyEntityType: isCompanyEntityType(draft.form.companyEntityType) ? draft.form.companyEntityType : current.companyEntityType,
          distanceSalesAccepted: false,
          personalizationAccepted: false,
        }));
        setActiveStep("buyer");
        setToast("Sepetin ve teslimat bilgilerin geri yüklendi. Onaylarını yeniden vererek güvenli ödemeye devam edebilirsin.");
        window.history.replaceState(null, "", "/checkout");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Sipariş taslağı yüklenemedi.");
      } finally {
        if (!cancelled) setCheckoutReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!checkoutReady || !requiresPortalLogin) return;
    router.replace(portalLoginHref);
  }, [checkoutReady, portalLoginHref, requiresPortalLogin, router]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPriceKurus * item.quantity, 0),
    [items],
  );
  const hasInitialBundle = items.some((item) => isPhysicalBundleSku(item.variantSku));
  const hasDigitalMembership = hasInitialBundle || items.some((item) => item.variantSku === COMMERCIAL_SKUS.DIGITAL);
  const hasExtraCard = items.some((item) => item.variantSku === COMMERCIAL_SKUS.ADDITIONAL_CARD);
  const hasRenewal = items.some((item) => isRenewalSku(item.variantSku));
  const hasPremiumUpgrade = items.some((item) => isPremiumUpgradeSku(item.variantSku));
  const hasReplacement = items.some((item) => item.variantSku === COMMERCIAL_SKUS.REPLACEMENT_CARD);
  const hasBusinessCapacity = items.some((item) => typeof item.configuration?.organizationId === "string" && !isCorporatePackageSku(item.variantSku));
  const hasCorporatePackage = items.some((item) => isCorporatePackageSku(item.variantSku));
  const hasNetworkMailCreditPack = items.some((item) => item.variantSku?.startsWith("YENOMI-NETWORK-MAIL-"));
  const digitalOnlyCart = items.length > 0 && items.every((item) => isDigitalOnlySku(item.variantSku));
  const paymentProviderName = "PayTR";
  const corporateNetworkMailOrganizationIds = [...new Set(items
    .filter((item) => item.variantSku?.startsWith("YENOMI-NETWORK-MAIL-"))
    .map((item) => item.configuration?.organizationId)
    .filter((organizationId): organizationId is string => typeof organizationId === "string"))];
  const corporateNetworkMailOrganizationId = corporateNetworkMailOrganizationIds.length === 1
    ? corporateNetworkMailOrganizationIds[0]
    : null;
  const corporateNetworkMailTarget = corporateNetworkMailOrganizationId
    ? organizationTargets[corporateNetworkMailOrganizationId]
    : null;
  const isCorporateNetworkMailPurchase = hasNetworkMailCreditPack && Boolean(corporateNetworkMailOrganizationId);
  useEffect(() => {
    if (!isCorporateNetworkMailPurchase || !corporateNetworkMailTarget) return;
    setForm((current) => ({
      ...current,
      recipientName: current.recipientName || corporateNetworkMailTarget.authorizedPersonName,
      phone: current.phone || (corporateNetworkMailTarget.billingPhone ? normalizeTrPhone(corporateNetworkMailTarget.billingPhone) : ""),
      addressLine: current.addressLine || corporateNetworkMailTarget.billingAddress,
      district: current.district || corporateNetworkMailTarget.billingDistrict,
      city: current.city || corporateNetworkMailTarget.billingCity,
      postalCode: current.postalCode || corporateNetworkMailTarget.billingPostalCode,
    }));
  }, [corporateNetworkMailTarget, isCorporateNetworkMailPurchase]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const companyComplete = !hasCorporatePackage || parseCompanyBilling({
    entityType: form.companyEntityType,
    name: form.companyName,
    taxNumber: form.companyTaxNumber,
    taxOffice: form.companyTaxOffice,
  }).ok;
  const corporateBillingProfileComplete = !isCorporateNetworkMailPurchase || Boolean(
    corporateNetworkMailTarget?.legalName
    && corporateNetworkMailTarget.taxNumber
    && corporateNetworkMailTarget.billingAddress
    && corporateNetworkMailTarget.billingCity
    && corporateNetworkMailTarget.billingDistrict,
  );
  const buyerComplete = form.recipientName.trim().length >= 3
    && /^\S+@\S+\.\S+$/.test(form.email.trim())
    && form.phone.replace(/\D/g, "").length >= 10
    && companyComplete;
  const shippingComplete = isCorporateNetworkMailPurchase
    ? corporateBillingProfileComplete
    : digitalOnlyCart
    ? Boolean(form.city.trim() && form.district.trim())
    : form.addressLine.trim().length >= 10 && !!form.district.trim() && !!form.city.trim();
  const approvalComplete = form.distanceSalesAccepted && form.personalizationAccepted;

  function buyerError() {
    if (form.recipientName.trim().length < 3) return "Ad soyad bilgisini kontrol et.";
    if (form.phone.replace(/\D/g, "").length < 10) return "Telefon numaranı kontrol et.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Geçerli bir e-posta adresi gir.";
    if (hasCorporatePackage) {
      const parsed = parseCompanyBilling({ entityType: form.companyEntityType, name: form.companyName, taxNumber: form.companyTaxNumber, taxOffice: form.companyTaxOffice });
      if (!parsed.ok) return parsed.error;
    }
    return "";
  }

  function shippingError() {
    if (isCorporateNetworkMailPurchase) {
      return corporateBillingProfileComplete
        ? ""
        : "Şirketin kayıtlı fatura profili eksik. Şirket Sahibi, kurumsal fatura bilgilerini tamamlamalıdır.";
    }
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
    const buyerMessage = buyerError();
    if (buyerMessage) return buyerMessage;
    const shippingMessage = shippingError();
    if (shippingMessage) return shippingMessage;
    if (!form.distanceSalesAccepted) return "Mesafeli Satış Sözleşmesini kabul etmelisin.";
    if (!form.personalizationAccepted) return "Kişiselleştirilmiş ürün ve KVKK şartlarını kabul etmelisin.";
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
          const location = await response.json();
          if (response.ok) {
            setForm((current) => ({
              ...current,
              latitude,
              longitude,
              city: location.city || current.city,
              district: location.district || current.district,
              addressLine: location.formattedAddress || current.addressLine,
            }));
            setToast("Konum bulundu. Adresini kontrol ederek devam edebilirsin.");
            window.setTimeout(() => setToast(""), 2600);
          } else {
            setForm((current) => ({ ...current, latitude, longitude }));
            setMessage(location.error || "Konum bulundu ancak adres çözümlenemedi. Alanları elle tamamla.");
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
    if (!items.length) return setMessage("Sepetin boş.");
    if (!legalVersions) return setMessage("Hukuk sürümleri DB’den yüklenmeden ödeme başlatılamaz.");
    if (!paymentProvider) return setMessage("Ödeme sağlayıcısı şu anda hazır değil. Lütfen kısa süre sonra tekrar dene.");

    const validationMessage = validate();
    if (validationMessage) return setMessage(validationMessage);

    setCheckoutReturnPath("/checkout");
    setBusy(true);
    track("checkout_started", { itemCount: items.length, authenticated: isAuthenticated });
    try {
      const pending = await lookupPendingCheckoutOrder();
      if (pending.paid && pending.orderId) {
        window.location.replace(`/odeme/basarili?order=${encodeURIComponent(pending.orderId)}`);
        return;
      }
      const retryOrderId = pending.awaitingPayment ? pending.orderId : null;
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-idempotency-key": getOrCreateCheckoutIdempotencyKey(),
      };
      if (sessionData.session?.access_token) headers.authorization = `Bearer ${sessionData.session.access_token}`;

      const checkoutAddress = isCorporateNetworkMailPurchase && corporateNetworkMailTarget
        ? {
            addressLine: form.addressLine || corporateNetworkMailTarget.billingAddress,
            district: form.district || corporateNetworkMailTarget.billingDistrict,
            city: form.city || corporateNetworkMailTarget.billingCity,
            postalCode: form.postalCode || corporateNetworkMailTarget.billingPostalCode || null,
          }
        : {
            addressLine: form.addressLine,
            district: form.district,
            city: form.city,
            postalCode: form.postalCode || null,
          };

      const response = await fetch("/api/commerce/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers,
        body: JSON.stringify({
          items: items.map((item) => ({ productSlug: item.productId, variantSku: item.variantSku, quantity: item.quantity, configuration: item.configuration })),
          customer: { name: form.recipientName.trim(), email: form.email.trim().toLowerCase(), phone: form.phone },
          company: hasCorporatePackage ? { entityType: form.companyEntityType, name: form.companyName.trim(), taxNumber: form.companyTaxNumber, taxOffice: form.companyTaxOffice.trim() } : undefined,
          shipping: {
            recipientName: form.recipientName.trim(),
            phone: form.phone,
            addressLine: digitalOnlyCart ? digitalServiceBillingAddress(checkoutAddress.city, checkoutAddress.addressLine) : checkoutAddress.addressLine.trim(),
            district: checkoutAddress.district.trim(),
            city: checkoutAddress.city.trim(),
            postalCode: checkoutAddress.postalCode,
            deliveryNote: digitalOnlyCart ? null : form.deliveryNote || null,
            latitude: digitalOnlyCart ? null : form.latitude ?? null,
            longitude: digitalOnlyCart ? null : form.longitude ?? null,
            countryCode: "TR",
          },
          retryOrderId,
          consents: {
            distanceSalesAccepted: form.distanceSalesAccepted,
            personalizationAccepted: form.personalizationAccepted,
            distanceSalesVersion: legalVersions.distanceSales,
            personalizationVersion: legalVersions.personalization,
            privacyVersion: legalVersions.privacy,
          },
        }),
      });
      const checkout = await response.json();
      if (!response.ok) {
        if (checkout.orderId) setPendingCheckoutOrderId(checkout.orderId);
        if (checkout.retryable) rotateCheckoutIdempotencyKey();
        if (checkout.resetOrder) clearPendingCheckoutOrderId();
        throw new Error(checkoutFailureMessage(checkout));
      }
      if (!checkout.paymentPageUrl) throw new Error("Ödeme sayfası oluşturulamadı.");
      if (checkout.orderId) setPendingCheckoutOrderId(checkout.orderId);
      track("payment_start", { orderId: checkout.orderId, reused: Boolean(checkout.reused) });
      window.location.href = checkout.paymentPageUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ödeme başlatılamadı.";
      setMessage(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  const isCheckoutState = !checkoutReady || requiresPortalLogin || !items.length;

  return (
    <main id="main-content" className={`checkout-page p5-checkout-page yi-footer-compact${isCheckoutState ? " checkout-page--state" : ""}`}>
      <section className="checkout-shell checkout-confirm-shell">
          <div className="checkout-heading checkout-heading-compact">
            <h1>{hasCorporatePackage ? "Kurumsal siparişini güvenle tamamla." : hasNetworkMailCreditPack ? "Network Mail paketini güvenle tamamla." : digitalOnlyCart ? "Dijital hizmetini güvenle tamamla." : "Siparişini güvenle tamamla."}</h1>
            <p>{hasCorporatePackage ? `Fatura ve teslimat bilgilerini doğrula. Kart bilgilerin yalnızca ${paymentProviderName}’ın güvenli ödeme ekranında işlenir; Yenomi’de saklanmaz.` : isCorporateNetworkMailPurchase ? "Şirketinin kayıtlı cari/fatura profili bu siparişe uygulanır. Kart bilgilerin yalnız ödeme sağlayıcısında işlenir." : hasNetworkMailCreditPack ? "Fatura bilgilerini doğrula. Ödeme onaylanınca Network Mail kredilerin hesabına eklenir." : digitalOnlyCart ? `Fatura ili ve ilçesini doğrula. Teslimat adresi yok; kart bilgilerin yalnızca ${paymentProviderName}’da işlenir.` : `Alıcı ve teslimat bilgilerini doğrula. Kart bilgilerin yalnızca ${paymentProviderName}’da işlenir; Yenomi’de saklanmaz.`}</p>
            <div className="checkout-account-note" role="status">
              {isAuthenticated ? (
                <><Icon name="check" /> Hesabın bağlı. Siparişin hesabına otomatik eklenir.</>
              ) : (
                <><Icon name="mail" /> Hesap açmadan ilerleyebilirsin; siparişini daha sonra bu e-posta ile hesabına bağlayabilirsin.</>
              )}
            </div>
            <div className="checkout-trust-row checkout-trust-row-compact" aria-label="Sipariş avantajları">
              <span><Icon name="shield" />Kart bilgilerin yalnızca {paymentProviderName}’da işlenir</span>
              {!digitalOnlyCart && <span><Icon name="truck" />{COMMERCIAL_FULFILLMENT.domesticShipping}</span>}
              {hasInitialBundle && <span><Icon name="clock" />Ana kart {COMMERCIAL_FULFILLMENT.handover.toLocaleLowerCase()}</span>}
              {hasDigitalMembership && <span><Icon name="shield" />1 yıl platform üyeliği dahil</span>}
              {hasExtraCard && <span><Icon name="shield" />Mevcut Yenomi ID hizmetine bağlı</span>}
              {hasRenewal && <span><Icon name="shield" />Yalnız dijital hizmet yenilemesi</span>}
              {hasNetworkMailCreditPack && <span><Icon name="mail" />Krediler ödeme onayında hesabına eklenir</span>}
              {hasReplacement && <span><Icon name="shield" />Mevcut profilin korunur</span>}
              {hasCorporatePackage && <span><Icon name="building" />Kurumsal fatura: şirket türüne uygun vergi kimliği ve vergi dairesi</span>}
              {hasCorporatePackage && <span><Icon name="clock" />NFC kartlar {COMMERCIAL_FULFILLMENT.handover.toLocaleLowerCase()}</span>}
              {hasCorporatePackage && <span><Icon name="shield" />1 yıllık kurumsal sistem</span>}
            </div>
          </div>

          {!checkoutReady ? (
            <div className="cart-empty checkout-empty-state"><h2>Sipariş yükleniyor…</h2><p>Henüz bir ödeme alınmadı. Sepetin kontrol ediliyor.</p></div>
          ) : requiresPortalLogin ? (
            <div className="cart-empty checkout-empty-state" role="status"><h2>Giriş sayfasına yönlendiriliyorsun…</h2><p>Portal erişimi içeren paketler ödeme öncesinde hesabınla eşleştirilir. Sepetin korunur.</p></div>
          ) : !items.length ? (
            <div className="cart-empty checkout-empty-state"><h2>Kartın henüz sepette değil.</h2><Link className="yi-btn yi-btn--primary" href="/urunler/nfc-kart">Kartını Oluştur</Link></div>
          ) : (
            <form onSubmit={submit} className="checkout-layout checkout-layout-confirm" noValidate>
              <div className="checkout-accordion">
                <section className={`checkout-step ${activeStep === "buyer" ? "open" : ""} ${buyerComplete ? "complete" : ""}`}>
                  <button type="button" className="checkout-step-trigger" onClick={() => setActiveStep("buyer")}>
                    <span className="checkout-step-icon"><Icon name="contact" /></span>
                  <span><strong>{hasCorporatePackage ? "Fatura ve şirket bilgileri" : isCorporateNetworkMailPurchase ? "Sipariş sorumlusu ve şirket profili" : "Alıcı bilgileri"}</strong><small>{hasCorporatePackage ? "Sipariş sahibi ve korunan kurumsal kayıt" : isCorporateNetworkMailPurchase ? "Sorumlu kişi ve şirketin kayıtlı cari bilgileri" : "Sipariş ve fatura bilgileri"}</small></span>
                  </button>
                  {activeStep === "buyer" && <div className="checkout-step-body">
                    <label>Ad Soyad<input required autoComplete="name" value={form.recipientName} onChange={(event) => update("recipientName", event.target.value)} /></label>
                    <label>Telefon<input required inputMode="tel" autoComplete="tel" value={form.phone} onChange={(event) => update("phone", normalizeTrPhone(event.target.value))} /></label>
                    <label>E-posta<input required type="email" autoComplete="email" value={form.email} onChange={(event) => !isAuthenticated && update("email", event.target.value)} readOnly={isAuthenticated} /></label>
                    {isCorporateNetworkMailPurchase ? <fieldset className="checkout-company-fields" aria-describedby="corporate-billing-note">
                      <legend><Icon name="building" />Kayıtlı şirket fatura profili</legend>
                      <p id="corporate-billing-note">Bu bilgiler şirketinin cari kaydından gelir ve ödeme sırasında değiştirilemez.</p>
                      {corporateNetworkMailTarget ? <div className="checkout-company-fields__grid">
                        <label>Resmî unvan<input value={corporateNetworkMailTarget.legalName} readOnly /></label>
                        <label>Vergi no<input value={corporateNetworkMailTarget.taxNumber} readOnly /></label>
                        <label>Vergi dairesi<input value={corporateNetworkMailTarget.taxOffice || "Kayıtlı değil"} readOnly /></label>
                        <label>Fatura adresi<input value={[corporateNetworkMailTarget.billingAddress, corporateNetworkMailTarget.billingDistrict, corporateNetworkMailTarget.billingCity].filter(Boolean).join(", ") || "Kayıtlı değil"} readOnly /></label>
                      </div> : <p>Şirket fatura profili doğrulanıyor…</p>}
                    </fieldset> : null}
                    {hasCorporatePackage ? <fieldset className="checkout-company-fields" aria-describedby="company-billing-note">
                      <legend><Icon name="building" />Kurumsal fatura bilgileri</legend>
                      <p id="company-billing-note">Şahıs işletmesinde 11 haneli T.C. kimlik numarası, limited ve anonim şirkette 10 haneli VKN ile vergi dairesi zorunludur. Ödeme tamamlandığında bu kayıt şirketine aktarılır ve kurumsal panelden değiştirilemez.</p>
                      <div className="checkout-company-fields__grid">
                        <label>Şirket türü<select required value={form.companyEntityType} onChange={(event) => { update("companyEntityType", event.target.value as FormState["companyEntityType"]); update("companyTaxNumber", ""); }}><option value="">Şirket türünü seç</option><option value="SOLE_PROPRIETORSHIP">Şahıs işletmesi</option><option value="LIMITED_COMPANY">Limited şirket</option><option value="JOINT_STOCK_COMPANY">Anonim şirket</option></select></label>
                        <label>Şirket unvanı<input required autoComplete="organization" value={form.companyName} onChange={(event) => update("companyName", event.target.value)} /></label>
                        <label>{form.companyEntityType === "SOLE_PROPRIETORSHIP" ? "11 haneli T.C. kimlik no" : "10 haneli VKN"}<input required inputMode="numeric" maxLength={form.companyEntityType === "SOLE_PROPRIETORSHIP" ? 11 : 10} autoComplete="off" value={form.companyTaxNumber} onChange={(event) => update("companyTaxNumber", event.target.value.replace(/\D/g, ""))} /></label>
                        <label>Vergi dairesi<input required autoComplete="off" value={form.companyTaxOffice} onChange={(event) => update("companyTaxOffice", event.target.value)} /></label>
                      </div>
                    </fieldset> : null}
                    <button type="button" className="checkout-next" onClick={advanceBuyer}>{digitalOnlyCart ? "Fatura adresine geç" : "Teslimatı doğrula"} <Icon name="chevronRight" /></button>
                  </div>}
                </section>

                <section className={`checkout-step ${activeStep === "shipping" ? "open" : ""} ${shippingComplete ? "complete" : ""}`}>
                  <button type="button" className="checkout-step-trigger" onClick={() => buyerComplete && setActiveStep("shipping")} disabled={!buyerComplete}>
                    <span className="checkout-step-icon"><Icon name="map" /></span>
                    <span><strong>{digitalOnlyCart ? "Fatura adresi" : "Teslimat"}</strong><small>{digitalOnlyCart ? "Ödeme ve fatura doğrulaması için" : "Türkiye içi ücretsiz teslimat"}</small></span>
                  </button>
                  {activeStep === "shipping" && <div className="checkout-step-body">
                    {isCorporateNetworkMailPurchase ? <div className="checkout-company-fields" aria-live="polite">
                      <strong><Icon name="building" />Kayıtlı fatura adresi</strong>
                      {corporateNetworkMailTarget ? <p>{[corporateNetworkMailTarget.billingAddress, corporateNetworkMailTarget.billingDistrict, corporateNetworkMailTarget.billingCity, corporateNetworkMailTarget.billingPostalCode].filter(Boolean).join(", ") || "Şirket fatura profili eksik."}</p> : <p>Şirket fatura profili doğrulanıyor…</p>}
                    </div> : digitalOnlyCart ? <>
                      <label>Şehir<select required value={form.city} onChange={(event) => { update("city", event.target.value); update("district", ""); }}><option value="">Şehir seç</option>{TURKEY_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
                      <label>İlçe<input required autoComplete="address-level2" value={form.district} onChange={(event) => update("district", event.target.value)} /></label>
                    </> : <>
                      <div className="checkout-address-tools"><Button type="button" variant="secondary" size="sm" onClick={useLocation} disabled={locationBusy}><Icon name="map" />{locationBusy ? "Konum aranıyor…" : "Konumu Algıla"}</Button></div>
                      <label>Açık adres<textarea required autoComplete="street-address" value={form.addressLine} onChange={(event) => update("addressLine", event.target.value)} rows={3} /></label>
                      <label>Şehir<select required value={form.city} onChange={(event) => { update("city", event.target.value); update("district", ""); }}><option value="">Şehir seç</option>{TURKEY_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
                      <label>İlçe<input required autoComplete="address-level2" value={form.district} onChange={(event) => update("district", event.target.value)} /></label>
                      {deliveryNoteOpen ? <label>Teslimat notu<textarea value={form.deliveryNote} onChange={(event) => update("deliveryNote", event.target.value)} rows={2} /></label> : <Button type="button" variant="ghost" size="sm" onClick={() => setDeliveryNoteOpen(true)}>+ Teslimat notu ekle</Button>}
                    </>}
                    <button type="button" className="checkout-next" onClick={advanceShipping}>Onaylara geç <Icon name="chevronRight" /></button>
                  </div>}
                </section>

                <section className={`checkout-step ${activeStep === "approval" ? "open" : ""} ${approvalComplete ? "complete" : ""}`}>
                  <button type="button" className="checkout-step-trigger" onClick={() => buyerComplete && shippingComplete && setActiveStep("approval")} disabled={!buyerComplete || !shippingComplete}>
                    <span className="checkout-step-icon"><Icon name="shield" /></span>
                    <span><strong>Onay ve ödeme</strong><small>Kart bilgisi {paymentProviderName}’da girilir</small></span>
                  </button>
                  {activeStep === "approval" && <div className="checkout-step-body">
                    <label className="checkout-consent">
                      <input type="checkbox" checked={form.distanceSalesAccepted} onChange={(event) => update("distanceSalesAccepted", event.target.checked)} />
                      <span><Link href="/mesafeli-satis-sozlesmesi" target="_blank">Mesafeli Satış Sözleşmesini</Link> ve ön bilgilendirme metinlerini kabul ediyorum.</span>
                    </label>
                    <label className="checkout-consent">
                      <input type="checkbox" checked={form.personalizationAccepted} onChange={(event) => update("personalizationAccepted", event.target.checked)} />
                      <span>Kişiselleştirilmiş ürün koşullarını ve <Link href="/kvkk" target="_blank">KVKK</Link> Aydınlatma Metnini kabul ediyorum.</span>
                    </label>
                    <button type="submit" className="checkout-pay checkout-pay-button" disabled={busy}>{busy ? "Güvenli ödeme hazırlanıyor…" : `${formatTryFromKurus(total)} ile güvenli ödemeye geç`}</button>
                  </div>}
                </section>
              </div>

              <aside className="checkout-summary-panel">
                <div className="checkout-summary-head">
                  <span>SİPARİŞ ÖZETİ</span>
                </div>
                <div className="checkout-summary-items">
                  {items.map((item) => (
                    <div key={item.cartItemId} className="checkout-summary-row">
                      <div>
                        <strong>{item.name}</strong>
                        <span>{item.quantity} adet · {formatTryFromKurus(item.unitPriceKurus)}</span>
                      </div>
                      <b>{formatTryFromKurus(item.unitPriceKurus * item.quantity)}</b>
                    </div>
                  ))}
                </div>
                <div className="checkout-summary-total">
                  <span>Toplam Sipariş Tutarı</span>
                  <strong>{formatTryFromKurus(total)}</strong>
                </div>
                <div className="checkout-summary-benefits">
                  <span><Icon name="check" /> Kart bilgilerin yalnızca {paymentProviderName}’da işlenir</span>
                  {!hasNetworkMailCreditPack && <span><Icon name="check" /> 1 yıl platform üyeliği dahil</span>}
                  {!digitalOnlyCart && <span><Icon name="check" /> Türkiye içi kargo dahil</span>}
                  {hasNetworkMailCreditPack && <span><Icon name="check" /> Kredi satın alımı · teslimat yok</span>}
                  <span><Icon name="check" /> Kart numarası Yenomi’de saklanmaz</span>
                </div>
              </aside>
            </form>
          )}
          {message ? <div className="checkout-message" role="alert">{message}</div> : null}
          {toast ? <div role="status">{toast}</div> : null}
          {hasPremiumUpgrade || hasBusinessCapacity || organizationTargets ? null : null}
          <button type="button" hidden onClick={() => router.refresh()} aria-hidden="true" />
      </section>
    </main>
  );
}
