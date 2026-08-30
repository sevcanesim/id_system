"use client";

import { useEffect, useState } from "react";
import { detectNetworkingLocale, type NetworkingLocale } from "../../../lib/networking/catalog";

type Copy = {
  stayInTouch: string;
  stayBody: string;
  share: string;
  language: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  addProDetails: string;
  hideProDetails: string;
  submit: string;
  cancel: string;
  privacy: string;
  successTitle: string;
  successBody: (name: string) => string;
  done: string;
};

const COPY: Record<NetworkingLocale, Copy> = {
  tr: {
    stayInTouch: "BAĞLANTI KUR",
    stayBody: "Tanıştıysak iletişimde kalalım.",
    share: "Bilgilerimi Paylaş",
    language: "Dil",
    name: "Ad Soyad *",
    email: "E-posta *",
    phone: "Telefon",
    company: "Şirket",
    position: "Pozisyon",
    addProDetails: "+ Profesyonel bilgi ekle",
    hideProDetails: "- Profesyonel bilgiyi gizle",
    submit: "Bilgilerimi Paylaş",
    cancel: "Vazgeç",
    privacy: "Bilgileriniz yalnızca bağlantı kurduğunuz kart sahibiyle paylaşılır.",
    successTitle: "✓ Bağlantı kuruldu",
    successBody: (name: string) => `Bilgileriniz ${name} ile paylaşıldı.`,
    done: "Tamam",
  },
  en: {
    stayInTouch: "CONNECT",
    stayBody: "Let's stay in touch.",
    share: "Share My Details",
    language: "Language",
    name: "Full Name *",
    email: "Email *",
    phone: "Phone",
    company: "Company",
    position: "Position",
    addProDetails: "+ Add professional details",
    hideProDetails: "- Hide professional details",
    submit: "Share My Details",
    cancel: "Cancel",
    privacy: "Your details are shared only with the card owner you connected with.",
    successTitle: "✓ Connected",
    successBody: (name: string) => `Details shared with ${name}.`,
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
  const [mode, setMode] = useState<"idle" | "form" | "success">("idle");
  const [showProDetails, setShowProDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    position: "",
  });

  useEffect(() => {
    if (localeProp) return;
    setInternalLocale(detectNetworkingLocale(navigator.language));
  }, [localeProp]);

  const copy = COPY[locale];
  const recipientName = profileName || organizationName || "Kart Sahibi";

  async function submit() {
    if (submitted || busy) return;
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
          phone: form.phone,
          company: form.company,
          position: form.position,
          city: "",
          country: "",
          interests: [],
          introduction: "",
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(payload.error || "İşlem gerçekleştirilemedi.");
        return;
      }
      setSubmitted(true);
      setMode("success");
    } catch {
      setMessage("Bağlantı hatası oluştu.");
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
      <p className="p12-networking-subtitle">{copy.stayBody}</p>

      {/* IDLE MODE */}
      {mode === "idle" && (
        <div className="p12-networking-actions">
          <button
            type="button"
            className="p12-networking-cta p12-networking-cta-primary"
            onClick={() => setMode("form")}
          >
            <strong>{copy.share}</strong>
          </button>
        </div>
      )}

      {/* FORM MODE */}
      {mode === "form" && (
        <form
          className="p12-networking-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {/* Initial 3 Primary Fields */}
          <label className="p12-field">
            <span>{copy.name}</span>
            <input
              required
              autoComplete="name"
              placeholder={locale === "tr" ? "Örn: Selin Kaya" : "e.g. Jane Doe"}
              value={form.fullName}
              onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
            />
          </label>

          <label className="p12-field">
            <span>{copy.email}</span>
            <input
              required
              type="email"
              autoComplete="email"
              placeholder="ornek@sirket.com"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </label>

          <label className="p12-field">
            <span>{copy.phone}</span>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="+90 5XX XXX XX XX"
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </label>

          {/* Optional Disclosure Toggle */}
          <button
            type="button"
            className="p12-networking-pro-toggle"
            onClick={() => setShowProDetails((current) => !current)}
          >
            {showProDetails ? copy.hideProDetails : copy.addProDetails}
          </button>

          {/* Revealed Optional Professional Fields */}
          {showProDetails && (
            <div className="p12-networking-pro-fields">
              <label className="p12-field">
                <span>{copy.company}</span>
                <input
                  autoComplete="organization"
                  placeholder={locale === "tr" ? "Şirket Adı" : "Company Name"}
                  value={form.company}
                  onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
                />
              </label>

              <label className="p12-field">
                <span>{copy.position}</span>
                <input
                  autoComplete="organization-title"
                  placeholder={locale === "tr" ? "Unvan / Pozisyon" : "Job Title"}
                  value={form.position}
                  onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))}
                />
              </label>
            </div>
          )}

          {/* Privacy Microcopy */}
          <p className="p12-networking-privacy">{copy.privacy}</p>

          {message && <p className="p12-networking-error" role="alert">{message}</p>}

          {/* Form Actions */}
          <div className="p12-networking-form-actions">
            <button type="submit" className="p12-networking-submit-btn" disabled={busy || submitted}>
              {busy ? "…" : copy.submit}
            </button>
            <button
              type="button"
              className="p12-networking-cancel-btn"
              onClick={() => setMode("idle")}
              disabled={busy}
            >
              {copy.cancel}
            </button>
          </div>
        </form>
      )}

      {/* SUCCESS MODE */}
      {mode === "success" && (
        <div className="p12-networking-success-card" role="status">
          <div className="p12-success-icon">✓</div>
          <h3>{copy.successTitle}</h3>
          <p>{copy.successBody(recipientName)}</p>
          <button
            type="button"
            className="p12-networking-done-btn"
            onClick={() => setMode("idle")}
          >
            {copy.done}
          </button>
        </div>
      )}
    </section>
  );
}
