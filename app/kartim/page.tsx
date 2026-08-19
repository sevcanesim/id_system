"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import CardTemplate, { EditableCardData } from "../CardTemplate";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { fetchOwnProfiles, setProfilePublished } from "../../lib/repositories/profiles";
import { track } from "../../lib/analytics";

import UserPanelShell from "../components/UserPanelShell";
import { Card } from "../components/ui";
import { Icon } from "../icons";
import AddToCartButton from "../components/AddToCartButton";
import { EXTRA_NFC_CARD_PRICE_KURUS, formatTryFromKurus, NFC_PRODUCT, REPLACEMENT_NFC_CARD_PRICE_KURUS } from "../../lib/config/product";
import { COMMERCIAL_PRICING } from "../../lib/config/commercial";

type CardData = EditableCardData;
type PhysicalCard = { id:string;card_code:string;status:"ACTIVE"|"LOST"|"DISABLED";replaced_by_card_id:string|null };

function getPublicOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://qr.yenomilabs.com";
}

export default function MyCardPage() {
  const router = useRouter();
  const [data, setData] = useState<CardData | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [cardStatus, setCardStatusState] = useState<"ACTIVE" | "LOST">("ACTIVE");
  const [physicalCard, setPhysicalCard] = useState<PhysicalCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [message, setMessage] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [accountContextChecked, setAccountContextChecked] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("yenomi-card-draft");
    if (raw) {
      try { setData(JSON.parse(raw)); } catch { /* bozuk taslağı yok say */ }
    }
    setSavedSlug(localStorage.getItem("yenomi-card-slug") ?? "");

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getUser().then(async ({ data: authData }) => {
      if (!authData.user) {
        setLoading(false);
        return;
      }
      const { data: profiles, error } = await fetchOwnProfiles(supabase, authData.user.id);
      const profile = profiles[0] ?? null;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      setAccountContextChecked(true);

      if (error) setMessage(error);
      if (profile) {
        setProfileId(profile.id);
        setSavedSlug(profile.slug);
        setIsPublished(Boolean(profile.is_published));
        setCardStatusState(profile.card_status === "LOST" ? "LOST" : "ACTIVE");
        if (token) {
          const cardResponse = await fetch(`/api/cards?profileId=${encodeURIComponent(profile.id)}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
          if (cardResponse.ok) {
            const payload = await cardResponse.json() as { cards?: PhysicalCard[] };
            const card = payload.cards?.find((item) => !item.replaced_by_card_id) ?? payload.cards?.[0] ?? null;
            setPhysicalCard(card);
            if (card?.status === "LOST") setCardStatusState("LOST");
          }
        }
        localStorage.setItem("yenomi-card-slug", profile.slug);
        setData({
          name: profile.name ?? "", role: profile.role ?? "", company: profile.company ?? "",
          phone: profile.phone ?? "", whatsapp: profile.whatsapp ?? "", email: profile.email ?? "",
          website: profile.website ?? "", linkedin: profile.linkedin ?? "", instagram: profile.instagram ?? "",
          location: profile.location ?? "", image: profile.image_url ?? ""
        });
      }
      setLoading(false);
    });
  }, []);

  const generatedSlug = useMemo(() => data?.name.toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g,"i").replace(/[^a-z0-9]+/g, "").slice(0, 40) || "kartim", [data]);
  const slug = savedSlug || generatedSlug;
  const editHref = profileId ? `/olustur?id=${encodeURIComponent(profileId)}` : "/olustur";
  const publicUrl = `${getPublicOrigin()}/${slug}`;
  const physicalCardUrl = physicalCard ? `${getPublicOrigin()}/c/${physicalCard.card_code}` : publicUrl;
  const completion = data ? Math.min(100, [data.name, data.role, data.email, data.phone, data.image].filter(Boolean).length * 20) : 0;

  useEffect(() => {
    if (!savedSlug || !isPublished) {
      setQrDataUrl("");
      return;
    }
    QRCode.toDataURL(physicalCardUrl, {
      width: 760,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#17121f", light: "#ffffff" }
    }).then(setQrDataUrl).catch(() => setMessage("QR kod oluşturulamadı."));
  }, [physicalCardUrl, savedSlug, isPublished]);

  async function togglePublished() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !savedSlug || !profileId) return;
    setUpdatingStatus(true);
    setMessage("");
    const nextStatus = !isPublished;
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setMessage("Bu işlem için giriş yapmalısın.");
      setUpdatingStatus(false);
      return;
    }
    const { error } = await setProfilePublished(supabase, authData.user.id, profileId, nextStatus);
    if (error) setMessage(error);
    else {
      setIsPublished(nextStatus);
      setMessage(nextStatus ? "Kartvizitin yeniden yayınlandı." : "Kartvizitin yayından kaldırıldı.");
      if (nextStatus) track("profile_publish", { slug: savedSlug });
    }
    setUpdatingStatus(false);
  }


  async function toggleLostMode() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !profileId || !physicalCard) return;
    setUpdatingStatus(true);
    setMessage("");
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { setMessage("Bu işlem için giriş yapmalısın."); setUpdatingStatus(false); return; }
    const nextStatus = cardStatus === "LOST" ? "ACTIVE" : "LOST";
    if (nextStatus === "LOST" && !window.confirm("Kartı kayıp moduna almak fiziksel kart üzerinden profil erişimini durduracaktır. Dijital profil bağlantınız çalışmaya devam eder. Devam etmek istiyor musunuz?")) { setUpdatingStatus(false); return; }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const response = token ? await fetch("/api/cards", { method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${token}`},body:JSON.stringify({cardId:physicalCard.id,status:nextStatus}) }) : null;
    if (!response?.ok) setMessage(response ? ((await response.json()) as {error?:string}).error ?? "Kart durumu güncellenemedi." : "Oturum doğrulanamadı.");
    else {
      setCardStatusState(nextStatus);
      setPhysicalCard({...physicalCard,status:nextStatus});
      setMessage(nextStatus === "LOST" ? "Fiziksel kart kayıp moduna alındı. Dijital profilin çalışmaya devam eder." : "Fiziksel kart yeniden aktif edildi.");
    }
    setUpdatingStatus(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setMessage("Kartvizit bağlantısı kopyalandı.");
    } catch {
      setMessage("Bağlantı kopyalanamadı.");
    }
  }

  async function shareLink() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: data?.name || "Yenomi ID", url: publicUrl });
        return;
      } catch {
        /* kullanıcı paylaşımı iptal etti ya da API başarısız oldu — kopyalamaya düş */
      }
    }
    copyLink();
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = qrDataUrl;
    anchor.download = `${slug}-qr.png`;
    anchor.click();
  }

  useEffect(() => {
    if (!loading && accountContextChecked && !data) router.replace("/kartlarim");
  }, [accountContextChecked, data, loading, router]);

  if (loading) return <UserPanelShell activeKey="card" title="Kartım" description="Kartvizitiniz yükleniyor."><Card><p className="p14-state-copy">Kartvizit hazırlanıyor…</p></Card></UserPanelShell>;

  if (!data) return <UserPanelShell activeKey="card" title="Kartım" description="Kart durumunuz kontrol ediliyor."><Card><p className="p14-state-copy">Kart durumu kontrol ediliyor…</p></Card></UserPanelShell>;

  return <UserPanelShell activeKey="card" eyebrow="KARTIM" title="Kartım" description="Canlı profilini, kalıcı bağlantını, QR kodunu ve fiziksel kartını tek yerden yönet." actions={[{ href: editHref, label: "Profili Düzenle", primary: true }]}>
    <section className="p14-card-shell">
      <div className="p14-card-main">
        <div className="p14-status-group p7-card-status-row">
          <span className={`p14-status-pill ${isPublished && cardStatus === "ACTIVE" ? "online" : "offline"}`}><i />{cardStatus === "LOST" ? "Kayıp modu" : isPublished ? "Aktif" : "Yayında değil"}</span>
          {isPublished && <a href={`/${slug}`} target="_blank" rel="noopener" className="p14-preview-link">Canlı önizleme <span aria-hidden>↗</span></a>}
        </div>
        <div className="p7-card-health" aria-label="Kart sağlık özeti">
          <div><small>Profil</small><strong>%{completion}</strong><span>tamamlandı</span></div>
          <div><small>Fiziksel kart</small><strong>{physicalCard ? (cardStatus === "LOST" ? "Kayıp" : "Aktif") : "Bağlı değil"}</strong><span>{physicalCard ? "NFC / QR" : "Dijital profil"}</span></div>
          <div><small>Yayın</small><strong>{isPublished ? "Yayında" : "Taslak"}</strong><span>{isPublished ? "Paylaşılabilir" : "Dışarıya kapalı"}</span></div>
        </div>

        <div className="p14-link-card">
          <div className="p14-link-head">
            <div><small>KALICI KARTVİZİT BAĞLANTIN</small><strong>{publicUrl.replace(/^https?:\/\//, "")}</strong></div>
            <button type="button" className="p14-copy-btn" onClick={copyLink}><Icon name="copy" />Kopyala</button>
          </div>
          <div className="p14-link-actions">
            {isPublished && <a href={`/${slug}`} target="_blank" rel="noopener" className="p14-action primary">Kartviziti Aç</a>}
            <button type="button" className="p14-action" onClick={downloadQr} disabled={!qrDataUrl}><Icon name="qr" />QR İndir</button>
            <button type="button" className="p14-action" onClick={shareLink}><Icon name="share" />Bağlantıyı Paylaş</button>
          </div>
        </div>

        <div className="p14-card-grid">
          <div className={`p14-panel ${!qrDataUrl ? "is-disabled" : ""}`}>
            <small>QR KODUN</small>
            <h2>Her yerde<br />paylaş.</h2>
            {qrDataUrl ? <img src={qrDataUrl} alt={`${data.name} kartvizit QR kodu`} /> : <div className="p14-qr-placeholder">QR</div>}
            <p>Kart bilgilerini değiştirdiğinde QR kodun otomatik güncellenir.</p>
          </div>

          <div className="p14-panel p14-management-panel">
            <small>YÖNETİM</small>
            <h2>Kartını yönet.</h2>
            <Link href={editHref} className="p14-management-row"><Icon name="users" /><span>Bilgileri Düzenle</span><Icon name="chevronRight" className="p14-row-chevron" /></Link>
            <div className="p14-p14-management-row-wrap">
              <Icon name="cart" className="p14-p14-management-row-icon" />
              <AddToCartButton productId={NFC_PRODUCT.slug} variantSku={COMMERCIAL_PRICING.ADDITIONAL_CARD.sku} kind="NFC_PHYSICAL_CARD" name="Yenomi ID Ek / Yedek NFC Kart" unitPriceKurus={EXTRA_NFC_CARD_PRICE_KURUS} label="Yedek / Ek Kart Sipariş Et" className="p14-management-row highlight" />
            </div>
            <Link href="/yenile" className="p14-management-row"><Icon name="refresh" /><span>Dijital Hizmeti Yenile · {formatTryFromKurus(COMMERCIAL_PRICING.YENOMI_ID_RENEWAL.priceKurus)}/yıl</span><Icon name="chevronRight" className="p14-row-chevron" /></Link>
            {cardStatus === "LOST" && <div className="p14-p14-management-row-wrap">
              <Icon name="shield" className="p14-p14-management-row-icon" />
              <AddToCartButton productId={NFC_PRODUCT.slug} variantSku={COMMERCIAL_PRICING.REPLACEMENT_CARD.sku} kind="NFC_PHYSICAL_CARD" name="Yenomi ID Kayıp / Replacement NFC Kart" unitPriceKurus={REPLACEMENT_NFC_CARD_PRICE_KURUS} label={`Replacement Kart Sipariş Et · ${formatTryFromKurus(REPLACEMENT_NFC_CARD_PRICE_KURUS)}`} className="p14-management-row highlight" />
            </div>}
            <Link href="/siparislerim" className="p14-management-row"><Icon name="id" /><span>Siparişlerim</span><Icon name="chevronRight" className="p14-row-chevron" /></Link>
            <button type="button" className="p14-management-row danger" onClick={toggleLostMode} disabled={updatingStatus || !savedSlug || !physicalCard}>
              <Icon name="shield" /><span>{updatingStatus ? "Güncelleniyor..." : cardStatus === "LOST" ? "Kartı Yeniden Aktif Et" : "Kayıp Moduna Al"}</span><Icon name="chevronRight" className="p14-row-chevron" />
            </button>
            <button type="button" className="p14-management-row danger" onClick={togglePublished} disabled={updatingStatus || !savedSlug}>
              <Icon name="clock" /><span>{updatingStatus ? "Güncelleniyor..." : isPublished ? "Yayından Kaldır" : "Yeniden Yayınla"}</span><Icon name="chevronRight" className="p14-row-chevron" />
            </button>
          </div>
        </div>
        {message && <div className="p14-message">{message}</div>}
      </div>

      <aside className="p14-preview-col">
        <div className="p14-preview-label"><span>CANLI ÖNİZLEME</span><Link href={editHref}>Fotoğrafı ve bilgileri düzenle <span aria-hidden>→</span></Link></div>
        <div className="p14-preview-phone"><CardTemplate data={data} preview slug={slug} /></div>
      </aside>
    </section>

  </UserPanelShell>;
}
