"use client";

import { useEffect, useState } from "react";
import { detectNetworkingLocale, type NetworkingLocale } from "../../../lib/networking/catalog";
import { instantConnectErrorMessage } from "../../../lib/networking/instant-connect";
import { normalizeContactPhone } from "../../../lib/networking/contact-phone";
import { getBrowserSession } from "../../../lib/auth/get-browser-session";
import { Avatar, Button, Field, Input, Skeleton } from "../ui/DesignSystem";
import { Icon } from "../../icons";
import InstantConnectScanner, { type InstantConnectScannerCopy } from "./InstantConnectScanner";

type Copy = {
  title: string;
  body: string;
  language: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  professional: string;
  submit: string;
  submitting: string;
  invalidPhone: string;
  successTitle: string;
  successBody: string;
  instantTitle: string;
  instantDescription: string;
  instantProfileNote: string;
  instantSubmit: string;
  instantSubmitting: string;
  instantSuccessTitle: string;
  instantSuccessBody: string;
  instantExistingBody: string;
  qrSwap: string;
  qrDescription: string;
  alternativeTitle: string;
  alternativeBody: string;
  privacy: string;
  cancel: string;
  done: string;
  scanner: InstantConnectScannerCopy;
};

type ContactForm = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  position: string;
};

type InstantIdentity = {
  profileId: string;
  name: string;
  role: string;
  company: string | null;
  imageUrl: string | null;
};

const EMPTY_CONTACT_FORM: ContactForm = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  position: "",
};

const COPY: Record<NetworkingLocale, Copy> = {
  tr: {
    title: "Bağlantı Kur",
    body: "Tanıştıysak iletişimde kalalım.",
    language: "Dil",
    name: "Ad Soyad",
    email: "E-posta",
    phone: "Telefon",
    company: "Şirket",
    position: "Pozisyon",
    professional: "+ Profesyonel bilgi ekle",
    submit: "Bilgilerimi Paylaş",
    submitting: "Paylaşılıyor…",
    invalidPhone: "Telefon numarasını ülke koduyla birlikte geçerli formatta girin.",
    successTitle: "Bağlantı kuruldu",
    successBody: "Bilgileriniz {name} ile paylaşıldı.",
    instantTitle: "Yenomi ID ile 1-Tıkla Bağlan",
    instantDescription: "Profiliniz kart sahibine güvenli olarak paylaşılır.",
    instantProfileNote: "Yalnızca bu bağlantı için paylaşılır.",
    instantSubmit: "Profilim ile Otomatik Paylaş",
    instantSubmitting: "Bağlantı kuruluyor…",
    instantSuccessTitle: "Kartlar karşılıklı eklendi",
    instantSuccessBody: "{name} ile dijital kartlarınız bağlantılarınıza eklendi.",
    instantExistingBody: "Bu kartla bağlantınız zaten mevcut.",
    qrSwap: "QR Kod Okutarak Kart Takası Yap",
    qrDescription: "Kendi Yenomi ID QR kodunuzu okutarak iki kartı karşılıklı ekleyin.",
    alternativeTitle: "Alternatif iletişim formu",
    alternativeBody: "Yenomi ID kullanmıyorsanız bilgilerinizi buradan bırakabilirsiniz.",
    privacy: "Bilgileriniz yalnızca bağlantı kurduğunuz kart sahibiyle paylaşılır.",
    cancel: "Vazgeç",
    done: "Tamam",
    scanner: {
      title: "Yenomi ID QR kodunu okutun",
      description: "Diğer kişinin dijital kartındaki QR kodunu kameraya hizalayın.",
      preparing: "Kamera hazırlanıyor…",
      unsupported: "Kamera kullanılamadı. QR bağlantısını aşağıya yapıştırarak devam edebilirsiniz.",
      manualLabel: "QR bağlantısını yapıştırın",
      manualPlaceholder: "https://qr.yenomilabs.com/p/…",
      manualSubmit: "Kart takasını tamamla",
      invalid: "Geçerli bir Yenomi ID QR bağlantısı bulunamadı.",
      privacy: "Kart takası yalnızca yayınlanmış ve aktif Yenomi ID profilleri arasında yapılır.",
      cancel: "Vazgeç",
      processing: "Kartlar ekleniyor…",
    },
  },
  en: {
    title: "Connect",
    body: "If we met, let’s stay in touch.",
    language: "Language",
    name: "Full name",
    email: "Email",
    phone: "Phone",
    company: "Company",
    position: "Role",
    professional: "+ Add professional details",
    submit: "Share My Details",
    submitting: "Sharing…",
    invalidPhone: "Enter a valid phone number, including the country code when applicable.",
    successTitle: "Connected",
    successBody: "Your details were shared with {name}.",
    instantTitle: "Connect with Yenomi ID in one tap",
    instantDescription: "Your profile is securely shared with this card owner.",
    instantProfileNote: "Shared only for this connection.",
    instantSubmit: "Share My Profile Automatically",
    instantSubmitting: "Connecting…",
    instantSuccessTitle: "Cards added to both connections",
    instantSuccessBody: "Your digital cards were added to both connections with {name}.",
    instantExistingBody: "You are already connected with this card.",
    qrSwap: "Scan a QR Code to Exchange Cards",
    qrDescription: "Scan your Yenomi ID QR code to add both cards to each other’s connections.",
    alternativeTitle: "Alternative contact form",
    alternativeBody: "If you do not use Yenomi ID, you can leave your details here.",
    privacy: "Your details are shared only with the card owner you connected with.",
    cancel: "Cancel",
    done: "Done",
    scanner: {
      title: "Scan a Yenomi ID QR code",
      description: "Align the other person’s digital card QR code with the camera.",
      preparing: "Preparing camera…",
      unsupported: "The camera is unavailable. Paste the QR link below to continue.",
      manualLabel: "Paste the QR link",
      manualPlaceholder: "https://qr.yenomilabs.com/p/…",
      manualSubmit: "Complete card exchange",
      invalid: "We could not find a valid Yenomi ID QR link.",
      privacy: "Card exchange is limited to live, published Yenomi ID profiles.",
      cancel: "Cancel",
      processing: "Adding cards…",
    },
  },
};

