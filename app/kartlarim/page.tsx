"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { fetchOwnProfiles } from "../../lib/repositories/profiles";
import type { CardProfileRow } from "../../lib/card-profile";
import { isManagementRole } from "../../lib/organizations/permissions";
import { cardShareUrl } from "../../lib/public-card/urls";
import { Button, ButtonLink, DashboardShell } from "../ui";
import { LoadingState } from "../components/ui/States";
import { YenomiProductVisual } from "../ui/YenomiProductVisual";
import styles from "./IndividualDashboard.module.css";

type Entitlement = {
  id: string;
  kind: string;
  status: string;
  starts_at?: string | null;
  expires_at?: string | null;
  package_code?: string | null;
  network_mail_limit?: number | null;
  network_mail_remaining?: number | null;
};

type MineOrganization = { role?: string | null };
type PageState = "checking" | "ready" | "redirecting";
type OperationalStatus = "PROFILE_REQUIRED" | "PRINT_PENDING" | "PRINTING" | "SHIPPING_PENDING" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
type CardProcess = {
  id: string;
  operations_status: OperationalStatus;
  print_requested_at?: string | null;
  print_started_at?: string | null;
  print_approved_at?: string | null;
  carrier?: string | null;
  tracking_number?: string | null;
  shipped_at?: string | null;
  out_for_delivery_at?: string | null;
  delivered_at?: string | null;
};
type PurchaseSnapshot = {
  id: string;
  order_number?: string | null;
  status?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
};
type CardProcessPayload = { process?: CardProcess | null; entitlement?: Entitlement | null; order?: PurchaseSnapshot | null };

