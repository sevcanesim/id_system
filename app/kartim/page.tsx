"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import CardTemplate, { EditableCardData } from "../CardTemplate";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { fetchOwnProfiles } from "../../lib/repositories/profiles";
import { getCardProfileCompletion } from "../../lib/card-profile";
import UserPanelShell from "../components/UserPanelShell";
import { ButtonLink, Card, EmptyState } from "../components/ui";
import { Icon } from "../icons";
import AddToCartButton from "../components/AddToCartButton";
import { useProfileCardActions } from "../hooks/useProfileCardActions";
import {
  EXTRA_NFC_CARD_PRICE_KURUS,
  formatTryFromKurus,
  NFC_PRODUCT,
  REPLACEMENT_NFC_CARD_PRICE_KURUS,
} from "../../lib/config/product";
import { COMMERCIAL_PRICING } from "../../lib/config/commercial";
import {
  cardQrUrl,
  cardSharePath,
  cardShareUrl,
  physicalCardPath,
  publicCardOrigin,
} from "../../lib/public-card/urls";
import styles from "./MyCardPage.module.css";

type CardData = EditableCardData;
type PhysicalCard = {
  id: string;
  card_code: string;
  status: "ACTIVE" | "LOST" | "DISABLED";
  replaced_by_card_id: string | null;
};

