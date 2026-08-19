"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Icon } from "../../../icons";
import { cardShareUrl } from "../../../../lib/public-card/urls";

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
  slug,
}: CorporateHeroPreviewProps) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const shareUrl = slug ? cardShareUrl(slug) : "";
  const shareDisplay = shareUrl.replace(/^https?:\/\//, "");

  useEffect(() => {
    if (!shareUrl) {
      setQrDataUrl("");
      return;
    }

    QRCode.toDataURL(shareUrl, {
      width: 112,
      margin: 1,
      errorCorrectionLevel: "H",
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [shareUrl]);

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="v26-share-card">
      <header>
        <small>Kart erişimi</small>
        <strong>{company}</strong>
        {name ? <span>{name}</span> : null}
      </header>
      {qrDataUrl ? (
        <img className="v26-card-qr" src={qrDataUrl} alt={`${name || company} kart QR kodu`} width={96} height={96} />
      ) : (
        <span className="v26-card-qr-placeholder" aria-hidden="true" />
      )}
      <p>{slug ? shareDisplay : "Kart profili hazırlanıyor"}</p>
      <button type="button" onClick={() => void copyShareLink()} disabled={!slug}>
        <Icon name="qr" />
        {copied ? "Bağlantı kopyalandı" : slug ? "QR bağlantısını kopyala" : "Paylaşım bekleniyor"}
      </button>
    </article>
  );
}
