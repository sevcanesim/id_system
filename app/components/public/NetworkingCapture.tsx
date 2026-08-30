"use client";

import { useEffect, useState } from "react";
import { detectNetworkingLocale, type NetworkingLocale } from "../../../lib/networking/catalog";

type Copy = {
  stayInTouch: string;
  stayBody: string;
  share: string;
  shareHint: string;
  qrOption: string;
  qrHint: string;
  qrExplanation: string;
  qrYenomi: string;
  qrOther: string;
  language: string;
  name: string;
  email: string;
  company: string;
  position: string;
  phone: string;
  submit: string;
  success: string;
  privacy: string;
  back: string;
};

const COPY: Record<NetworkingLocale, Copy> = {
  tr: {
    stayInTouch: "Bağlantı Kur",
    stayBody: "Bilgilerinizi paylaşın. Tanışma sonrası iletişimi kart sahibi yönetsin.",
    share: "İletişim Bilgilerimi Paylaş",
    shareHint: "Ad, e-posta ve telefonunuzu kart sahibine iletin",
    qrOption: "QR Kartımı Paylaş",
    qrHint: "Dijital kartınız varsa bilgilerinizi form doldurmadan aktarın",
    qrExplanation: "QR kartınızı kart sahibine gösterin. Yenomi kartları doğrudan eşleşir; vCard veya uyumlu dijital kartlar kişi kaydına dönüştürülebilir.",
    qrYenomi: "Yenomi QR: doğrudan bağlantı",
    qrOther: "vCard / uyumlu QR: kişi bilgilerini aktar",
    language: "Dil",
    name: "Ad Soyad",
    email: "E-posta",
    company: "Şirket",
    position: "Pozisyon",
    phone: "Telefon",
    submit: "Bilgilerimi Paylaş",
    success: "iletişim bilgilerinizi aldı. Bundan sonraki aksiyonu kart sahibi yönetecek.",
    privacy: "Bilgileriniz yalnızca bağlantı kurduğunuz kart sahibiyle paylaşılır.",
    back: "Geri",
  },
  en: {
    stayInTouch: "Connect",
    stayBody: "Share your details and let the card owner manage the follow-up.",
    share: "Share My Contact",
    shareHint: "Send your name, email and phone to the card owner",
    qrOption: "Share My QR Card",
    qrHint: "Use your digital card instead of filling out a form",
    qrExplanation: "Show your QR card to the card owner. Yenomi cards connect directly; vCard or compatible digital cards can be converted into a contact record.",
    qrYenomi: "Yenomi QR: direct connection",
    qrOther: "vCard / compatible QR: import contact details",
    language: "Language",
    name: "Full name",
    email: "Email",
    company: "Company",
    position: "Position",
    phone: "Phone",
    submit: "Share My Contact",
    success: "received your contact details. The card owner will manage the next action.",
    privacy: "Your details are shared only with the card owner you connected with.",
    back: "Back",
  },
};

function visitorId() {
  const key = "yenomi_vid";
  try {
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(key, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

export default function NetworkingCapture({
  profileId,
  profileName,
  organizationName,
  eventId,
  eventName,
  source = "QR",
  locale: localeProp,
  onLocaleChange,
}: {
  profileId: string;
  profileName: string;
  organizationName?: string | null;
  eventId?: string | null;
  eventName?: string | null;
  source?: "QR" | "NFC" | "EVENT" | "SHARE";
  locale?: NetworkingLocale;
  onLocaleChange?: (locale: NetworkingLocale) => void;
}) {
  const [internalLocale, setInternalLocale] = useState<NetworkingLocale>(localeProp || "tr");
  const locale = localeProp || internalLocale;
  const setLocale = onLocaleChange || setInternalLocale;
  const [mode, setMode] = useState<"idle" | "share" | "qr">("idle");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    company: "",
    position: "",
    phone: "",
  });

  useEffect(() => {
    if (localeProp) return;
    setInternalLocale(detectNetworkingLocale(navigator.language));
  }, [localeProp]);

  const copy = COPY[locale];
  const company = organizationName || profileName;

  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/networking/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profileId,
          visitorId: visitorId(),
          eventId: eventId || undefined,
          source: eventId ? "EVENT" : source,
          locale,
          requestMeeting: false,
          fullName: form.fullName,
          email: form.email,
          company: form.company,
          position: form.position,
          phone: form.phone,
          interests: [],
          introduction: "",
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(payload.error || copy.submit);
        return;
      }
      setMode("idle");
      setMessage(`${company} ${copy.success}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="p12-section p12-networking" aria-labelledby="p12-networking-title">
      <div className="p12-section-heading">
        <h2 id="p12-networking-title">{copy.stayInTouch}</h2>
        <div className="p12-locale-switch" role="group" aria-label={copy.language}>
          <button type="button" className={locale === "tr" ? "is-active" : ""} onClick={() => setLocale("tr")}>TR</button>
          <button type="button" className={locale === "en" ? "is-active" : ""} onClick={() => setLocale("en")}>EN</button>
        </div>
      </div>
      {eventName && <p className="p12-event-badge">{eventName}</p>}
      <p>{copy.stayBody}</p>

      {mode === "idle" && (
        <div className="p12-networking-actions">
          <button type="button" className="p12-networking-cta" onClick={() => setMode("share")}>
            <strong>{copy.share}</strong>
            <span>{copy.shareHint}</span>
          </button>
          <button type="button" className="p12-networking-cta p12-networking-cta-secondary" onClick={() => setMode("qr")}>
            <strong>{copy.qrOption}</strong>
            <span>{copy.qrHint}</span>
          </button>
        </div>
      )}

      {mode === "share" && (
        <form className="p12-networking-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <label>{copy.name}<input required autoComplete="name" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} /></label>
          <label>{copy.email}<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
          <label>{copy.phone}<input type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
          <label>{copy.company}<input autoComplete="organization" value={form.company} onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))} /></label>
          <label>{copy.position}<input autoComplete="organization-title" value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} /></label>
          <p className="p12-networking-privacy">{copy.privacy}</p>
          <button type="submit" disabled={busy}>{busy ? "…" : copy.submit}</button>
          <button type="button" className="p12-networking-back" onClick={() => setMode("idle")}>{copy.back}</button>
        </form>
      )}

      {mode === "qr" && (
        <div className="p12-networking-qr" role="region" aria-label={copy.qrOption}>
          <p>{copy.qrExplanation}</p>
          <div className="p12-networking-qr-options">
            <span>{copy.qrYenomi}</span>
            <span>{copy.qrOther}</span>
          </div>
          <button type="button" className="p12-networking-back" onClick={() => setMode("idle")}>{copy.back}</button>
        </div>
      )}

      {message && <p className="p12-networking-message" role="status">{message}</p>}
    </section>
  );
}