function getVisitorId() {
  const storageKey = "yenomi_vid";
  try {
    const storedVisitorId = window.localStorage.getItem(storageKey);
    if (storedVisitorId) return storedVisitorId;

    const newVisitorId = crypto.randomUUID();
    window.localStorage.setItem(storageKey, newVisitorId);
    return newVisitorId;
  } catch {
    return crypto.randomUUID();
  }
}

export default function NetworkingCapture({
  profileId,
  profileName,
  organizationName,
  eventId,
  eventLinkId,
  eventName,
  source = "QR",
  locale: localeProp,
  onLocaleChange,
}: {
  profileId: string;
  profileName: string;
  organizationName?: string | null;
  eventId?: string | null;
  eventLinkId?: string | null;
  eventName?: string | null;
  source?: "QR" | "NFC" | "EVENT" | "SHARE";
  locale?: NetworkingLocale;
  onLocaleChange?: (locale: NetworkingLocale) => void;
}) {
  const [internalLocale, setInternalLocale] = useState<NetworkingLocale>(localeProp || "tr");
  const locale = localeProp || internalLocale;
  const setLocale = onLocaleChange || setInternalLocale;
  const [identity, setIdentity] = useState<InstantIdentity | null>(null);
  const [identityLoading, setIdentityLoading] = useState(true);
  const [showProfessional, setShowProfessional] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [instantSubmitting, setInstantSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [status, setStatus] = useState<"form" | "contact-success" | "handshake-success">("form");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [contactForm, setContactForm] = useState<ContactForm>(EMPTY_CONTACT_FORM);

  useEffect(() => {
    if (!localeProp) setInternalLocale(detectNetworkingLocale(navigator.language));
  }, [localeProp]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { accessToken } = await getBrowserSession();
        if (!accessToken) return;
        const response = await fetch("/api/networking/instant-connect", {
          headers: { authorization: "Bearer " + accessToken },
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = await response.json() as { identity?: InstantIdentity | null };
        if (!cancelled) setIdentity(payload.identity || null);
      } finally {
        if (!cancelled) setIdentityLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const copy = COPY[locale];
  const ownerName = profileName || organizationName || "Yenomi";

  async function submitContact() {
    if (submitting) return;

    const normalizedPhone = normalizeContactPhone(contactForm.phone);
    if (!normalizedPhone.valid) {
      setErrorMessage(copy.invalidPhone);
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/networking/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profileId,
          visitorId: getVisitorId(),
          eventId: eventId || undefined,
          source: eventId ? "EVENT" : source,
          locale,
          requestMeeting: false,
          fullName: contactForm.fullName.trim(),
          email: contactForm.email.trim(),
          phone: normalizedPhone.value || "",
          company: contactForm.company.trim(),
          position: contactForm.position.trim(),
          interests: [],
          introduction: "",
        }),
      });
      const responseBody = await response.json().catch(() => ({ error: "" })) as { error?: string };
      if (!response.ok) {
        setErrorMessage(responseBody.error || copy.submit);
        return;
      }
      setStatusMessage(copy.successBody.replace("{name}", ownerName));
      setStatus("contact-success");
    } catch {
      setErrorMessage(locale === "tr" ? "Bilgiler kaydedilemedi. Lütfen tekrar deneyin." : "Your details could not be saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function createHandshake(input: { kind: "ACCOUNT"; sourceProfileId: string } | { kind: "QR"; sourcePublicId: string }) {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (input.kind === "ACCOUNT") {
      const { accessToken } = await getBrowserSession();
      if (!accessToken) return { ok: false, error: instantConnectErrorMessage("AUTH_REQUIRED", locale) };
      headers.authorization = "Bearer " + accessToken;
    }

    try {
      const response = await fetch("/api/networking/instant-connect", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...input,
          targetProfileId: profileId,
          source,
          locale,
          eventId: eventId || null,
          eventLinkId: eventLinkId || null,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean; created?: boolean; code?: string };
      if (!response.ok || !payload.ok) return { ok: false, error: instantConnectErrorMessage(payload.code, locale) };
      setStatusMessage(payload.created ? copy.instantSuccessBody.replace("{name}", ownerName) : copy.instantExistingBody);
      setStatus("handshake-success");
      return { ok: true };
    } catch {
      return { ok: false, error: instantConnectErrorMessage("HANDSHAKE_FAILED", locale) };
    }
  }

  async function submitInstantConnect() {
    if (!identity || instantSubmitting) return;
    setInstantSubmitting(true);
    setErrorMessage("");
    const result = await createHandshake({ kind: "ACCOUNT", sourceProfileId: identity.profileId });
    if (!result.ok) setErrorMessage(result.error || instantConnectErrorMessage("HANDSHAKE_FAILED", locale));
    setInstantSubmitting(false);
  }

  function reset() {
    setStatus("form");
    setStatusMessage("");
    setErrorMessage("");
    setShowProfessional(false);
  }

  return (
    <section className="p12-section p12-networking" aria-labelledby="p12-networking-title">
      <div className="p12-section-heading">
        <div>
          <h2 id="p12-networking-title">{copy.title}</h2>
          <p>{copy.body}</p>
        </div>
        <div className="p12-locale-switch" role="group" aria-label={copy.language}>
          <button type="button" className={locale === "tr" ? "is-active" : ""} onClick={() => setLocale("tr")}>TR</button>
          <button type="button" className={locale === "en" ? "is-active" : ""} onClick={() => setLocale("en")}>EN</button>
        </div>
      </div>

      {eventName && <p className="p12-event-badge">{eventName}</p>}

      {status !== "form" ? (
        <div className="p12-networking-success p12-networking-success--instant" role="status">
          <span aria-hidden="true"><Icon name="check" /></span>
          <div>
            <strong>{status === "handshake-success" ? copy.instantSuccessTitle : copy.successTitle}</strong>
            <p>{statusMessage}</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={reset}>{copy.done}</Button>
        </div>
      ) : (
        <>
          {identityLoading ? (
            <div className="p12-instant-connect-skeleton" aria-hidden="true"><Skeleton height={156} /></div>
          ) : identity && identity.profileId !== profileId ? (
            <section className="p12-instant-connect" aria-labelledby="p12-instant-connect-title">
              <header><Icon name="bolt" /><strong id="p12-instant-connect-title">{copy.instantTitle}</strong></header>
              <div className="p12-instant-connect__identity">
                <Avatar name={identity.name} src={identity.imageUrl || undefined} size="md" />
                <div>
                  <strong>{identity.name}</strong>
                  <span>{[identity.role, identity.company].filter(Boolean).join(" · ")}</span>
                  <small><Icon name="check" /> {copy.instantProfileNote}</small>
                </div>
              </div>
              <p>{copy.instantDescription}</p>
              <Button type="button" variant="primary" className="p12-instant-connect__submit" onClick={() => void submitInstantConnect()} disabled={instantSubmitting} aria-busy={instantSubmitting}>
                <Icon name="bolt" /> {instantSubmitting ? copy.instantSubmitting : identity.name + " " + copy.instantSubmit}
              </Button>
            </section>
          ) : null}

          <Button type="button" variant="secondary-strong" className="p12-instant-connect__qr" onClick={() => setScannerOpen(true)}>
            <Icon name="camera" /> {copy.qrSwap}
          </Button>
          <p className="p12-instant-connect__qr-description">{copy.qrDescription}</p>
          {errorMessage && <p className="p12-networking-message" role="alert">{errorMessage}</p>}

          <form className="p12-networking-form" onSubmit={(event) => { event.preventDefault(); void submitContact(); }}>
            <div className="p12-networking-form__intro">
              <strong>{copy.alternativeTitle}</strong>
              <p>{copy.alternativeBody}</p>
            </div>
            <div className="p12-networking-fields">
              <Field label={copy.name} required><Input required maxLength={120} autoComplete="name" value={contactForm.fullName} onChange={(event) => setContactForm((currentForm) => ({ ...currentForm, fullName: event.target.value }))} /></Field>
              <Field label={copy.email} required><Input required maxLength={254} type="email" autoComplete="email" value={contactForm.email} onChange={(event) => setContactForm((currentForm) => ({ ...currentForm, email: event.target.value }))} /></Field>
              <Field label={copy.phone}><Input maxLength={40} type="tel" inputMode="tel" autoComplete="tel" value={contactForm.phone} onChange={(event) => setContactForm((currentForm) => ({ ...currentForm, phone: event.target.value }))} /></Field>
            </div>

            {!showProfessional ? (
              <button type="button" className="p12-networking-disclosure" onClick={() => setShowProfessional(true)}>{copy.professional}</button>
            ) : (
              <div className="p12-networking-fields p12-networking-professional">
                <Field label={copy.company}><Input maxLength={160} autoComplete="organization" value={contactForm.company} onChange={(event) => setContactForm((currentForm) => ({ ...currentForm, company: event.target.value }))} /></Field>
                <Field label={copy.position}><Input maxLength={120} autoComplete="organization-title" value={contactForm.position} onChange={(event) => setContactForm((currentForm) => ({ ...currentForm, position: event.target.value }))} /></Field>
              </div>
            )}

            <p className="p12-networking-privacy">{copy.privacy}</p>
            <div className="p12-networking-form-actions">
              <Button type="submit" variant="primary" disabled={submitting} aria-busy={submitting}>{submitting ? copy.submitting : copy.submit}</Button>
              <Button type="button" variant="ghost" className="p12-networking-back" onClick={reset} disabled={submitting}>{copy.cancel}</Button>
            </div>
          </form>
        </>
      )}

      <InstantConnectScanner
        open={scannerOpen}
        copy={copy.scanner}
        onClose={() => setScannerOpen(false)}
        onScan={(sourcePublicId) => createHandshake({ kind: "QR", sourcePublicId })}
      />
    </section>
  );
}
