"use client";

import { useMemo, useState } from "react";
import { detectNetworkingLocale, type NetworkingLocale } from "@/app/lib/networking-i18n";

type NetworkingCaptureProps = {
  profileId: string;
  profileName?: string | null;
  visitorId?: string | null;
  eventId?: string | null;
  source?: string | null;
  locale?: NetworkingLocale;
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  position: string;
};

type Mode = "idle" | "share" | "success";

const copy = {
  tr: {
    eyebrow: "BAĞLANTI KUR",
    intro: "Tanıştıysak iletişimde kalalım.",
    share: "Bilgilerimi Paylaş",
    name: "Ad Soyad",
    email: "E-posta",
    phone: "Telefon",
    company: "Şirket",
    position: "Pozisyon",
    addProfessional: "+ Profesyonel bilgi ekle",
    hideProfessional: "Profesyonel bilgileri gizle",
    privacy: "Bilgileriniz yalnızca bağlantı kurduğunuz kart sahibiyle paylaşılır.",
    submit: "Bilgilerimi Paylaş",
    cancel: "Vazgeç",
    submitting: "Paylaşılıyor…",
    successTitle: "Bağlantı kuruldu",
    successBody: (name: string) => `Bilgileriniz ${name} ile paylaşıldı.`,
    done: "Tamam",
    error: "Bilgileriniz şu anda paylaşılamadı. Lütfen tekrar deneyin.",
  },
  en: {
    eyebrow: "CONNECT",
    intro: "Let's stay in touch.",
    share: "Share My Details",
    name: "Full name",
    email: "Email",
    phone: "Phone",
    company: "Company",
    position: "Position",
    addProfessional: "+ Add professional details",
    hideProfessional: "Hide professional details",
    privacy: "Your details are shared only with the card owner you are connecting with.",
    submit: "Share My Details",
    cancel: "Cancel",
    submitting: "Sharing…",
    successTitle: "Connected",
    successBody: (name: string) => `Your details were shared with ${name}.`,
    done: "Done",
    error: "Your details could not be shared right now. Please try again.",
  },
} as const;

const initialForm: FormState = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  position: "",
};

export default function NetworkingCapture({
  profileId,
  profileName,
  visitorId,
  eventId,
  source,
  locale,
}: NetworkingCaptureProps) {
  const resolvedLocale = locale ?? detectNetworkingLocale();
  const t = copy[resolvedLocale];
  const [mode, setMode] = useState<Mode>("idle");
  const [form, setForm] = useState<FormState>(initialForm);
  const [showProfessional, setShowProfessional] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownerName = useMemo(
    () => profileName?.trim() || (resolvedLocale === "tr" ? "kart sahibi" : "the card owner"),
    [profileName, resolvedLocale],
  );

  const update = (field: keyof FormState) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/networking/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          visitorId,
          eventId,
          source,
          locale: resolvedLocale,
          requestMeeting: false,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          company: form.company,
          position: form.position,
          interests: [],
          introduction: "",
        }),
      });

      if (!response.ok) throw new Error("lead_create_failed");

      setMode("success");
      setForm(initialForm);
      setShowProfessional(false);
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }

  if (mode === "success") {
    return (
      <section className="p12-networking" aria-live="polite">
        <div className="p12-networking-success">
          <div className="p12-networking-success-mark" aria-hidden="true">✓</div>
          <div>
            <p className="p12-networking-kicker">{t.successTitle}</p>
            <p className="p12-networking-copy">{t.successBody(ownerName)}</p>
          </div>
        </div>
        <button className="p12-networking-primary" type="button" onClick={() => setMode("idle")}>{t.done}</button>
      </section>
    );
  }

  if (mode === "share") {
    return (
      <section className="p12-networking">
        <div className="p12-networking-heading">
          <p className="p12-networking-kicker">{t.eyebrow}</p>
          <p className="p12-networking-copy">{t.intro}</p>
        </div>

        <form className="p12-networking-form" onSubmit={submit}>
          <label className="p12-networking-field">
            <span>{t.name} *</span>
            <input autoComplete="name" maxLength={100} required value={form.fullName} onChange={(event) => update("fullName")(event.target.value)} />
          </label>

          <label className="p12-networking-field">
            <span>{t.email} *</span>
            <input autoComplete="email" inputMode="email" maxLength={160} required type="email" value={form.email} onChange={(event) => update("email")(event.target.value)} />
          </label>

          <label className="p12-networking-field">
            <span>{t.phone}</span>
            <input autoComplete="tel" inputMode="tel" maxLength={32} type="tel" value={form.phone} onChange={(event) => update("phone")(event.target.value)} />
          </label>

          <button className="p12-networking-disclosure" type="button" aria-expanded={showProfessional} onClick={() => setShowProfessional((value) => !value)}>
            {showProfessional ? t.hideProfessional : t.addProfessional}
          </button>

          {showProfessional ? (
            <div className="p12-networking-professional">
              <label className="p12-networking-field">
                <span>{t.company}</span>
                <input maxLength={120} value={form.company} onChange={(event) => update("company")(event.target.value)} />
              </label>
              <label className="p12-networking-field">
                <span>{t.position}</span>
                <input maxLength={120} value={form.position} onChange={(event) => update("position")(event.target.value)} />
              </label>
            </div>
          ) : null}

          <p className="p12-networking-privacy">{t.privacy}</p>
          {error ? <p className="p12-networking-error" role="alert">{error}</p> : null}

          <button className="p12-networking-primary" type="submit" disabled={busy}>{busy ? t.submitting : t.submit}</button>
          <button className="p12-networking-cancel" type="button" onClick={() => {
            if (busy) return;
            setMode("idle");
            setError(null);
            setShowProfessional(false);
          }}>{t.cancel}</button>
        </form>
      </section>
    );
  }

  return (
    <section className="p12-networking">
      <div className="p12-networking-heading">
        <p className="p12-networking-kicker">{t.eyebrow}</p>
        <p className="p12-networking-copy">{t.intro}</p>
      </div>
      <button className="p12-networking-primary" type="button" onClick={() => setMode("share")}>{t.share}</button>
    </section>
  );
}
