"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Icon } from "../../../icons";

type CorporateHeroPreviewProps = {
  company: string;
  name: string;
  title: string;
  email: string;
  slug: string;
};

export default function CorporateHeroPreview({
  company,
  name,
  title,
  email,
  slug,
}: CorporateHeroPreviewProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    if (!slug) {
      setQrDataUrl("");
      return;
    }

    const origin =
      typeof window === "undefined" ? "https://yenomi.id" : window.location.origin;

    QRCode.toDataURL(`${origin}/${slug}`, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: "H",
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [slug]);

  return (
    <article>
      <header>
        <strong>{company}</strong>
        <span>{slug ? "Aktif" : "Hazırlanıyor"}</span>
      </header>
      <div className="v26-card-content">
        <section>
          <h3>{name}</h3>
          <p>{title}</p>
          <i className="v26-card-accent" />
          <ul>
            <li>
              <Icon name="mail" />
              {email}
            </li>
            <li>
              <Icon name="link" />
              {slug ? `yenomi.id/${slug}` : "Kart profili hazırlanıyor"}
            </li>
          </ul>
        </section>
        {qrDataUrl ? (
          <img
            className="v26-card-qr"
            src={qrDataUrl}
            alt={`${name} kart QR kodu`}
          />
        ) : (
          <span className="v26-card-qr-placeholder" aria-hidden="true" />
        )}
      </div>
    </article>
  );
}
