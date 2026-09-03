"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import CardTemplate from "../CardTemplate";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { fetchOwnProfiles } from "../../lib/repositories/profiles";
import { rowToCardData } from "../../lib/card-profile";
import type { CardProfileRow } from "../../lib/card-profile";
import { isManagementRole } from "../../lib/organizations/permissions";
import { cardShareUrl } from "../../lib/public-card/urls";
import { Button, ButtonLink, DashboardShell } from "../ui";
import { StatusBadge } from "../components/ui";
import { LoadingState } from "../components/ui/States";
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
type PhysicalCard = { id: string; status: "ACTIVE" | "LOST" | "DISABLED"; replaced_by_card_id?: string | null };

const PROFILE_FIELDS = ["name", "role", "email", "phone", "image_url"] as const;
const PROFILE_FIELD_LABELS: Record<(typeof PROFILE_FIELDS)[number], string> = {
  name: "Ad soyad",
  role: "Ünvan",
  email: "E-posta",
  phone: "Telefon",
  image_url: "Profil fotoğrafı",
};
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

function processStatusTone(status?: OperationalStatus | null): "neutral" | "success" | "warning" | "error" {
  if (status === "DELIVERED") return "success";
  if (status === "CANCELLED") return "error";
  if (status) return "warning";
  return "neutral";
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function processStep(status?: OperationalStatus | null) {
  if (!status || status === "PROFILE_REQUIRED" || status === "PRINT_PENDING") return 0;
  if (status === "PRINTING" || status === "SHIPPING_PENDING") return 1;
  if (status === "IN_TRANSIT" || status === "OUT_FOR_DELIVERY") return 2;
  if (status === "DELIVERED") return 3;
  return 0;
}

export default function MyCardsPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<CardProfileRow[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [process, setProcess] = useState<CardProcess | null>(null);
  const [purchase, setPurchase] = useState<PurchaseSnapshot | null>(null);
  const [physicalCard, setPhysicalCard] = useState<PhysicalCard | null>(null);
  const [spare, setSpare] = useState(0);
  const [pageState, setPageState] = useState<PageState>("checking");
  const [queueing, setQueueing] = useState(false);
  const [message, setMessage] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [updatingLostMode, setUpdatingLostMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setPageState("ready"); return; }

    void (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!authData.user) {
        setPageState("redirecting");
        router.replace("/giris?next=%2Fkartim");
        return;
      }

      const [{ data: ownProfiles }, { data: sessionData }] = await Promise.all([
        fetchOwnProfiles(supabase, authData.user.id),
        supabase.auth.getSession(),
      ]);
      if (cancelled) return;
      const token = sessionData.session?.access_token;
      if (!token) { setProfiles(ownProfiles); setPageState("ready"); return; }

      const [entitlementsResponse, organizationsResponse, processResponse, cardsResponse] = await Promise.all([
        fetch("/api/commerce/entitlements", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch("/api/organizations/mine", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch("/api/commerce/card-process", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch(`/api/cards?profileId=${encodeURIComponent(ownProfiles[0]?.id || "")}`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }),
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
      if (cardsResponse.ok) {
        const payload = await cardsResponse.json() as { cards?: PhysicalCard[] };
        setPhysicalCard(payload.cards?.find((card) => !card.replaced_by_card_id) ?? payload.cards?.[0] ?? null);
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
  const missingProfileFields = useMemo(() => primary ? PROFILE_FIELDS.filter((field) => !primary[field]).map((field) => PROFILE_FIELD_LABELS[field]) : [], [primary]);
  const currentStep = processStep(process?.operations_status);
  const canManageLostMode = Boolean(physicalCard && process?.operations_status === "DELIVERED");
  const profileUrl = primary?.slug ? cardShareUrl(primary.slug) : "";
  const displayProfileUrl = primary?.slug ? `yenomi.id/p/${primary.slug}` : "yenomi.id/p/...";

  useEffect(() => {
    if (!profileUrl) { setQrDataUrl(""); return; }
    QRCode.toDataURL(profileUrl, { width: 220, margin: 1, errorCorrectionLevel: "M" }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, [profileUrl]);

  async function completeProfile() {
    if (!primary || completion < 100 || queueing) return;
    if (!window.confirm("Kartında basılacak bilgileri kontrol ettiğini ve baskı sürecinin başlamasını onayladığını doğrular mısın? Dijital profilini daha sonra güncellemeye devam edebilirsin.")) return;
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
        body: JSON.stringify({ profileId: primary.id, confirmed: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Kart baskı kuyruğuna alınamadı.");
      setProcess((current) => current ? { ...current, operations_status: "PRINT_PENDING", print_requested_at: new Date().toISOString() } : current);
      setMessage("Baskı onayın alındı. Fiziksel kartın baskı kuyruğuna alındı.");
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

  async function toggleLostMode() {
    if (!physicalCard || !canManageLostMode || updatingLostMode) return;
    const nextStatus = physicalCard.status === "LOST" ? "ACTIVE" : "LOST";
    if (nextStatus === "LOST" && !window.confirm("Kartı kayıp moduna almak fiziksel kart üzerinden erişimi durdurur. Dijital profilin çalışmaya devam eder. Devam etmek istiyor musun?")) return;
    setUpdatingLostMode(true);
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const token = data.session?.access_token;
      if (!token) throw new Error("Oturum doğrulanamadı.");
      const response = await fetch("/api/cards", { method: "PATCH", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ cardId: physicalCard.id, status: nextStatus }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Kayıp modu güncellenemedi.");
      setPhysicalCard((card) => card ? { ...card, status: nextStatus } : card);
      setMessage(nextStatus === "LOST" ? "Kayıp modu etkin. Dijital profilin çalışmaya devam eder." : "Fiziksel kart yeniden etkinleştirildi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kayıp modu güncellenemedi.");
    } finally {
      setUpdatingLostMode(false);
    }
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
                <h2 className={styles.profileUrl}>{displayProfileUrl}</h2>
                <p className={styles.copy}>{completion < 100 ? "Baskıya geçebilmek için kartında yer alacak profil bilgilerini tamamla." : process?.operations_status === "PROFILE_REQUIRED" ? "Profilin hazır. Kartta basılacak bilgileri kontrol edip baskıyı onayla." : "Bu bağlantı NFC kartın ve QR kodunla aynı canlı profile gider; bilgilerini dilediğin an güncelleyebilirsin."}</p>
                <div className={styles.heroFooter}>
                  <div>
                    <div className={styles.actions}>
                      {completion < 100 ? <ButtonLink href={`/olustur?id=${primary.id}`}>Profili Tamamla</ButtonLink> : process?.operations_status === "PROFILE_REQUIRED" ? <Button onClick={completeProfile} disabled={queueing}>{queueing ? "İşleniyor…" : "Baskıyı onayla"}</Button> : <ButtonLink href={`/olustur?id=${primary.id}`} variant="secondary">Profili Düzenle</ButtonLink>}
                      <Button variant="secondary" onClick={() => void copyProfileLink()}>Bağlantıyı Kopyala</Button>
                    </div>
                    {message && <p className={styles.message} role="status">{message}</p>}
                  </div>
                  {qrDataUrl && <figure className={styles.heroQr}><img src={qrDataUrl} width={112} height={112} alt="Dijital kartın için taranabilir QR kod" /><figcaption>Taramaya hazır QR</figcaption></figure>}
                </div>
              </div>
              <div className={`${styles.countdown} ${styles.studio}`}>
                <div className={styles.studioMeta}><span className={styles.eyebrow}>CANLI MOBİL ÖNİZLEME</span><ButtonLink href={`/olustur?id=${primary.id}`} variant="secondary">Düzenle</ButtonLink></div>
                <a className={styles.studioSpecimen} href={profileUrl} target="_blank" rel="noopener noreferrer" aria-label="Canlı dijital profilini yeni sekmede aç">
                  <CardTemplate data={rowToCardData(primary)} preview />
                </a>
                <strong>Telefonundaki profil</strong>
                <span>Minimal önizlemeye tıklayarak canlı web profilini görüntüle.</span>
              </div>
            </section>

            <section className={styles.factGrid} aria-label="Paket ve yenileme bilgileri">
              <div className={styles.fact}><small>Satın alma</small><strong>{formatDateTime(purchase?.paid_at || purchase?.created_at)}</strong><span>{purchase?.order_number ? `Sipariş ${purchase.order_number}` : "Ödeme zaman damgası"}</span></div>
              <div className={styles.fact}><small>Yenileme</small><strong>{formatDateTime(primaryEntitlement?.expires_at)}</strong><span>Satın alınan hizmet süresinin bitişi</span></div>
              <div className={styles.fact}><small>Paket</small><strong>{primaryEntitlement?.package_code === "INDIVIDUAL_PREMIUM" ? "Premium" : "Standart"}</strong><span>Premium'a istediğin zaman yükseltebilirsin</span></div>
            </section>

            <section className={styles.processCard} aria-labelledby="physical-card-process-title">
              <div className={styles.processHeader}>
                <div>
                  <span className={styles.eyebrow}>KART SİPARİŞİ & KARGO</span>
                  <h2 className={styles.title} id="physical-card-process-title">Fiziksel kart süreci</h2>
                  <p className={styles.processIntro}>Kartının baskı ve teslimat durumunu buradan takip edebilirsin.</p>
                </div>
                <StatusBadge tone={processStatusTone(process?.operations_status)}>{process ? STATUS_LABEL[process.operations_status] : "Sipariş eşleştiriliyor"}</StatusBadge>
              </div>
              {(completion < 100 || process?.operations_status === "PROFILE_REQUIRED") && <div className={styles.profileApproval}>
                <div>
                  <span className={styles.approvalEyebrow}>BASKI İÇİN İŞLEM GEREKİYOR</span>
                  <h3>{completion < 100 ? "Profilini tamamla" : "Baskıyı onayla"}</h3>
                  <p>{completion < 100 ? `Baskıya geçebilmek için şu alanları tamamla: ${missingProfileFields.join(", ")}.` : "Kartında basılacak bilgileri kontrol ettikten sonra baskı onayını ver."}</p>
                </div>
                {completion < 100 ? <ButtonLink href={`/olustur?id=${primary.id}`} variant="secondary">Profili tamamla</ButtonLink> : <Button onClick={completeProfile} disabled={queueing}>{queueing ? "İşleniyor…" : "Baskıyı onayla"}</Button>}
              </div>}
              <ol className={styles.steps} aria-label="Kart siparişi adımları">
                {[{ title: "Sipariş alındı", text: "Kart hazırlık süreci" }, { title: "Baskıda", text: process?.operations_status === "PRINTING" ? "Kartın basılıyor" : "Baskı onayı bekleniyor" }, { title: "Kargoda", text: process?.carrier || process?.tracking_number ? [process.carrier && `Kargo firması: ${process.carrier}`, process.tracking_number && `Takip no: ${process.tracking_number}`].filter(Boolean).join(" · ") : "Kargo bilgisi girildiğinde burada görünür" }, { title: "Teslim edildi", text: process?.delivered_at ? formatDateTime(process.delivered_at) : "Teslimat bekleniyor" }].map((step, index) => <li className={`${styles.step} ${index <= currentStep ? styles.stepActive : ""} ${index === currentStep ? styles.stepCurrent : ""}`} key={step.title} aria-current={index === currentStep ? "step" : undefined}><small>{index < currentStep ? "✓" : `0${index + 1}`}</small><strong>{step.title}</strong><span>{step.text}</span></li>)}
              </ol>
            </section>

            <section className={styles.quickActions} aria-label="Hızlı işlemler">
              <ButtonLink href={`/olustur?id=${primary.id}`} variant="secondary"><span>01</span> Profili güncelle</ButtonLink>
              <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="yi-btn yi-btn--secondary"><span>02</span> vCard ve QR’ı test et</a>
              <ButtonLink href="/urunler#mevcut-kullanici" variant="secondary"><span>03</span> Yedek / ek kart sipariş et</ButtonLink>
            </section>

            <section className={`${styles.card} ${styles.lostMode} ${!canManageLostMode ? styles.lostModeUnavailable : ""}`} aria-labelledby="lost-mode-title">
              <div>
                <span className={styles.eyebrow}>ACİL DURUM</span>
                <h2 className={styles.title} id="lost-mode-title">Kayıp modu</h2>
                <p className={styles.copy}>{canManageLostMode ? physicalCard?.status === "LOST" ? "Fiziksel kartın NFC erişimi kapalı. Dijital profilin yayınlanmaya devam eder." : "Kartını kaybedersen fiziksel NFC erişimini anında kapatabilirsin." : "Fiziksel kart teslim edildiğinde kayıp modu buradan yönetilir."}</p>
              </div>
              <Button variant="secondary" onClick={() => void toggleLostMode()} disabled={!canManageLostMode || updatingLostMode}>{updatingLostMode ? "Güncelleniyor…" : physicalCard?.status === "LOST" ? "Kartı yeniden etkinleştir" : canManageLostMode ? "Kayıp modunu aç" : "Teslimat bekleniyor"}</Button>
            </section>

            <section className={styles.card}>
              <span className={styles.eyebrow}>HİZMET & YENİLEME</span><h2 className={styles.title}>Paketini ve hizmet süreni yönet.</h2><p className={styles.copy}>Yenileme seçeneklerini ve sipariş-kargo durumunu Hesap & Abonelik alanından takip edebilirsin.</p><div className={styles.actions}><ButtonLink href="/ayarlar#renewal-options">Plan & Yenileme</ButtonLink><ButtonLink href="/ayarlar#orders" variant="secondary">Siparişler & Kart Süreci</ButtonLink></div>
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