const PROFILE_FIELDS = ["name", "role", "email", "phone", "image_url"] as const;
const STATUS_LABEL: Record<OperationalStatus, string> = {
  PROFILE_REQUIRED: "Profilini tamamla",
  PRINT_PENDING: "Baskıya hazırlanıyor",
  PRINTING: "Kartın basılıyor",
  SHIPPING_PENDING: "Kargoya hazırlanıyor",
  IN_TRANSIT: "Kargoya Verildi",
  OUT_FOR_DELIVERY: "Dağıtımda",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal Edildi",
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function processStep(status?: OperationalStatus | null) {
  if (!status || status === "PROFILE_REQUIRED" || status === "PRINT_PENDING" || status === "PRINTING" || status === "SHIPPING_PENDING") return 0;
  if (status === "IN_TRANSIT") return 1;
  if (status === "OUT_FOR_DELIVERY") return 2;
  if (status === "DELIVERED") return 3;
  return 0;
}

export default function MyCardsPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<CardProfileRow[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [process, setProcess] = useState<CardProcess | null>(null);
  const [purchase, setPurchase] = useState<PurchaseSnapshot | null>(null);
  const [spare, setSpare] = useState(0);
  const [pageState, setPageState] = useState<PageState>("checking");
  const [queueing, setQueueing] = useState(false);
  const [message, setMessage] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setPageState("ready"); return; }

    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!authData.user) {
        setPageState("redirecting");
        router.replace("/giris?next=%2Fkartlarim");
        return;
      }

      const [{ data: ownProfiles }, { data: sessionData }] = await Promise.all([
        fetchOwnProfiles(supabase, authData.user.id),
        supabase.auth.getSession(),
      ]);
      if (cancelled) return;
      const token = sessionData.session?.access_token;
      if (!token) { setProfiles(ownProfiles); setPageState("ready"); return; }

      const [entitlementsResponse, organizationsResponse, processResponse] = await Promise.all([
        fetch("/api/commerce/entitlements", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch("/api/organizations/mine", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch("/api/commerce/card-process", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }),
      ]);
      if (cancelled) return;

      if (organizationsResponse.ok) {
        const payload = (await organizationsResponse.json()) as { organizations?: MineOrganization[] };
        if ((payload.organizations ?? []).some((organization) => isManagementRole(String(organization.role || "")))) {
          setPageState("redirecting");
          router.replace("/kurumsal/panel");
          return;
        }
      }

      setProfiles(ownProfiles);
      if (entitlementsResponse.ok) {
        const payload = (await entitlementsResponse.json()) as { entitlements?: Entitlement[] };
        const nextEntitlements = payload.entitlements ?? [];
        setEntitlements(nextEntitlements);
        const used = new Set(ownProfiles.map((profile) => profile.entitlement_id).filter(Boolean));
        setSpare(nextEntitlements.filter((entitlement) => !used.has(entitlement.id)).length);
      }
      if (processResponse.ok) {
        const payload = (await processResponse.json()) as CardProcessPayload;
        setProcess(payload.process ?? null);
        setPurchase(payload.order ?? null);
      }
      setPageState("ready");
    })().catch(() => { if (!cancelled) setPageState("ready"); });

    return () => { cancelled = true; };
  }, [router]);

  const primary = profiles[0];
  const primaryEntitlement = useMemo(() => {
    if (primary?.entitlement_id) return entitlements.find((row) => row.id === primary.entitlement_id) ?? entitlements[0];
    return entitlements[0];
  }, [entitlements, primary]);
  const completion = useMemo(() => primary ? Math.min(100, PROFILE_FIELDS.filter((field) => Boolean(primary[field])).length * 20) : 0, [primary]);
  const currentStep = processStep(process?.operations_status);
  const profileUrl = primary?.slug ? cardShareUrl(primary.slug) : "";

  useEffect(() => {
    if (!profileUrl) { setQrDataUrl(""); return; }
    QRCode.toDataURL(profileUrl, { width: 220, margin: 1, errorCorrectionLevel: "M" }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, [profileUrl]);

  async function completeProfile() {
    if (!primary || completion < 100 || queueing) return;
    setQueueing(true);
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const token = data.session?.access_token;
      if (!token) throw new Error("Oturum bulunamadı.");
      const response = await fetch("/api/commerce/card-process", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ profileId: primary.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Kart baskı kuyruğuna alınamadı.");
      setProcess((current) => current ? { ...current, operations_status: "PRINT_PENDING", print_requested_at: new Date().toISOString() } : current);
      setMessage("Profil tamamlandı. Fiziksel kartın baskı kuyruğuna alındı.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kart süreci güncellenemedi.");
    } finally {
      setQueueing(false);
    }
  }

  async function copyProfileLink() {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setMessage("Kartvizit bağlantın kopyalandı.");
    } catch {
      setMessage("Bağlantı kopyalanamadı. Lütfen yeniden deneyin.");
    }
  }

  function downloadQr() {
    if (!qrDataUrl || !primary?.slug) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `yenomi-id-${primary.slug}-qr.png`;
    link.click();
  }

  if (pageState !== "ready") {
    return <DashboardShell activeKey="home" title="Kartım & Genel Bakış" description="Hesap ve kart bilgilerin yükleniyor."><LoadingState variant="panel" label={pageState === "redirecting" ? "Yönlendiriliyor" : "Hesabın yükleniyor"} hint="Paket, kart ve yenileme durumun kontrol ediliyor." /></DashboardShell>;
  }

  return (
    <DashboardShell activeKey="home" eyebrow="BİREYSEL HESAP" title={primary?.name ? `Merhaba, ${primary.name.split(" ")[0]}` : "Kartım & Genel Bakış"} description="Dijital kimliğin, fiziksel kartın ve hizmet süren tek yerde.">
      <div className={styles.page}>
        {!primary ? (
          <section className={styles.notice}>
            <div><span className={styles.eyebrow}>İLK ADIM</span><h2 className={styles.title}>Dijital Kart Bilgilerinizi Doldurun</h2><p className={styles.copy}>Fiziksel kart baskısına geçebilmek için önce dijital kimlik profilini oluştur.</p></div>
            <ButtonLink href={spare ? "/olustur" : "/urunler/nfc-kart"}>{spare ? "Profilimi Oluştur" : "NFC Kartı İncele"}</ButtonLink>
          </section>
        ) : (
          <>
            <section className={styles.heroGrid}>
              <div className={`${styles.card} ${styles.identityHero}`}>
                <div className={styles.heroMeta}>
                  <span className={styles.eyebrow}>CANLI DİJİTAL KİMLİK</span>
                  <span className={styles.completion}>%{completion} hazır</span>
                </div>
                <h2 className={styles.profileUrl}>{profileUrl.replace(/^https?:\/\//, "")}</h2>
                <p className={styles.copy}>{completion < 100 ? "Baskı öncesi son adım: profilini tamamla, ardından kartın üretim sırasına otomatik alınsın." : "Bu bağlantı NFC kartın ve QR kodunla aynı canlı profile gider; bilgilerini dilediğin an güncelleyebilirsin."}</p>
                <div className={styles.actions}>
                  {completion < 100 ? <ButtonLink href={`/olustur?id=${primary.id}`}>Profili Tamamla</ButtonLink> : process?.operations_status === "PROFILE_REQUIRED" ? <Button onClick={completeProfile} disabled={queueing}>{queueing ? "İşleniyor…" : "Baskı Sürecini Başlat"}</Button> : <ButtonLink href={`/olustur?id=${primary.id}`} variant="secondary">Profili Düzenle</ButtonLink>}
                  <Button variant="secondary" onClick={() => void copyProfileLink()}>Bağlantıyı Kopyala</Button>
                  <Button variant="secondary" onClick={downloadQr} disabled={!qrDataUrl}>QR İndir</Button>
                </div>
                {message && <p className={styles.message} role="status">{message}</p>}
              </div>
              <div className={`${styles.countdown} ${styles.studio}`}>
                <div className={styles.studioMeta}><span className={styles.eyebrow}>CANLI MOBİL ÖNİZLEME</span><ButtonLink href={`/olustur?id=${primary.id}`} variant="secondary">Düzenle</ButtonLink></div>
                <div className={styles.studioSpecimen}>
                  <YenomiProductVisual
                    variant="card"
                    compact
                    name={primary.name || "Selin Kaya"}
                    role={primary.role || "Ürün Yöneticisi"}
                    company={primary.company || "Yenomi Labs"}
                  />
                </div>
                <strong>Telefonundaki profil</strong>
                <span>vCard, QR ve Kayıp Modu ayarlarını Kimlik Stüdyosu’ndan yönet.</span>
              </div>
            </section>

            <section className={styles.factGrid} aria-label="Paket ve yenileme bilgileri">
              <div className={styles.fact}><small>Satın alma</small><strong>{formatDateTime(purchase?.paid_at || purchase?.created_at)}</strong><span>{purchase?.order_number ? `Sipariş ${purchase.order_number}` : "Ödeme zaman damgası"}</span></div>
              <div className={styles.fact}><small>Yenileme</small><strong>{formatDateTime(primaryEntitlement?.expires_at)}</strong><span>Satın alınan hizmet süresinin bitişi</span></div>
              <div className={styles.fact}><small>Paket</small><strong>{primaryEntitlement?.package_code === "INDIVIDUAL_PREMIUM" ? "Premium" : "Standart"}</strong><span>Premium'a istediğin zaman yükseltebilirsin</span></div>
            </section>

            <section className={styles.processCard}>
              <div className={styles.processHeader}><div><span className={styles.eyebrow}>KART SİPARİŞİ & KARGO</span><h2 className={styles.title}>Fiziksel kart süreci</h2></div><span className={styles.status}>{process ? STATUS_LABEL[process.operations_status] : "Sipariş eşleştiriliyor"}</span></div>
              <div className={styles.steps}>
                {[{ title: "Hazırlanıyor", text: process?.operations_status === "PRINT_PENDING" ? "Baskı onayı bekleniyor" : process?.operations_status === "PRINTING" ? "Kartın basılıyor" : process?.operations_status === "SHIPPING_PENDING" ? "Kargo işlemi bekleniyor" : "Kart hazırlık süreci" }, { title: "Kargoya Verildi", text: process?.carrier || process?.tracking_number ? [process.carrier && `Kargo firması: ${process.carrier}`, process.tracking_number && `Takip no: ${process.tracking_number}`].filter(Boolean).join(" · ") : "Kargo bilgisi girildiğinde burada görünür" }, { title: "Dağıtımda", text: process?.out_for_delivery_at ? formatDateTime(process.out_for_delivery_at) : "Dağıtıma çıkması bekleniyor" }, { title: "Teslim Edildi", text: process?.delivered_at ? formatDateTime(process.delivered_at) : "Teslimat bekleniyor" }].map((step, index) => <div className={`${styles.step} ${index <= currentStep ? styles.stepActive : ""}`} key={step.title}><small>0{index + 1}</small><strong>{step.title}</strong><span>{step.text}</span></div>)}
              </div>
            </section>

            <section className={styles.quickActions} aria-label="Hızlı işlemler">
              <ButtonLink href={`/olustur?id=${primary.id}`} variant="secondary"><span>01</span> Profili güncelle</ButtonLink>
              <ButtonLink href="/kartim" variant="secondary"><span>02</span> vCard ve QR’ı test et</ButtonLink>
              <ButtonLink href="/kartim" variant="secondary"><span>03</span> Yedek / ek kart sipariş et</ButtonLink>
            </section>

            <section className={styles.secondaryGrid}>
              <div className={styles.card}><span className={styles.eyebrow}>HİZMET & YENİLEME</span><h2 className={styles.title}>Paketini ve hizmet süreni yönet.</h2><p className={styles.copy}>Yenileme tarihini, Premium yükseltme seçeneğini ve paket fiyatlarını Hizmet & Yenileme alanında görebilirsin.</p><div className={styles.actions}><ButtonLink href="/yenile">Hizmet & Yenileme</ButtonLink><ButtonLink href="/siparislerim" variant="secondary">Siparişlerim & Kart Süreci</ButtonLink></div></div>
              <div className={styles.qrCard}><span className={styles.eyebrow}>PROFİL QR</span><h2 className={styles.title}>Dijital kartın</h2>{qrDataUrl ? <img src={qrDataUrl} width={180} height={180} alt="Yenomi ID profil QR kodu" /> : <p className={styles.copy}>QR kodu profil bağlantın hazır olduğunda görünür.</p>}{profileUrl && <span className={styles.qrLink}>{profileUrl}</span>}</div>
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
