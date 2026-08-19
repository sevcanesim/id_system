"use client";

import { useEffect, useMemo, useState } from "react";
import {
  NETWORKING_INTERESTS,
  TURKEY_CITIES,
  detectNetworkingLocale,
  type NetworkingLocale,
} from "../../../lib/networking/catalog";

type Copy = {
  stayInTouch: string;
  stayBody: string;
  share: string;
  meetingPrompt: string;
  requestMeeting: string;
  language: string;
  name: string;
  email: string;
  company: string;
  position: string;
  phone: string;
  city: string;
  country: string;
  interest: string;
  introduce: string;
  submit: string;
  meetingType: string;
  online: string;
  inPerson: string;
  date: string;
  timezone: string;
  message: string;
  success: string;
  planningNote: string;
};

const COPY: Record<NetworkingLocale, Copy> = {
  tr: {
    stayInTouch: "İletişimde Kalalım",
    stayBody: "Bilgilerinizi paylaşın, sizinle iletişim kuralım.",
    share: "İletişim Bilgilerimi Paylaş",
    meetingPrompt: "Bir görüşme planlamak ister misiniz?",
    requestMeeting: "Görüşme Talep Et",
    language: "Dil",
    name: "Ad Soyad",
    email: "E-posta",
    company: "Şirket",
    position: "Pozisyon",
    phone: "Telefon",
    city: "Bulunduğunuz il / şehir",
    country: "Ülke",
    interest: "İlgilendiğim konu",
    introduce: "Ne konuşmak istersiniz?",
    submit: "Gönder",
    meetingType: "Görüşme türü",
    online: "Online",
    inPerson: "Yüz yüze",
    date: "Tercih edilen tarih",
    timezone: "Saat dilimi",
    message: "Not",
    success: "iletişim bilgilerinizi aldı.",
    planningNote: "Yüz yüze görüşmeler lokasyon ve ekip uygunluğuna göre planlanır.",
  },
  en: {
    stayInTouch: "Let's Connect",
    stayBody: "Share your details so we can stay in touch.",
    share: "Share My Contact",
    meetingPrompt: "Would you like to request a meeting?",
    requestMeeting: "Request a Meeting",
    language: "Language",
    name: "Full name",
    email: "Email",
    company: "Company",
    position: "Position",
    phone: "Phone",
    city: "City",
    country: "Country",
    interest: "I'm interested in",
    introduce: "What would you like to discuss?",
    submit: "Send",
    meetingType: "Meeting type",
    online: "Online",
    inPerson: "In person",
    date: "Preferred date",
    timezone: "Timezone",
    message: "Message",
    success: "received your contact details.",
    planningNote: "In-person meetings are scheduled based on location and team availability.",
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
  const [mode, setMode] = useState<"idle" | "share" | "meeting">("idle");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    company: "",
    position: "",
    phone: "",
    city: "",
    country: "Türkiye",
    interests: [] as string[],
    introduction: "",
    meetingType: "ONLINE" as "ONLINE" | "IN_PERSON",
    preferredAt: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul",
    meetingMessage: "",
  });

  useEffect(() => {
    if (localeProp) return;
    setInternalLocale(detectNetworkingLocale(navigator.language));
  }, [localeProp]);

  const copy = COPY[locale];
  const company = organizationName || profileName;

  async function submit(kind: "share" | "meeting") {
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
          requestMeeting: kind === "meeting",
          fullName: form.fullName,
          email: form.email,
          company: form.company,
          position: form.position,
          phone: form.phone,
          city: form.city,
          country: form.country,
          interests: form.interests,
          introduction: form.introduction,
          meetingType: kind === "meeting" ? form.meetingType : undefined,
          preferredAt: kind === "meeting" ? form.preferredAt : undefined,
          timezone: kind === "meeting" ? form.timezone : undefined,
          meetingMessage: kind === "meeting" ? form.meetingMessage : undefined,
        }),
      });
      const payload = await response.json() as { error?: string; planningRequired?: boolean };
      if (!response.ok) {
        setMessage(payload.error || copy.submit);
        return;
      }
      setMode("idle");
      setMessage(`${company} ${copy.success}${payload.planningRequired ? ` ${copy.planningNote}` : ""}`);
    } finally {
      setBusy(false);
    }
  }

  const cityChoices = useMemo(() => TURKEY_CITIES, []);

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
      <div className="p12-networking-actions">
        <button type="button" className="p12-networking-cta" onClick={() => setMode("share")}>{copy.share}</button>
        <p>{copy.meetingPrompt}</p>
        <button type="button" className="p12-networking-cta" onClick={() => setMode("meeting")}>{copy.requestMeeting}</button>
      </div>
      {mode !== "idle" && (
        <form className="p12-networking-form" onSubmit={(event) => { event.preventDefault(); void submit(mode); }}>
          <label>{copy.name}<input required value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} /></label>
          <label>{copy.email}<input required type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
          <label>{copy.company}<input value={form.company} onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))} /></label>
          <label>{copy.position}<input value={form.position} onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} /></label>
          <label>{copy.phone}<input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>
          <label>{copy.city}
            {locale === "tr" ? (
              <select required value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}>
                <option value="">Seçin</option>
                {cityChoices.map((city) => <option key={city} value={city}>{city}</option>)}
              </select>
            ) : (
              <input required value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
            )}
          </label>
          <label>{copy.country}<input required value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} /></label>
          <fieldset>
            <legend>{copy.interest}</legend>
            {NETWORKING_INTERESTS.map((interest) => (
              <label key={interest}>
                <input
                  type="checkbox"
                  checked={form.interests.includes(interest)}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    interests: event.target.checked
                      ? [...current.interests, interest]
                      : current.interests.filter((item) => item !== interest),
                  }))}
                />
                {interest}
              </label>
            ))}
          </fieldset>
          <label>{copy.introduce}<textarea value={form.introduction} onChange={(event) => setForm((current) => ({ ...current, introduction: event.target.value }))} /></label>
          {mode === "meeting" && (
            <>
              <label>{copy.meetingType}
                <select value={form.meetingType} onChange={(event) => setForm((current) => ({ ...current, meetingType: event.target.value as "ONLINE" | "IN_PERSON" }))}>
                  <option value="ONLINE">{copy.online}</option>
                  <option value="IN_PERSON">{copy.inPerson}</option>
                </select>
              </label>
              <label>{copy.date}<input type="datetime-local" value={form.preferredAt} onChange={(event) => setForm((current) => ({ ...current, preferredAt: event.target.value }))} /></label>
              <label>{copy.timezone}<input value={form.timezone} onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))} /></label>
              <label>{copy.message}<textarea value={form.meetingMessage} onChange={(event) => setForm((current) => ({ ...current, meetingMessage: event.target.value }))} /></label>
              {form.meetingType === "IN_PERSON" && <p>{copy.planningNote}</p>}
            </>
          )}
          <button type="submit" disabled={busy}>{busy ? "…" : copy.submit}</button>
        </form>
      )}
      {message && <p className="p12-networking-message" role="status">{message}</p>}
    </section>
  );
}
