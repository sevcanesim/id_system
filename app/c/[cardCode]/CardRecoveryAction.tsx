"use client";

import { useState } from "react";

export default function CardRecoveryAction({ cardCode }: { cardCode: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function recover() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/commerce/card-recovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardCode }),
      });
      const payload = await response.json();
      setMessage(
        response.ok
          ? payload.message || "Aktivasyon kontrolü tamamlandı."
          : payload.error || "Kart kurtarma işlemi şu anda başlatılamıyor.",
      );
    } catch {
      setMessage("Kart kurtarma işlemi şu anda başlatılamıyor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="home-mockup__link-secondary"
        onClick={() => void recover()}
        disabled={busy}
      >
        {busy ? "Kontrol ediliyor…" : "Kartı sahiplenmek için aktivasyon iste"}
      </button>
      {message && <p role="status" aria-live="polite">{message}</p>}
    </div>
  );
}
