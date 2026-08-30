"use client";

import { useEffect, useState } from "react";
import { detectNetworkingLocale, type NetworkingLocale } from "../../../lib/networking/catalog";

type Copy = {
  title: string;
  body: string;
  share: string;
  language: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  professional: string;
  submit: string;
  successTitle: string;
  successBody: string;
  privacy: string;
  cancel: string;
  done: string;
};

const COPY: Record<NetworkingLocale, Copy> = {
  tr: {
    title: "Bağlantı Kur",
    body: "Tanıştıysak iletişimde kalalım.",
    share: "Bilgilerimi Paylaş",
    language: "Dil",
    name: "Ad Soyad",
    email: "E-posta",
    phone: "Telefon",
    company: "Şirket",
    position: "Pozisyon",
    professional: "+ Profesyonel bilgi ekle",
    submit: "Bilgilerimi Paylaş",
    successTitle: "Bağlantı kuruldu",
    successBody: "Bilgileriniz {name} ile paylaşıldı.",
    privacy: "Bilgileriniz yalnızca bağlantı kurduğunuz kart sahibiyle paylaşılır.",
    cancel: "Vazgeç",
    done: "Tamam",
  },
  en: {
    title: "Connect",
    body: "If we met, let’s stay in touch.",
    share: "Share My Details",
    language: "Language",
    name: "Full name",
    email: "Email",
    phone: "Phone",
    company: "Company",
    position: "Position",
    professional: "+ Add professional details",
    submit: "Share My Details",
    successTitle: "Connected",
    successBody: "Your details were shared with {name}.",
    privacy: "Your details are shared only with the card owner you connected with.",
    cancel: "Cancel",
    done: "Done",
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
  const [mode, setMode] = useState<"idle" | "share" | "success">("idle");
  const [showProfessional, setShowProfessional] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", company: "", position: "" });

  useEffect(() => {
    if (!localeProp) setInternalLocale(detectNetworkingLocale(navigator.language));
  }, [localeProp]);

  const copy = COPY[locale];
  const ownerName = profileName || organizationName || "Yenomi";

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
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
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          company: form.company.trim(),
          position: form.position.trim(),
          interests: [],
          introduction: "",
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) {
        setError(payload.error || copy.submit);
        return;
      }
      setMode("success");
    } catch {
      setError(locale === "tr" ? "Bilgiler kaydedilemedi. Lütfen tekrar deneyin." : "Your details could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setMode("idle");
    setShowProfessional(false);
    setError("");
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

      {mode === "idle" && (
        <button type="button" className="p12-networking-cta" onClick={() => setMode("share")}>
          {copy.share}
        </button>
      )}

      {mode === "share" && (
        <form className="p12-networking-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          <div className="p12-networking-fields">
            <label>{copy.name}<input required maxLength={120} autoComplete="name" value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} /></label>
            <label>{copy.email}<input required maxLength={254} type="email" autoComplete="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
            <label>{copy.phone}<input maxLength={40} type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
          </div>

          {!showProfessional ? (
            <button type="button" className="p12-networking-disclosure" onClick={() => setShowProfessional(true)}>{copy.professional}</button>
          ) : (
            <div className="p12-networking-fields p12-networking-professional">
              <label>{copy.company}<input maxLength={160} autoComplete="organization" value={form.company} onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))} /></label>
              <label>{copy.position}<input maxLength={120} autoComplete="organization-title" value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} /></label>
            </div>
          )}

          <p className="p12-networking-privacy">{copy.privacy}</p>
          {error && <p className="p12-networking-message" role="alert">{error}</p>}
          <div className="p12-networking-form-actions">
            <button type="submit" disabled={busy}>{busy ? "…" : copy.submit}</button>
            <button type="button" className="p12-networking-back" onClick={reset}>{copy.cancel}</button>
          </div>
        </form>
      )}

      {mode === "success" && (
        <div className="p12-networking-success" role="status">
          <span aria-hidden="true">✓</span>
          <div>
            <strong>{copy.successTitle}</strong>
            <p>{copy.successBody.replace("{name}", ownerName)}</p>
          </div>
          <button type="button" onClick={reset}>{copy.done}</button>
        </div>
      )}
    </section>
  );
}
