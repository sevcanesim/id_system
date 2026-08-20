 "use client";

import { FormEvent, useState } from "react";
import { CORPORATE_PACKAGE_LADDER } from "../../lib/commerce/packages";
import { Button, Field, FormGrid, Input, Select, Textarea } from "../components/ui";

type Props = { plan?: string; compact?: boolean };

export default function CorporateLeadForm({ plan = "GENEL", compact = false }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    try {
      const response = await fetch("/api/corporate-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, plan: String(data.plan || plan) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Talebin gönderilemedi.");
      form.reset();
      setStatus("success");
      setMessage("Talebin alındı. Ekibimiz 1 iş günü içinde seninle iletişime geçecek.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Talep gönderilemedi. Lütfen tekrar dene.");
    }
  }

  return (
    <form className={`corporate-lead-form${compact ? " is-compact" : ""}`} onSubmit={submit} noValidate key={plan}>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="corporate-lead-honeypot" hidden />
      <FormGrid className="corporate-lead-form-grid">
        <Field label="Ad soyad" required><Input name="fullName" required minLength={2} maxLength={120} autoComplete="name" placeholder="Ad Soyad" /></Field>
        <Field label="Kurumsal e-posta" required><Input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="ornek@sirket.com" /></Field>
        <Field label="Şirket" required className="corporate-lead-full"><Input name="company" required minLength={2} maxLength={160} autoComplete="organization" placeholder="Şirket adı" /></Field>
        <Field label="Paket">
          <Select name="plan" defaultValue={plan === "INDIVIDUAL_PREMIUM" ? "GENEL" : plan}>
            <option value="GENEL">Genel teklif</option>
            {CORPORATE_PACKAGE_LADDER.map((row) => (
              <option key={row.code} value={row.code}>{row.name} — {row.seats} kişi</option>
            ))}
            <option value="ENTERPRISE">Enterprise</option>
            <option value="NETWORK-MAIL">Network Mail kredi paketi</option>
            <option value="CAMPAIGN-MAIL">Campaign Mail</option>
          </Select>
        </Field>
        <Field label="Çalışan sayısı"><Select name="employeeCount" defaultValue=""><option value="" disabled>Seçin</option><option value="1-10">1–10</option><option value="11-50">11–50</option><option value="51-250">51–250</option><option value="251-1000">251–1.000</option><option value="1000+">1.000+</option></Select></Field>
        <Field label="İhtiyacınız" className="corporate-lead-full"><Textarea name="message" maxLength={1000} rows={4} placeholder="Departman, kart adedi veya özel kullanım senaryonuzu kısaca paylaşın." /></Field>
      </FormGrid>
      <div className="corporate-lead-actions">
        <Button type="submit" variant="primary" disabled={status === "loading"} className="corporate-cta">
          {status === "loading" ? "Kayda alınıyor…" : "Teklifi kayda al"} <span aria-hidden>→</span>
        </Button>
        <span className="corporate-lead-note">1 iş günü içinde dönüş · kart numarası istenmez</span>
      </div>
      {message && <p className={`corporate-lead-feedback ${status}`} role={status === "error" ? "alert" : "status"}>{message}</p>}
      <p className="corporate-lead-privacy">Bilgilerin yalnızca teklif talebini değerlendirmek ve seninle iletişime geçmek için kullanılır.</p>
    </form>
  );
}