export default function MyCardPage() {
  const [data, setData] = useState<CardData | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState("");
  const [publicId, setPublicId] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [cardStatus, setCardStatus] = useState<"ACTIVE" | "LOST">("ACTIVE");
  const [physicalCard, setPhysicalCard] = useState<PhysicalCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!authData.user) {
        setLoading(false);
        return;
      }

      const [{ data: profiles, error }, { data: sessionData }] = await Promise.all([
        fetchOwnProfiles(supabase, authData.user.id),
        supabase.auth.getSession(),
      ]);
      if (cancelled) return;

      const profile = profiles[0] ?? null;
      const token = sessionData.session?.access_token;
      if (error) setMessage(error);

      if (!profile) {
        setLoading(false);
        return;
      }

      setProfileId(profile.id);
      setSavedSlug(profile.slug);
      setPublicId(profile.public_id || "");
      setIsPublished(Boolean(profile.is_published));
      setCardStatus(profile.card_status === "LOST" ? "LOST" : "ACTIVE");
      setData({
        name: profile.name ?? "",
        role: profile.role ?? "",
        company: profile.company ?? "",
        phone: profile.phone ?? "",
        whatsapp: profile.whatsapp ?? "",
        email: profile.email ?? "",
        website: profile.website ?? "",
        linkedin: profile.linkedin ?? "",
        instagram: profile.instagram ?? "",
        location: profile.location ?? "",
        image: profile.image_url ?? "",
      });

      if (token) {
        const cardResponse = await fetch(`/api/cards?profileId=${encodeURIComponent(profile.id)}`, {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (cardResponse.ok && !cancelled) {
          const payload = await cardResponse.json() as { cards?: PhysicalCard[] };
          const card = payload.cards?.find((item) => !item.replaced_by_card_id) ?? payload.cards?.[0] ?? null;
          setPhysicalCard(card);
          if (card?.status === "LOST") setCardStatus("LOST");
        }
      }

      if (!cancelled) setLoading(false);
    })().catch(() => {
      if (!cancelled) {
        setMessage("Kartvizit bilgileri yüklenemedi.");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const generatedSlug = useMemo(
    () => data?.name
      .toLocaleLowerCase("tr")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i")
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 40) || "kartim",
    [data],
  );
  const slug = savedSlug || generatedSlug;
  const editHref = profileId ? `/olustur?id=${encodeURIComponent(profileId)}` : "/olustur";
  const publicUrl = cardShareUrl(slug, publicCardOrigin());
  const qrUrl = physicalCard
    ? `${publicCardOrigin()}${physicalCardPath(physicalCard.card_code)}`
    : publicId
      ? cardQrUrl(publicId, publicCardOrigin())
      : publicUrl;
  const liveHref = cardSharePath(slug);
  const completion = data ? getCardProfileCompletion(data) : null;

  useEffect(() => {
    if (!savedSlug || !isPublished) {
      setQrDataUrl("");
      return;
    }
    QRCode.toDataURL(qrUrl, {
      width: 760,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#17121f", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setMessage("QR kod oluşturulamadı."));
  }, [isPublished, qrUrl, savedSlug]);

  const {
    busy: updatingStatus,
    copyLink,
    shareLink,
    downloadQr,
    togglePublished,
    toggleLostMode,
  } = useProfileCardActions({
    profileId,
    slug: savedSlug,
    publicUrl,
    qrDataUrl,
    shareTitle: data?.name || "Yenomi ID",
    isPublished,
    cardStatus,
    physicalCard,
    onPublishedChange: setIsPublished,
    onCardStatusChange: (status) => {
      setCardStatus(status);
      setPhysicalCard((current) => current ? { ...current, status } : current);
    },
    onMessage: setMessage,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMessage("");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (loading) {
    return (
      <UserPanelShell activeKey="card" title="Kartım" description="Kartvizitiniz yükleniyor.">
        <Card><p className="p14-state-copy">Kartvizit hazırlanıyor…</p></Card>
      </UserPanelShell>
    );
  }

  if (!data || !completion) {
    return (
      <UserPanelShell activeKey="card" title="Kartım" description="Dijital kartını düzenlemek için önce sipariş veya aktivasyon gerekir.">
        <EmptyState
          icon="id"
          title="Sipariş bekleniyor"
          description="Kartın tamamlandığında canlı profilini, QR kodunu ve Kayıp Modu ayarlarını buradan yönetebileceksin."
          action={<ButtonLink href="/urunler/nfc-kart">İlk Dijital Kimliğini Tasarla & Sipariş Et</ButtonLink>}
        />
      </UserPanelShell>
    );
  }

  const incompleteLabels = completion.missing.map((item) => item.label);
  const recommendedLabels = completion.recommended.map((item) => item.label);

  return (
    <UserPanelShell
      activeKey="card"
      eyebrow="KARTIM"
      title="Kartım"
      description="Canlı profilini, kalıcı bağlantını, QR kodunu ve fiziksel kartını tek yerden yönet."
    >
      <section className={`p14-card-shell ${styles.layout}`}>
        <div className={`p14-card-main ${styles.main}`}>
          <div className="p14-status-group p7-card-status-row">
            <span className={`p14-status-pill ${isPublished && cardStatus === "ACTIVE" ? "online" : "offline"}`}>
              <i />
              {cardStatus === "LOST" ? "Kayıp modu" : isPublished ? "Aktif" : "Yayında değil"}
            </span>
            {isPublished && (
              <a href={liveHref} target="_blank" rel="noopener noreferrer" className="p14-preview-link">
                Canlı önizleme <span aria-hidden>↗</span>
              </a>
            )}
          </div>

          <div className="p7-card-health" aria-label="Kart sağlık özeti">
            <div><small>Profil</small><strong>%{completion.percent}</strong><span>tamamlandı</span></div>
            <div><small>Fiziksel kart</small><strong>{physicalCard ? (cardStatus === "LOST" ? "Kayıp" : "Aktif") : "Bağlı değil"}</strong><span>{physicalCard ? "NFC / QR" : "Dijital profil"}</span></div>
            <div><small>Yayın</small><strong>{isPublished ? "Yayında" : "Taslak"}</strong><span>{isPublished ? "Paylaşılabilir" : "Dışarıya kapalı"}</span></div>
          </div>

          {(!completion.isComplete || recommendedLabels.length > 0) && (
            <div className="p14-link-card" aria-label="Profil tamamlama önerisi">
              <div className="p14-link-head">
                <div>
                  <small>{completion.isComplete ? "PROFİLİNİ GÜÇLENDİR" : "PROFİLİNİ TAMAMLA"}</small>
                  <strong>{completion.isComplete ? "Temel profilin hazır." : `%${completion.percent} tamamlandı`}</strong>
                </div>
              </div>
              <p className="p14-state-copy">
                {incompleteLabels.length > 0
                  ? `Eksik: ${incompleteLabels.join(", ")}.`
                  : `Önerilen: ${recommendedLabels.join(", ")}.`}
              </p>
              <div className="p14-link-actions">
                <Link href={editHref} className="p14-action primary">
                  {completion.isComplete ? "Profili Güçlendir" : "Eksikleri Tamamla"}
                </Link>
              </div>
            </div>
          )}

          <div className="p14-link-card">
            <div className="p14-link-head">
              <div>
                <small>KALICI KARTVİZİT BAĞLANTIN</small>
                <strong>{publicUrl.replace(/^https?:\/\//, "")}</strong>
              </div>
              <button type="button" className="p14-copy-btn" onClick={() => void copyLink()}>
                <Icon name="copy" />Kopyala
              </button>
            </div>
            <div className="p14-link-actions">
              {isPublished && <a href={liveHref} target="_blank" rel="noopener noreferrer" className="p14-action primary">Kartviziti Aç</a>}
              <button type="button" className="p14-action" onClick={downloadQr} disabled={!qrDataUrl}><Icon name="qr" />QR İndir</button>
              <button type="button" className="p14-action" onClick={() => void shareLink()}><Icon name="share" />Bağlantıyı Paylaş</button>
            </div>
          </div>

          <div className="p14-card-grid">
            <div className={`p14-panel ${!qrDataUrl ? "is-disabled" : ""}`}>
              <small>QR KODUN</small>
              <h2>Her yerde<br />paylaş.</h2>
              {qrDataUrl
                ? <img src={qrDataUrl} alt={`${data.name} kartvizit QR kodu`} />
                : <div className="p14-qr-placeholder">QR</div>}
              <p>{physicalCard
                ? "Basılı NFC kartın kendi sabit kodunu kullanır. Dijital QR, profil veya paylaşım bağlantısı değişse de aynı kalır."
                : "Dijital QR, profil veya paylaşım bağlantısı değişse de aynı kalır."}</p>
            </div>

            <div className="p14-panel p14-management-panel">
              <small>YÖNETİM</small>
              <h2>Kartını yönet.</h2>
              <Link href={editHref} className="p14-management-row"><Icon name="users" /><span>Bilgileri Düzenle</span><Icon name="chevronRight" className="p14-row-chevron" /></Link>
              <div className="p14-p14-management-row-wrap">
                <Icon name="cart" className="p14-p14-management-row-icon" />
                <AddToCartButton
                  productId={NFC_PRODUCT.slug}
                  variantSku={COMMERCIAL_PRICING.ADDITIONAL_CARD.sku}
                  kind="NFC_PHYSICAL_CARD"
                  name="Yenomi ID Ek / Yedek NFC Kart"
                  unitPriceKurus={EXTRA_NFC_CARD_PRICE_KURUS}
                  label="Yedek / Ek Kart Sipariş Et"
                  appearance="secondary"
                  className="p14-management-row highlight"
                />
              </div>
              <Link href="/yenile" className="p14-management-row"><Icon name="refresh" /><span>Dijital Hizmeti Yenile · {formatTryFromKurus(COMMERCIAL_PRICING.YENOMI_ID_RENEWAL.priceKurus)}/yıl</span><Icon name="chevronRight" className="p14-row-chevron" /></Link>
              {cardStatus === "LOST" && (
                <div className="p14-p14-management-row-wrap">
                  <Icon name="shield" className="p14-p14-management-row-icon" />
                  <AddToCartButton
                    productId={NFC_PRODUCT.slug}
                    variantSku={COMMERCIAL_PRICING.REPLACEMENT_CARD.sku}
                    kind="NFC_PHYSICAL_CARD"
                    name="Yenomi ID Kayıp / Replacement NFC Kart"
                    unitPriceKurus={REPLACEMENT_NFC_CARD_PRICE_KURUS}
                    label={`Replacement Kart Sipariş Et · ${formatTryFromKurus(REPLACEMENT_NFC_CARD_PRICE_KURUS)}`}
                    appearance="secondary"
                    className="p14-management-row highlight"
                  />
                </div>
              )}
              <Link href="/siparislerim" className="p14-management-row"><Icon name="id" /><span>Siparişlerim</span><Icon name="chevronRight" className="p14-row-chevron" /></Link>
              <button
                type="button"
                className="p14-management-row danger"
                onClick={() => void toggleLostMode()}
                disabled={updatingStatus || !savedSlug || !physicalCard}
              >
                <Icon name="shield" />
                <span>{updatingStatus ? "Güncelleniyor..." : cardStatus === "LOST" ? "Kartı Yeniden Aktif Et" : "Kayıp Moduna Al"}</span>
                <Icon name="chevronRight" className="p14-row-chevron" />
              </button>
              <button
                type="button"
                className="p14-management-row danger"
                onClick={() => void togglePublished()}
                disabled={updatingStatus || !savedSlug}
              >
                <Icon name="clock" />
                <span>{updatingStatus ? "Güncelleniyor..." : isPublished ? "Yayından Kaldır" : "Yeniden Yayınla"}</span>
                <Icon name="chevronRight" className="p14-row-chevron" />
              </button>
            </div>
          </div>
          {message && <div className="p14-message" role="status" aria-live="polite">{message}</div>}
        </div>

        <aside className={`p14-preview-col ${styles.preview}`}>
          <div className="p14-preview-label">
            <span>CANLI ÖNİZLEME</span>
            <Link href={editHref}>Fotoğrafı ve bilgileri düzenle <span aria-hidden>→</span></Link>
          </div>
          <div className="p14-preview-phone"><CardTemplate data={data} preview slug={slug} /></div>
        </aside>
      </section>
    </UserPanelShell>
  );
}
