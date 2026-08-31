"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { fetchOwnProfiles } from "../../lib/repositories/profiles";
import type { CardProfileRow } from "../../lib/card-profile";
import { isManagementRole } from "../../lib/organizations/permissions";
import { ButtonLink, DashboardShell } from "../ui";

type Entitlement = {
  id: string;
  kind: string;
  status: string;
};

type MineOrganization = {
  role?: string | null;
};

type PageState = "checking" | "ready" | "redirecting";

const PROFILE_FIELDS = [
  { key: "name", label: "ad soyad" },
  { key: "role", label: "ünvan" },
  { key: "email", label: "e-posta" },
  { key: "phone", label: "telefon" },
  { key: "image_url", label: "profil fotoğrafı" },
] as const;

export default function MyCardsPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<CardProfileRow[]>([]);
  const [spare, setSpare] = useState(0);
  const [pageState, setPageState] = useState<PageState>("checking");

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setPageState("ready");
      return;
    }

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
      if (!token) {
        setProfiles(ownProfiles);
        setPageState("ready");
        return;
      }

      const [entitlementsResponse, organizationsResponse] = await Promise.all([
        fetch("/api/commerce/entitlements", {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch("/api/organizations/mine", {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      if (cancelled) return;

      if (organizationsResponse.ok) {
        const payload = (await organizationsResponse.json()) as { organizations?: MineOrganization[] };
        const managesOrganization = (payload.organizations ?? []).some((organization) =>
          isManagementRole(String(organization.role || "")),
        );
        if (managesOrganization) {
          setPageState("redirecting");
          router.replace("/kurumsal/panel");
          return;
        }
      }

      setProfiles(ownProfiles);

      if (entitlementsResponse.ok) {
        const payload = (await entitlementsResponse.json()) as { entitlements?: Entitlement[] };
        const usedEntitlements = new Set(
          ownProfiles.map((profile) => profile.entitlement_id).filter(Boolean),
        );
        setSpare(
          (payload.entitlements ?? []).filter((entitlement) => !usedEntitlements.has(entitlement.id)).length,
        );
      }

      setPageState("ready");
    })().catch(() => {
      if (!cancelled) setPageState("ready");
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const primary = profiles[0];
  const completion = useMemo(
    () => primary
      ? Math.min(100, PROFILE_FIELDS.filter((field) => Boolean(primary[field.key])).length * 20)
      : 0,
    [primary],
  );
  const missingFields = useMemo(
    () => primary
      ? PROFILE_FIELDS.filter((field) => !primary[field.key]).map((field) => field.label)
      : [],
    [primary],
  );
  const nextMissing = missingFields[0];

  if (pageState !== "ready") {
    return (
      <main className="yi-app yi-app--loading" aria-busy="true">
        <div className="yi-app__loading" role="status" aria-live="polite">
          <strong>{pageState === "redirecting" ? "Doğru çalışma alanına yönlendiriliyorsunuz…" : "Hesabınız hazırlanıyor…"}</strong>
          <span>Hesap ve çalışma alanı türünüz doğrulanıyor.</span>
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      title={primary?.name ? `Merhaba, ${primary.name.split(" ")[0]}` : "Yenomi ID'n"}
      description="Kartını güncelle, paylaş ve kullanımını tek yerden yönet."
    >
      {!primary ? (
        <div className="yi-empty-app">
          <span>İLK ADIM</span>
          <h2>Dijital kimliğini oluşturalım.</h2>
          <p>
            {spare
              ? "Kullanılabilir bir kart hakkın var. Profilini oluşturarak QR ve NFC bağlantını hazırlayabilirsin."
              : "Yenomi ID ürününü seçerek dijital kimliğini ve paylaşım bağlantını oluşturabilirsin."}
          </p>
          <ButtonLink href={spare ? "/olustur" : "/urunler/nfc-kart"} variant="primary">
            {spare ? "Profilimi oluştur" : "NFC Kartı İncele"}
          </ButtonLink>
        </div>
      ) : (
        <div className="yi-dashboard-grid">
          <section className="yi-dashboard-hero">
            <div className="yi-dashboard-card">
              <span>YENOMI ID</span>
              <strong>{primary.name || "Yenomi ID"}</strong>
              <small>{primary.role || "Dijital Kimlik"}</small>
            </div>
            <div>
              <span className={`yi-status ${primary.is_published ? "yi-status--success" : "yi-status--warning"}`}>
                {primary.is_published ? "Yayında" : "Taslak"}
              </span>
              <h2>{primary.is_published ? "Kartın hazır ve paylaşılabilir." : "Kartını yayına hazırlıyorsun."}</h2>
              <p>
                {completion === 100
                  ? "Bilgilerin tamamlandı. Değişiklik yaptığında aynı QR ve NFC bağlantısında güncellenir."
                  : `${completion}% tamamlandı${nextMissing ? `. Sıradaki öneri: ${nextMissing} bilgisini ekle.` : "."}`}
              </p>
              <progress max={100} value={completion} aria-label={`Profil tamamlama ${completion}%`}>
                {completion}%
              </progress>
              <div className="yi-actions">
                <ButtonLink href={`/olustur?id=${primary.id}`}>
                  {completion === 100 ? "Profili Düzenle" : "Profili Tamamla"}
                </ButtonLink>
                <ButtonLink href="/kartim" variant="secondary">Kartı Görüntüle</ButtonLink>
              </div>
            </div>
          </section>

          <section className="yi-metric-grid" aria-label="Kimlik durumu">
            <div>
              <small>Profil durumu</small>
              <strong>{completion === 100 ? "Hazır" : `%${completion}`}</strong>
              <span>{completion === 100 ? "Temel bilgiler tamamlandı" : nextMissing ? `${nextMissing} eksik` : "Tamamlanmayı sürdür"}</span>
            </div>
            <div>
              <small>Yayın durumu</small>
              <strong>{primary.is_published ? "Yayında" : "Taslak"}</strong>
              <span>{primary.is_published ? "Kartın görüntülenebilir" : "Yayınlamak için düzenlemeye devam et"}</span>
            </div>
            <div>
              <small>Ek kart hakkı</small>
              <strong>{spare > 0 ? spare : "—"}</strong>
              <span>{spare > 0 ? "Yeni bir profil oluşturabilirsin" : "Kullanılabilir ek kart hakkı yok"}</span>
            </div>
          </section>

          <section className="yi-app-card yi-next-step">
            <div>
              <span>SIRADAKİ ADIM</span>
              <h2>{completion < 100 ? "Profilini tamamla." : "Kartını kullanmaya başla."}</h2>
              <p>
                {completion < 100
                  ? nextMissing
                    ? `${nextMissing.charAt(0).toUpperCase() + nextMissing.slice(1)} bilgisini ekleyerek profilini güçlendir.`
                    : "Eksik bilgilerini tamamlayarak kartını hazırla."
                  : "Kartını aç, paylaş veya etkileşimlerini takip et."}
              </p>
            </div>
            <div className="yi-actions">
              <ButtonLink href={completion < 100 ? `/olustur?id=${primary.id}` : "/kartim"} variant="secondary">
                {completion < 100 ? "Düzenlemeye Devam Et" : "Kartımı Aç"}
              </ButtonLink>
              <ButtonLink href="/istatistikler" variant="secondary">İstatistikler</ButtonLink>
              {spare > 0 && <ButtonLink href="/olustur?new=1" variant="secondary">Yeni Kart Oluştur</ButtonLink>}
            </div>
          </section>
        </div>
      )}
    </DashboardShell>
  );
}
