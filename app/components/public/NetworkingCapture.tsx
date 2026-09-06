"use client";

import { useEffect, useState } from "react";
import { detectNetworkingLocale, type NetworkingLocale } from "../../../lib/networking/catalog";
import { instantConnectErrorMessage } from "../../../lib/networking/instant-connect";
import { normalizeContactPhone } from "../../../lib/networking/contact-phone";
import { parseExternalQrPayload } from "../../../lib/networking/external-qr-contact";
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
  yenomiQrSwap: string;
  yenomiQrDescription: string;
  externalQrSwap: string;
  externalQrDescription: string;
  externalLinkTitle: string;
  externalLinkBody: string;
  externalLinkOpen: string;
  alternativeTitle: string;
  alternativeBody: string;
  alternativeOpen: string;
  alternativeClose: string;
  privacy: string;
  cancel: string;
  done: string;
  scanner: InstantConnectScannerCopy;
  externalScanner: InstantConnectScannerCopy;
};

type ContactForm = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  position: string;
};

type InstantIdentity = {
  publicId: string;
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
    yenomiQrSwap: "Yenomi ID QR kodunu okut",
    yenomiQrDescription: "Yenomi ID kullanan kişiyle kartlarınızı karşılıklı ekleyin.",
    externalQrSwap: "Başka kartın QR kodunu okut",
    externalQrDescription: "vCard, MECARD veya başka bir platformdaki profil bağlantısını okuyun.",
    externalLinkTitle: "Başka platformdaki kart algılandı",
    externalLinkBody: "Kart yeni sekmede açılır. İletişim bilgilerinizi bu kart sahibine paylaşmak isterseniz formu ayrıca açabilirsiniz.",
    externalLinkOpen: "Kartı yeni sekmede aç",
    alternativeTitle: "Alternatif iletişim formu",
    alternativeBody: "Yenomi ID kullanmıyorsanız bilgilerinizi buradan bırakabilirsiniz.",
    alternativeOpen: "Bilgilerimi form ile paylaş",
    alternativeClose: "Formu kapat",
    privacy: "Bilgileriniz yalnızca bağlantı kurduğunuz kart sahibiyle paylaşılır.",
    cancel: "Vazgeç",
    done: "Tamam",
    scanner: {
      eyebrow: "Yenomi ID",
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
    externalScanner: {
      eyebrow: "KART TAKASI",
      title: "Başka kartın QR kodunu okutun",
      description: "vCard, MECARD, e-posta, telefon veya profil bağlantısı içeren QR kodunu kameraya hizalayın.",
      preparing: "Kamera hazırlanıyor…",
      unsupported: "Kamera kullanılamadı. QR içeriğini aşağıya yapıştırarak devam edebilirsiniz.",
      manualLabel: "QR içeriğini yapıştırın",
      manualPlaceholder: "BEGIN:VCARD… veya https://…",
      manualSubmit: "QR kodunu oku",
      invalid: "Bu QR kodundan güvenli bir iletişim bilgisi okunamadı.",
      privacy: "QR içeriği yalnızca cihazınızda okunur; başka platforma otomatik istek gönderilmez.",
      cancel: "Vazgeç",
      processing: "QR kodu okunuyor…",
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
    yenomiQrSwap: "Scan a Yenomi ID QR code",
    yenomiQrDescription: "Add both cards to your connections when the other person uses Yenomi ID.",
    externalQrSwap: "Scan another card’s QR code",
    externalQrDescription: "Read a vCard, MECARD or profile link from another platform.",
    externalLinkTitle: "A card from another platform was detected",
    externalLinkBody: "The card opens in a new tab. You can separately open the form if you would also like to share your details with this card owner.",
    externalLinkOpen: "Open card in a new tab",
    alternativeTitle: "Alternative contact form",
    alternativeBody: "If you do not use Yenomi ID, you can leave your details here.",
    alternativeOpen: "Share my details with a form",
    alternativeClose: "Close form",
    privacy: "Your details are shared only with the card owner you connected with.",
    cancel: "Cancel",
    done: "Done",
    scanner: {
      eyebrow: "Yenomi ID",
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
    externalScanner: {
      eyebrow: "CARD EXCHANGE",
      title: "Scan another card’s QR code",
      description: "Align a QR code containing a vCard, MECARD, email, phone number or profile link with the camera.",
      preparing: "Preparing camera…",
      unsupported: "The camera is unavailable. Paste the QR content below to continue.",
      manualLabel: "Paste QR content",
      manualPlaceholder: "BEGIN:VCARD… or https://…",
      manualSubmit: "Read QR code",
      invalid: "We could not read a safe contact detail from this QR code.",
      privacy: "QR content is read only on your device; no request is automatically sent to another platform.",
      cancel: "Cancel",
      processing: "Reading QR code…",
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

function parseYenomiProfilePublicId(rawValue: string) {
  const value = rawValue.trim();
  if (/^[A-Za-z0-9]{8,32}$/.test(value)) return value;

  try {
    const url = new URL(value, window.location.origin);
    return url.pathname.match(/^\/p\/([A-Za-z0-9]{8,32})\/?$/)?.[1] || null;
  } catch {
    return null;
  }
}

export default function NetworkingCapture({
  profilePublicId,
  profileName,
  organizationName,
  eventId,
  eventLinkId,
  eventName,
  source = "QR",
  locale: localeProp,
  onLocaleChange,
}: {
  profilePublicId: string;
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
  const [showContactForm, setShowContactForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [instantSubmitting, setInstantSubmitting] = useState(false);
  const [scannerMode, setScannerMode] = useState<"yenomi" | "external" | null>(null);
  const [status, setStatus] = useState<"form" | "contact-success" | "handshake-success">("form");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [contactForm, setContactForm] = useState<ContactForm>(EMPTY_CONTACT_FORM);
  const [externalProfileUrl, setExternalProfileUrl] = useState<string | null>(null);

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
          profilePublicId,
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

  async function createHandshake(input: { kind: "ACCOUNT" } | { kind: "QR"; sourcePublicId: string }) {
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
          targetPublicId: profilePublicId,
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
    const result = await createHandshake({ kind: "ACCOUNT" });
    if (!result.ok) setErrorMessage(result.error || instantConnectErrorMessage("HANDSHAKE_FAILED", locale));
    setInstantSubmitting(false);
  }

  async function submitYenomiQr(rawValue: string) {
    const sourcePublicId = parseYenomiProfilePublicId(rawValue);
    if (!sourcePublicId) return { ok: false, error: copy.scanner.invalid };
    return createHandshake({ kind: "QR", sourcePublicId });
  }

  async function submitExternalQr(rawValue: string) {
    if (parseYenomiProfilePublicId(rawValue)) {
      return { ok: false, error: copy.yenomiQrDescription };
    }

    const payload = parseExternalQrPayload(rawValue);
    if (!payload) return { ok: false, error: copy.externalScanner.invalid };

    setErrorMessage("");
    if (payload.kind === "link") {
      setExternalProfileUrl(payload.url);
      return { ok: true };
    }

    setContactForm((currentForm) => ({
      fullName: payload.contact.fullName || currentForm.fullName,
      email: payload.contact.email || currentForm.email,
      phone: payload.contact.phone || currentForm.phone,
      company: payload.contact.company || currentForm.company,
      position: payload.contact.position || currentForm.position,
    }));
    setShowProfessional(Boolean(payload.contact.company || payload.contact.position));
    setShowContactForm(true);
    return { ok: true };
  }

  function openContactForm() {
    setExternalProfileUrl(null);
    setShowContactForm(true);
  }

  function reset() {
    setStatus("form");
    setStatusMessage("");
    setErrorMessage("");
    setShowProfessional(false);
    setShowContactForm(false);
    setExternalProfileUrl(null);
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
          ) : identity && identity.publicId !== profilePublicId ? (
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

          <div className="p12-connect-methods" aria-label={copy.title}>
            <div className="p12-connect-method">
              <Button type="button" variant="secondary-strong" className="p12-instant-connect__qr" onClick={() => setScannerMode("yenomi")}>
                <Icon name="camera" /> {copy.yenomiQrSwap}
              </Button>
              <p className="p12-instant-connect__qr-description">{copy.yenomiQrDescription}</p>
            </div>
            <div className="p12-connect-method">
              <Button type="button" variant="secondary" className="p12-instant-connect__qr p12-instant-connect__qr--external" onClick={() => setScannerMode("external")}>
                <Icon name="qr" /> {copy.externalQrSwap}
              </Button>
              <p className="p12-instant-connect__qr-description">{copy.externalQrDescription}</p>
            </div>
          </div>

          {externalProfileUrl && (
            <aside className="p12-external-qr-result" role="status">
              <span aria-hidden="true"><Icon name="external" /></span>
              <div>
                <strong>{copy.externalLinkTitle}</strong>
                <p>{copy.externalLinkBody}</p>
              </div>
              <a href={externalProfileUrl} target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer">
                {copy.externalLinkOpen} <Icon name="external" />
              </a>
            </aside>
          )}

          {errorMessage && <p className="p12-networking-message" role="alert">{errorMessage}</p>}

          {!showContactForm ? (
            <button
              type="button"
              className="p12-networking-form-toggle"
              aria-expanded="false"
              aria-controls="p12-alternative-contact-form"
              onClick={openContactForm}
            >
              <span className="p12-networking-form-toggle__icon" aria-hidden="true"><Icon name="contact" /></span>
              <span>
                <strong>{copy.alternativeTitle}</strong>
                <small>{copy.alternativeBody}</small>
              </span>
              <span className="p12-networking-form-toggle__action">{copy.alternativeOpen} <Icon name="chevronRight" /></span>
            </button>
          ) : (
            <form id="p12-alternative-contact-form" className="p12-networking-form" onSubmit={(event) => { event.preventDefault(); void submitContact(); }}>
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
                <Button type="button" variant="ghost" className="p12-networking-back" onClick={() => setShowContactForm(false)} disabled={submitting}>{copy.alternativeClose}</Button>
              </div>
            </form>
          )}
        </>
      )}

      <InstantConnectScanner
        open={scannerMode !== null}
        copy={scannerMode === "external" ? copy.externalScanner : copy.scanner}
        onClose={() => setScannerMode(null)}
        onScan={scannerMode === "external" ? submitExternalQr : submitYenomiQr}
      />
    </section>
  );
}
