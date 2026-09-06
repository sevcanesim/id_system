"use client";

import { useEffect, useState } from "react";
import { getBrowserIdentity } from "../../../lib/auth/browser-identity";
import { Icon } from "../../icons";
import { track } from "../../../lib/analytics";
import { cardShareUrl, publicCardOrigin } from "../../../lib/public-card/urls";

/**
 * Ödeme sonrası satın alma anını değerlendiren küçük bir paylaşım/referans
 * bloğu. Denetim raporu — Satış #6: "Satın alma sonrası hiçbir şey yok...
 * en sıcak anda hiçbir ek satış denenmiyor." Bu bileşen ilk adımı atar:
 * kullanıcıyı kartvizitini hemen paylaşmaya veya bir arkadaşını davet
 * etmeye yönlendirir.
 */
export default function PaymentSuccessShare() {
  const [publicUrl, setPublicUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!await getBrowserIdentity()) return;
      const response = await fetch("/api/profiles/mine", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json() as { profiles?: Array<{ public_id?: string | null }> };
      const profile = payload.profiles?.[0];
      if (!cancelled && profile?.public_id) setPublicUrl(cardShareUrl(profile.public_id, publicCardOrigin()));
    })();
    return () => { cancelled = true; };
  }, []);

  if (!publicUrl) return null;

  async function share() {
    track("payment_success", { action: "share_prompt" });
    if (navigator.share) {
      try {
        await navigator.share({ title: "Yenomi ID", text: "Dijital kartvizitime göz at:", url: publicUrl });
        return;
      } catch {
        /* kullanıcı paylaşımı iptal etti, kopyalamaya düş */
      }
    }
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* pano erişimi yoksa sessizce yok say */
    }
  }

  return (
    <div className="success-share-card">
      <div>
        <strong>Kartvizitini şimdi paylaş.</strong>
        <p>NFC kartın kargoya verilirken, bağlantını çevrene göndererek dijital profilini bugünden kullanmaya başla.</p>
      </div>
      <button type="button" onClick={() => void share()}>
        <Icon name="share" />
        {copied ? "Bağlantı kopyalandı" : "Bağlantıyı Paylaş"}
      </button>
    </div>
  );
}
