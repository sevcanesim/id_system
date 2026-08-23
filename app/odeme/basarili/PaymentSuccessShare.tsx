"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import { fetchOwnProfile } from "../../../lib/repositories/profiles";
import { Icon } from "../../icons";
import { track } from "../../../lib/analytics";
import { cardQrUrl, cardShareUrl, publicCardOrigin } from "../../../lib/public-card/urls";

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
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await fetchOwnProfile(supabase, data.user.id);
      if (profile?.slug) setPublicUrl(cardShareUrl(profile.slug, publicCardOrigin()));
      else if (profile?.public_id) setPublicUrl(cardQrUrl(profile.public_id, publicCardOrigin()));
    });
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
