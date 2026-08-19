"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CardTemplate from "../CardTemplate";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { isSupabaseConfigured } from "../../lib/supabase/config";

import UserPanelShell from "../components/UserPanelShell";
import { Badge, Button, Drawer, Field, Input, Select, Textarea } from "../components/ui";
import { Icon } from "../icons";
import { TITLE_OPTIONS, normalizeEmailField, normalizeTrPhone } from "../../lib/form-standards";
import { fetchOwnProfile, fetchOwnProfileById, fetchOwnProfileByOrganizationId, fetchOwnProfiles } from "../../lib/repositories/profiles";
import { track } from "../../lib/analytics";
import PanelSidebar from "../components/ui/PanelSidebar";
import { PageLoadingView } from "../components/ui/States";
import type { SidebarNavItem } from "../components/ui/SidebarNav";
import {
  CORPORATE_PANEL_TAB_META,
  CORPORATE_PANEL_TAB_ORDER,
  CORPORATE_PANEL_TAB_ROUTE,
} from "../kurumsal/panel/domain/navigation";

import {
  createProfileSlug,
  ensureRealImage,
  isSupportedImageMimeType,
  INITIAL_CARD_DATA,
  normalizeProfileSlug,
  storagePathFromPublicUrl,
  validateProfileSlug,
  type CardData,
  type UploadedImage,
} from "./domain/profile-editor";
import type { CardBranding } from "../CardTemplate";
import { fetchOrganizationIdentity, type OrgLock } from "./domain/organization-identity";

export default function CardWizard() {
  const [data, setData] = useState<CardData>(INITIAL_CARD_DATA);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [newCardEntitlementId, setNewCardEntitlementId] = useState<string | null>(null);
  const [profileSlug, setProfileSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "unavailable" | "invalid">("idle");
  const [slugMessage, setSlugMessage] = useState("");
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [imageMessage, setImageMessage] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [accessState, setAccessState] = useState<"checking" | "allowed" | "denied">("checking");
  const [orgLock, setOrgLock] = useState<OrgLock | null>(null);
  const [orgBranding, setOrgBranding] = useState<CardBranding | null>(null);
  const [titleRequestOpen, setTitleRequestOpen] = useState(false);
  const [titleRequestValue, setTitleRequestValue] = useState("");
  const [titleRequestBusy, setTitleRequestBusy] = useState(false);
  const [titleRequestMessage, setTitleRequestMessage] = useState("");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedProfileId = searchParams.get("id");
  const isNewCard = searchParams.get("new") === "1";
  const businessOrganizationId = searchParams.get("organizationId");
  const isBusinessCard = searchParams.get("business") === "1" && Boolean(businessOrganizationId);

  useEffect(() => {
    // Eski global taslak anahtarı aynı tarayıcıdaki farklı kurumsal demo
    // kullanıcılarının verisini birbirine sızdırıyordu. Kurumsal kimlik ve
    // kilitli alanlar sunucudan gelir; bu yüzeyde global kişisel taslak okunmaz.
    if (!isBusinessCard) {
      const local = localStorage.getItem("yenomi-card-draft");
      if (local) {
        try { setData({ ...INITIAL_CARD_DATA, ...JSON.parse(local) }); } catch { /* bozuk taslağı yok say */ }
      }
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAccessState(isSupabaseConfigured ? "denied" : "allowed");
      return;
    }
    supabase.auth.getUser().then(async ({ data: authData }) => {
      const user = authData.user;
      if (!user) {
        setAccessState("denied");
        router.replace("/giris?next=%2Folustur");
        return;
      }
      setUserId(user.id);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setAccessState("denied");
        router.replace("/giris?next=%2Folustur");
        return;
      }

      // Eski veya eksik bir bağlantı kurumsal profil kimliğini yalnızca
      // `?id=...` ile açabilir. Bu durumda bireysel sidebar'ı bir an bile
      // göstermeden profili ait olduğu kurumsal editör rotasına taşı.
      if (requestedProfileId && !isBusinessCard && !isNewCard) {
        const [{ data: requestedProfile }, mineResponse] = await Promise.all([
          fetchOwnProfileById(supabase, user.id, requestedProfileId),
          fetch("/api/organizations/mine", {
            headers: { authorization: `Bearer ${accessToken}` },
            cache: "no-store",
          }),
        ]);
        if (requestedProfile && mineResponse.ok) {
          const minePayload = await mineResponse.json() as {
            organizations?: Array<{
              organization_id: string;
              organizations?: { name?: string | null } | null;
            }>;
          };
          const profileCompany = (requestedProfile.company || "").trim().toLocaleLowerCase("tr");
          const memberships = minePayload.organizations ?? [];
          const corporateMembership = memberships.find((item) =>
            profileCompany &&
            (item.organizations?.name || "").trim().toLocaleLowerCase("tr") === profileCompany
          ) || (memberships.length === 1 ? memberships[0] : null);
          if (corporateMembership) {
            router.replace(`/olustur?business=1&organizationId=${encodeURIComponent(corporateMembership.organization_id)}&id=${encodeURIComponent(requestedProfile.id)}`);
            return;
          }
        }
      }
      const organizationIdentityPromise = fetchOrganizationIdentity(accessToken, businessOrganizationId);

      let entitlementPayload: { active?: boolean; next?: string; entitlements?: { id: string }[] } = {};
      if (isBusinessCard && businessOrganizationId) {
        const mineResponse = await fetch("/api/organizations/mine", { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
        const minePayload = await mineResponse.json() as { organizations?: Array<{ organization_id: string }> };
        const hasMembership = mineResponse.ok && Boolean(minePayload.organizations?.some((item) => item.organization_id === businessOrganizationId));
        if (!hasMembership) {
          setAccessState("denied");
          router.replace("/kurumsal/panel");
          return;
        }
      } else {
        const entitlementResponse = await fetch("/api/commerce/entitlements", {
          headers: { authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        entitlementPayload = await entitlementResponse.json() as { active?: boolean; next?: string; entitlements?: { id: string }[] };
        if (!entitlementResponse.ok || !entitlementPayload.active) {
          setAccessState("denied");
          router.replace(entitlementPayload.next || "/urunler?reason=access-required");
          return;
        }
      }
      if (isNewCard && !isBusinessCard) {
        const { data: existingProfiles } = await fetchOwnProfiles(supabase, user.id);
        const usedEntitlementIds = new Set(existingProfiles.map((p) => p.entitlement_id).filter(Boolean));
        const spareEntitlement = (entitlementPayload.entitlements ?? []).find((e) => !usedEntitlementIds.has(e.id));
        if (!spareEntitlement) {
          setAccessState("denied");
          router.replace("/urunler?reason=no-spare-card");
          return;
        }
        setNewCardEntitlementId(spareEntitlement.id);
      }
      setAccessState("allowed");
      // `?new=1` -> boş formla yeni bir kart oluştur (mevcut kartları etkilemez).
      // `?id=...` -> o belirli kartı düzenle.
      // Kurumsal Kartım ekranında `id` henüz URL'ye eklenmemiş olsa bile
      // kullanıcının kişisel ilk kartına düşme. Organizasyon adına bağlı
      // kurumsal profili bul; böylece sidebar'daki Kartım her zaman aynı
      // kurumsal karta açılır.
      let profile = null;
      if (!isNewCard && requestedProfileId) {
        profile = (await fetchOwnProfileById(supabase, user.id, requestedProfileId)).data;
      } else if (!isNewCard && isBusinessCard) {
        const identityForProfile = await organizationIdentityPromise;
        const organizationId = identityForProfile?.lock.organizationId || businessOrganizationId;
        if (organizationId) {
          profile = (await fetchOwnProfileByOrganizationId(supabase, user.id, organizationId)).data;
        }
      } else if (!isNewCard) {
        profile = (await fetchOwnProfile(supabase, user.id)).data;
      }
      track("creation_start", { hasExistingProfile: Boolean(profile), isNewCard });
      if (profile) {
        setProfileId(profile.id);
        const imageUrl = profile.image_url ?? "";
        setOriginalImageUrl(imageUrl);
        setProfileSlug(profile.slug ?? "");
        setSlugTouched(true);
        setData({
          name: profile.name ?? "", role: profile.role ?? "", company: profile.company ?? "",
          phone: profile.phone ?? "", whatsapp: profile.whatsapp ?? "", email: profile.email ?? "",
          website: profile.website ?? "", linkedin: profile.linkedin ?? "", instagram: profile.instagram ?? "",
          location: profile.location ?? "", image: imageUrl, bio: profile.bio ?? ""
        });
      } else {
        const metadata = user.user_metadata ?? {};
        const linkedInName = metadata.full_name ?? metadata.name ?? [metadata.given_name, metadata.family_name].filter(Boolean).join(" ");
        const linkedInImage = metadata.avatar_url ?? metadata.picture ?? "";
        const linkedInHeadline = metadata.headline ?? "";
        setOriginalImageUrl(linkedInImage || "");
        setData((current) => ({
          ...current,
          name: current.name || linkedInName || "",
          role: current.role || linkedInHeadline || "",
          email: current.email || user.email || "",
          image: current.image || linkedInImage || ""
        }));
      }

      // Applied last so a company's centrally managed identity always wins
      // over both a saved profile's old values and LinkedIn prefill — this is
      // what makes locked fields actually stay in sync with company Ayarlar.
      const identity = await organizationIdentityPromise;
      if (identity) {
        setOrgLock(identity.lock);
        setOrgBranding(identity.branding);
        setData((current) => {
          const filledGaps = Object.fromEntries(
            Object.entries(identity.suggestedValues).filter(
              ([key, value]) => value && !current[key as keyof CardData],
            ),
          );
          return { ...current, ...filledGaps, ...identity.lockedValues };
        });
      }
    });
  }, [router, businessOrganizationId, isBusinessCard, isNewCard, requestedProfileId]);

  useEffect(() => {
    if (!slugTouched && data.name.trim()) setProfileSlug(createProfileSlug(data.name));
  }, [data.name, slugTouched]);

  useEffect(() => {
    const candidate = normalizeProfileSlug(profileSlug);
    if (!candidate) {
      setSlugStatus("idle");
      setSlugMessage("");
      return;
    }
    const validationError = validateProfileSlug(candidate);
    if (validationError) {
      setSlugStatus("invalid");
      setSlugMessage(validationError);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setSlugStatus("available");
      setSlugMessage("Bağlantı yayınlama sırasında kesinleştirilecek.");
      return;
    }
    setSlugStatus("checking");
    setSlugMessage("Bağlantı kontrol ediliyor...");
    const timer = window.setTimeout(async () => {
      const { data: available, error } = await supabase.rpc("is_card_slug_available", {
        candidate,
        current_profile_id: profileId,
      });
      if (error) {
        setSlugStatus("idle");
        setSlugMessage("Uygunluk yayınlama sırasında kontrol edilecek.");
        return;
      }
      if (available) {
        setSlugStatus("available");
        setSlugMessage("Bu bağlantı kullanılabilir.");
        setSlugSuggestions([]);
      } else {
        setSlugStatus("unavailable");
        setSlugMessage("Bu bağlantı daha önce alınmış.");
        setSlugSuggestions([`${candidate}-2`, `${candidate}-kart`, `${candidate}${userId?.slice(0, 4) || "01"}`]);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [profileId, profileSlug, userId]);

  function update(field: keyof CardData, value: string) {
    setData((current) => ({ ...current, [field]: value }));
  }

  function updateSlug(value: string) {
    setSlugTouched(true);
    setProfileSlug(normalizeProfileSlug(value));
  }


  async function detectCity() {
    if (!("geolocation" in navigator)) {
      setLocationMessage("Tarayıcın konum özelliğini desteklemiyor. Şehri elle yazabilirsin.");
      return;
    }

    setLocationLoading(true);
    setLocationMessage("Konum alınıyor...");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch(`/api/location/reverse?lat=${coords.latitude}&lng=${coords.longitude}`);
        const payload = await response.json() as { city?: string; district?: string; addressLine?: string; error?: string };
        if (!response.ok) throw new Error(payload.error || "Şehir bilgisi alınamadı.");
        const location = [payload.district, payload.city].filter(Boolean).join(", ") || payload.addressLine || "";
        if (!location) throw new Error("Şehir bilgisi bulunamadı. Konumu elle yazabilirsin.");
        update("location", location);
        setLocationMessage(`${location} bulundu. İstersen alanı düzenleyebilirsin.`);
      } catch (error) {
        setLocationMessage(error instanceof Error ? error.message : "Şehir bilgisi alınamadı.");
      } finally {
        setLocationLoading(false);
      }
    }, (error) => {
      const message = error.code === error.PERMISSION_DENIED
        ? "Konum izni verilmedi. Şehri elle yazabilirsin."
        : "Konum alınamadı. Şehri elle yazabilirsin.";
      setLocationMessage(message);
      setLocationLoading(false);
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  async function imageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageMessage("");
    try {
      await ensureRealImage(file);
      const reader = new FileReader();
      reader.onload = () => update("image", String(reader.result));
      reader.onerror = () => setImageMessage("Fotoğraf okunamadı. Lütfen başka bir dosya seç.");
      reader.readAsDataURL(file);
    } catch (error) {
      event.target.value = "";
      setImageMessage(error instanceof Error ? error.message : "Fotoğraf yüklenemedi.");
    }
  }

  async function uploadImageIfNeeded(currentUserId: string): Promise<UploadedImage> {
    if (!data.image.startsWith("data:")) return { url: data.image, path: storagePathFromPublicUrl(data.image), uploaded: false };
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return { url: data.image, path: null, uploaded: false };

    const response = await fetch(data.image);
    const blob = await response.blob();
    if (!isSupportedImageMimeType(blob.type)) throw new Error("Profil fotoğrafı geçerli bir görsel değil.");
    const extension = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
    const path = `${currentUserId}/profile-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("profile-images").upload(path, blob, {
      contentType: blob.type,
      upsert: false,
      cacheControl: "3600"
    });
    if (error) throw error;
    const publicUrl = supabase.storage.from("profile-images").getPublicUrl(path).data.publicUrl;
    return { url: `${publicUrl}?v=${Date.now()}`, path, uploaded: true };
  }

  async function deletePreviousImageIfNeeded(previousUrl: string, nextPath: string | null) {
    const previousPath = storagePathFromPublicUrl(previousUrl);
    if (!previousPath || previousPath === nextPath) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { error } = await supabase.storage.from("profile-images").remove([previousPath]);
    if (error) console.warn("Eski profil fotoğrafı silinemedi:", error.message);
  }

  async function submitTitleRequest() {
    const title = titleRequestValue.trim();
    if (title.length < 2 || !orgLock) return;
    setTitleRequestBusy(true);
    setTitleRequestMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Oturum bulunamadı.");
      const response = await fetch("/api/organizations/title-requests", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ organizationId: orgLock.organizationId, title }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Talep gönderilemedi.");
      }
      setOrgLock((current) => (current ? { ...current, titleRequest: { requestedTitle: title, status: "PENDING", note: null } } : current));
      setTitleRequestOpen(false);
      setTitleRequestValue("");
      setTitleRequestMessage("Talebin İK'ya iletildi. Onaylanınca ünvanın otomatik güncellenecek.");
    } catch (error) {
      setTitleRequestMessage(error instanceof Error ? error.message : "Talep gönderilemedi.");
    } finally {
      setTitleRequestBusy(false);
    }
  }

  function validateForm() {
    if (data.name.trim().length < 2) return "Ad soyad alanı zorunlu.";
    if (data.role.trim().length < 2) return "Ünvan alanı zorunlu.";
    const slug = normalizeProfileSlug(profileSlug || createProfileSlug(data.name));
    return validateProfileSlug(slug);
  }

  async function publish() {
    const formError = validateForm();
    if (formError) {
      setMessage(formError);
      return;
    }

    setSaving(true);
    setMessage("");
    if (!isBusinessCard) localStorage.setItem("yenomi-card-draft", JSON.stringify(data));

    let uploaded: UploadedImage | null = null;
    try {
      const supabase = getSupabaseBrowserClient();
      let currentUserId = userId;
      if (supabase && !currentUserId) {
        const { data: authData } = await supabase.auth.getUser();
        currentUserId = authData.user?.id ?? null;
      }
      if (supabase && currentUserId) {
        uploaded = await uploadImageIfNeeded(currentUserId);
        const slug = normalizeProfileSlug(profileSlug || createProfileSlug(data.name));
        const { data: available, error: availabilityError } = await supabase.rpc("is_card_slug_available", { candidate: slug, current_profile_id: profileId });
        if (!availabilityError && !available) {
          setSlugStatus("unavailable");
          setSlugMessage("Bu bağlantı kullanılıyor. Aşağıdaki alternatiflerden birini seç.");
          setSlugSuggestions([`${slug}-2`, `${slug}-kart`, `${slug}${currentUserId.slice(0, 4)}`]);
          throw new Error("Kartvizit bağlantısı uygun değil.");
        }
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yap.");

        // profileId varsa o kart güncellenir; yoksa yeni bir kart profili
        // oluşturulur (kullanıcının varsa olan diğer kartlarına dokunulmaz).
        // Yazma işlemi artık `save_own_card_profile` sunucu RPC'sinden
        // geçiyor: kurumsal alan kilitleri (Şirket adı, Ünvan, E-posta,
        // Telefon, Ad Soyad) ve ünvan kataloğu istemciden bağımsız olarak
        // sunucuda zorlanıyor.
        const saveResponse = await fetch("/api/profiles/save", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({
            profileId: profileId || null,
            organizationId: isBusinessCard ? businessOrganizationId : null,
            patch: {
              slug,
              entitlement_id: profileId ? undefined : newCardEntitlementId || undefined,
              name: data.name.trim(),
              role: data.role.trim(),
              company: data.company.trim() || null,
              phone: data.phone.trim() || null,
              whatsapp: data.whatsapp.trim() || null,
              email: data.email.trim() || null,
              website: data.website.trim() || null,
              linkedin: data.linkedin.trim() || null,
              instagram: data.instagram.trim() || null,
              location: data.location.trim() || null,
              image_url: uploaded.url || null,
              bio: data.bio?.trim() || null,
              is_published: true,
            },
          }),
        });
        const savePayload = await saveResponse.json().catch(() => ({}));
        const saved = savePayload.profile as { id: string } | undefined;
        const saveError = saveResponse.ok ? null : (savePayload.error as string | undefined) || "Kartvizit kaydedilemedi.";

        if (!saveError && saved && !profileId) setProfileId(saved.id);
        if (!saveError && saved && isBusinessCard && businessOrganizationId) {
          await fetch("/api/organizations/card-profile-link", {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ organizationId: businessOrganizationId, profileId: saved.id }),
          });
        }
        if (saveError) {
          // Eş zamanlı iki kullanıcı aynı bağlantıyı seçip aynı anda yayınlarsa,
          // istemci tarafı ön kontrolü (yukarıda) geçse bile veritabanının
          // "slug unique" kısıtı ikinci isteği reddeder. Ham Postgres hatası
          // yerine kullanıcı dostu bir mesaj göster.
          if (savePayload.code === "SLUG_TAKEN") {
            setSlugStatus("unavailable");
            setSlugMessage("Bu bağlantı az önce başka biri tarafından alındı. Aşağıdaki alternatiflerden birini seç.");
            setSlugSuggestions([`${slug}-2`, `${slug}-kart`, `${slug}${currentUserId.slice(0, 4)}`]);
            throw new Error("Kartvizit bağlantısı az önce alındı. Lütfen farklı bir bağlantı seç.");
          }
          if (savePayload.code === "TITLE_NOT_IN_CATALOG") {
            setMessage("Bu ünvan şirketin pozisyon listesinde yok. Listeden bir ünvan seç ya da 'Listede yok, talep et' ile İK'dan iste.");
            throw new Error(saveError);
          }
          throw new Error(saveError);
        }

        await deletePreviousImageIfNeeded(originalImageUrl, uploaded.path);
        setOriginalImageUrl(uploaded.url);
        setData((current) => ({ ...current, image: uploaded?.url ?? current.image }));
        if (!isBusinessCard) localStorage.setItem("yenomi-card-draft", JSON.stringify({ ...data, image: uploaded.url }));
        localStorage.setItem("yenomi-card-slug", slug);
        setProfileSlug(slug);
      } else if (isSupabaseConfigured) {
        setMessage("Kalıcı yayın için önce giriş yapmalısın. Taslağın bu tarayıcıya kaydedildi.");
        setSaving(false);
        return;
      }
      if (isBusinessCard && businessOrganizationId) {
        const currentId = profileId || undefined;
        router.replace(currentId
          ? `/kurumsal/panel/kartim?business=1&organizationId=${encodeURIComponent(businessOrganizationId)}&id=${encodeURIComponent(currentId)}`
          : `/kurumsal/panel/kartim?business=1&organizationId=${encodeURIComponent(businessOrganizationId)}`);
      } else {
        router.push("/kartim");
      }
    } catch (error) {
      if (uploaded?.uploaded && uploaded.path) {
        const supabase = getSupabaseBrowserClient();
        await supabase?.storage.from("profile-images").remove([uploaded.path]);
      }
      const rawMessage = error instanceof Error ? error.message : "Kartvizit kaydedilemedi.";
      const friendlyMessage = /failed to fetch|networkerror|load failed/i.test(rawMessage)
        ? "Sunucuya ulaşılamadı. İnternet bağlantını ve Supabase ayarlarını kontrol edip tekrar dene."
        : rawMessage;
      setMessage(friendlyMessage);
      setSaving(false);
    }
  }

  if (accessState === "checking") {
    return <PageLoadingView label="Kimlik Stüdyosu hazırlanıyor" />;
  }
  if (accessState === "denied") return null;

  const cancelHref = isBusinessCard ? "/kurumsal/panel" : (profileId ? "/kartlarim" : "/");
  const publishDisabled = saving || slugStatus === "checking" || slugStatus === "unavailable" || slugStatus === "invalid";
  const preview = <div className="p8-preview-stage"><CardTemplate data={data} preview branding={orgBranding} /></div>;

  // Kurumsal kart editörü, /kurumsal/panel ile birebir aynı PanelSidebar
  // bileşenini ve aynı sekme kaynağını (CORPORATE_PANEL_TAB_META) kullanır —
  // bireysel ve kurumsal panelin ayrı sidebar'ları olmaması gerektiği gibi.
  const departmentManager = orgLock?.membershipRole === "DEPARTMENT_MANAGER";
  const canManageLicenses = orgLock?.membershipRole === "OWNER" || orgLock?.membershipRole === "ADMIN";
  const corporateNavItems: SidebarNavItem[] = (
    departmentManager ? (["employees"] as const) : CORPORATE_PANEL_TAB_ORDER.filter((key) => key !== "licenses" || canManageLicenses)
  ).map((key) => ({
    key,
    href: CORPORATE_PANEL_TAB_ROUTE[key],
    label: CORPORATE_PANEL_TAB_META[key].label,
    icon: CORPORATE_PANEL_TAB_META[key].icon,
    group: CORPORATE_PANEL_TAB_META[key].group,
  }));
  const ownCardHref = `/olustur?business=1&organizationId=${encodeURIComponent(businessOrganizationId || "")}${profileId ? `&id=${encodeURIComponent(profileId)}` : "&new=1"}`;
  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    router.replace("/giris?portal=business");
  };

  const editorBody = <div className="p8-editor" data-surface="dashboard">
    <nav className="p8-section-nav" aria-label="Profil bölümleri">
      <a href="#p8-basic">Temel Bilgiler</a>
      <a href="#p8-contact">İletişim</a>
      <a href="#p8-company">Şirket</a>
      <a href="#p8-social">Sosyal Medya</a>
      <a href="#p8-links">Bağlantılar</a>
      <a href="#p8-appearance">Profil Görünümü</a>
    </nav>

    <div className="p8-editor-grid">
      <form onSubmit={(event) => event.preventDefault()} className="p8-form" aria-label="Dijital kartvizit profil bilgileri"><p className="p8-required-hint"><span aria-hidden="true">*</span> işaretli alanlar zorunludur. Değişiklikler kaydetmeden canlı önizlemede görünür.</p>
        <section id="p8-basic" className="p8-section-card">
          <div className="p8-section-heading"><span>01</span><div><h2>Temel Bilgiler</h2><p>Tanışma anında ilk görülecek kimlik bilgilerini düzenleyin.</p></div></div>
          <div className="p8-field-grid">
            <Field label="Ad Soyad" required help={orgLock?.lockName === "locked" ? "Şirket tarafından yönetiliyor" : orgLock ? "Kendi bilgin · değişiklik İK kaydına düşer" : "Kartınızda görünen adınız."}>
              <Input value={data.name} onChange={(e) => update("name", e.target.value)} placeholder="Ad Soyad" autoComplete="name" required disabled={orgLock?.lockName === "locked"}/>
            </Field>
          </div>
        </section>

        <section id="p8-contact" className="p8-section-card">
          <div className="p8-section-heading"><span>02</span><div><h2>İletişim</h2><p>Size ulaşmak için kullanılacak temel iletişim kanallarını belirleyin.</p></div></div>
          <div className="p8-field-grid">
            <Field label="Telefon" help={orgLock?.lockPhone === "locked" ? "Şirket tarafından yönetiliyor" : undefined}>
              <Input type="tel" inputMode="tel" autoComplete="tel" value={data.phone} onChange={(e) => update("phone", normalizeTrPhone(e.target.value))} placeholder="+90 5xx xxx xx xx" disabled={orgLock?.lockPhone === "locked"}/>
            </Field>
            <Field label="E-posta" help={orgLock?.lockEmail === "locked" ? "Şirket tarafından yönetiliyor" : orgLock ? "Kendi bilgin · değişiklik İK kaydına düşer" : undefined}>
              <Input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} value={data.email} onChange={(e) => update("email", e.target.value)} onBlur={() => update("email", normalizeEmailField(data.email))} placeholder="ad@firma.com" disabled={orgLock?.lockEmail === "locked"}/>
            </Field>
            <Field label="WhatsApp" help="Telefon numaranızdan farklıysa doldurun.">
              <Input type="tel" inputMode="tel" value={data.whatsapp} onChange={(e) => update("whatsapp", normalizeTrPhone(e.target.value))} placeholder="+90 5xx xxx xx xx"/>
            </Field>
            <Field label="Konum" className="p8-field-wide" help={locationMessage || "Şehir veya bölge bilgisi yeterlidir."}>
              <div className="p8-inline-field"><Input value={data.location} onChange={(e) => update("location", e.target.value)} placeholder="İzmir, Türkiye"/><Button variant="secondary" onClick={() => void detectCity()} disabled={locationLoading}><Icon name="map" />{locationLoading ? "Bulunuyor" : "Konumumu Bul"}</Button></div>
            </Field>
          </div>
        </section>

        <section id="p8-company" className="p8-section-card">
          <div className="p8-section-heading"><span>03</span><div><h2>Şirket</h2><p>Profesyonel kimliğinizi şirket ve pozisyon bilgileriyle tamamlayın.</p></div></div>
          <div className="p8-field-grid">
            <Field label="Ünvan / Pozisyon" required help={orgLock?.lockTitle === "locked" ? "Şirket tarafından yönetiliyor" : undefined}>
              {orgLock && orgLock.jobTitles.length > 0 ? (
                <Select value={data.role} onChange={(e) => update("role", e.target.value)} required disabled={orgLock.lockTitle === "locked"}>
                  <option value="">Ünvan seç</option>
                  {orgLock.jobTitles.map((title) => <option key={title} value={title}>{title}</option>)}
                  {data.role && !orgLock.jobTitles.includes(data.role) && <option value={data.role}>{data.role}</option>}
                </Select>
              ) : (
                <Input list="yenomi-title-options" value={data.role} onChange={(e) => update("role", e.target.value)} placeholder="Ünvan / Pozisyon" required disabled={orgLock?.lockTitle === "locked"}/>
              )}
            </Field>
            {!(orgLock && orgLock.jobTitles.length > 0) ? <datalist id="yenomi-title-options">{TITLE_OPTIONS.map((title)=><option key={title} value={title}/>)}</datalist> : null}
            <Field label="Şirket" help={orgLock?.lockCompany === "locked" ? "Şirket tarafından yönetiliyor" : "İsteğe bağlı"}>
              <Input value={data.company} onChange={(e) => update("company", e.target.value)} placeholder="Şirket adı" disabled={orgLock?.lockCompany === "locked"}/>
            </Field>
          </div>
          {orgLock && orgLock.lockTitle !== "locked" && <div className="p8-title-request">{orgLock.titleRequest?.status === "PENDING" ? <p className="p8-message p8-message--info">“{orgLock.titleRequest.requestedTitle}” ünvan talebiniz İK onayında.</p> : orgLock.titleRequest?.status === "REJECTED" ? <p className="p8-message p8-message--error">Ünvan talebiniz reddedildi.{orgLock.titleRequest.note ? ` Not: ${orgLock.titleRequest.note}` : ""}</p> : titleRequestOpen ? <div className="p8-inline-field"><Input value={titleRequestValue} onChange={(e) => setTitleRequestValue(e.target.value)} placeholder="Listede olmayan ünvanınızı yazın" maxLength={120}/><Button variant="ghost" onClick={() => { setTitleRequestOpen(false); setTitleRequestValue(""); }}>Vazgeç</Button><Button variant="primary" disabled={titleRequestBusy || titleRequestValue.trim().length<2} onClick={() => void submitTitleRequest()}>{titleRequestBusy ? "Gönderiliyor..." : "İK'ya Gönder"}</Button></div> : <Button variant="ghost" onClick={() => setTitleRequestOpen(true)}>Listede yok mu? Yeni ünvan talep et</Button>}{titleRequestMessage && <p className="p8-message p8-message--info">{titleRequestMessage}</p>}</div>}
        </section>

        <section id="p8-social" className="p8-section-card">
          <div className="p8-section-heading"><span>04</span><div><h2>Sosyal Medya</h2><p>Profesyonel ağlarınızı yalnız kullanmak istediğiniz kanallarla sınırlayın.</p></div></div>
          <div className="p8-field-grid">
            <Field label="LinkedIn"><Input type="url" value={data.linkedin} onChange={(e) => update("linkedin", e.target.value)} placeholder="https://linkedin.com/in/kullanici" inputMode="url" autoCapitalize="none" spellCheck={false}/></Field>
            <Field label="Instagram"><Input type="url" value={data.instagram} onChange={(e) => update("instagram", e.target.value)} placeholder="https://instagram.com/kullanici" inputMode="url" autoCapitalize="none" spellCheck={false}/></Field>
          </div>
        </section>

        <section id="p8-links" className="p8-section-card">
          <div className="p8-section-heading"><span>05</span><div><h2>Bağlantılar</h2><p>Web sitenizi ve kalıcı Yenomi ID adresinizi yönetin.</p></div></div>
          <div className="p8-field-grid">
            <Field label="Web Sitesi"><Input type="url" value={data.website} onChange={(e) => update("website", e.target.value)} placeholder="https://firma.com" inputMode="url" autoCapitalize="none" spellCheck={false}/></Field>
            <Field label="Yenomi ID" help="Bu bağlantı QR ve NFC kartınız değişmeden kalıcı olarak kullanılabilir.">
              <div className="p8-slug-field"><span>qr.yenomilabs.com/</span><Input value={profileSlug} onChange={(e) => updateSlug(e.target.value)} onBlur={() => setProfileSlug(normalizeProfileSlug(profileSlug))} placeholder="adsoyad" minLength={3} maxLength={40}/></div>
            </Field>
          </div>
          <div className={`p8-slug-feedback p8-slug-feedback--${slugStatus}`} aria-live="polite"><span>{slugMessage || "Ad-soyadından otomatik önerilir; yayınlamadan önce değiştirebilirsiniz."}</span>{slugTouched && <Button size="sm" variant="ghost" onClick={() => { setSlugTouched(false); setProfileSlug(createProfileSlug(data.name)); }}>Otomatik Öner</Button>}</div>
          {slugSuggestions.length > 0 && <div className="p8-slug-suggestions" aria-label="Uygun bağlantı önerileri">{slugSuggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => updateSlug(suggestion)}>{suggestion}</button>)}</div>}
        </section>

        <section id="p8-appearance" className="p8-section-card">
          <div className="p8-section-heading"><span>06</span><div><h2>Profil Görünümü</h2><p>Fotoğraf ve kısa biyografi ile kartınızın ilk izlenimini tamamlayın.</p></div></div>
          <div className="p8-photo-row">
            <div className="p8-photo-preview" aria-hidden="true">{data.image ? <img src={data.image} alt="" /> : <span>{data.name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "Y"}</span>}</div>
            <div className="p8-photo-actions"><strong>Profil fotoğrafı</strong><p>JPG, PNG veya WebP · en fazla 5 MB · en az 240 × 240 px.</p><label className="ds-button ds-button--secondary p8-file-button">Fotoğraf Seç<input type="file" accept="image/jpeg,image/png,image/webp" onChange={imageChange}/></label>{data.image && <Button size="sm" variant="ghost" onClick={() => { update("image", ""); setImageMessage(""); }}>Fotoğrafı Kaldır</Button>}{imageMessage && <span className="p8-field-error" role="alert">{imageMessage}</span>}</div>
          </div>
          <Field label="Kısa Biyografi" help={`${(data.bio || "").length}/280 karakter`}>
            <Textarea value={data.bio || ""} onChange={(e) => update("bio", e.target.value)} maxLength={280} rows={5} placeholder="Kısa ve profesyonel bir tanıtım yazın..." />
          </Field>
        </section>

        {message && <div className="p8-message p8-message--error" role="alert">{message}</div>}

        <div className="p8-mobile-actions" aria-label="Profil düzenleme işlemleri">
          <Button variant="secondary" onClick={() => setMobilePreviewOpen(true)}><Icon name="id" />Önizle</Button>
          <Button variant="primary" disabled={publishDisabled} onClick={() => void publish()}>{saving ? "Kaydediliyor..." : "Kaydet ve Yayınla"}</Button>
        </div>
      </form>

      <aside className="p8-preview-column" aria-label="Canlı kart önizlemesi">
        <section className="p8-preview-card"><div className="p8-preview-title"><div><h2>Kart Önizlemesi</h2><p>Kaydetmeden önce profilinizin nasıl görüneceğini kontrol edin.</p></div><Badge>Önizleme</Badge></div>{preview}</section>
        <section className="p8-url-card"><div><h3>Kart bağlantınız</h3><p>QR ve NFC aynı kalıcı profile yönlenir.</p></div><div className="p8-url-row"><span>qr.yenomilabs.com/{profileSlug || "yenomi-id"}</span><Button size="sm" variant="secondary" onClick={() => navigator.clipboard?.writeText(`https://qr.yenomilabs.com/${profileSlug || ""}`)}><Icon name="copy" />Kopyala</Button></div></section>
        <section className="p8-note"><Icon name="refresh" /><div><strong>Anlık güncelleme</strong><p>Kaydettiğiniz değişiklikler QR ve NFC kartınızı yeniden üretmeden aynı bağlantıda yayınlanır.</p></div></section>
      </aside>
    </div>

    <Drawer open={mobilePreviewOpen} title="Kart Önizlemesi" onClose={() => setMobilePreviewOpen(false)}><div className="p8-mobile-preview">{preview}</div></Drawer>
  </div>;

  if (!isBusinessCard) {
    return <UserPanelShell
      title={profileId ? "Profili Düzenle" : "Profilini Oluştur"}
      description="Dijital kartvizit bilgilerinizi düzenleyin. Kaydettiğiniz değişiklikler aynı QR ve NFC bağlantısında yayınlanır."
      eyebrow="Kart"
      activeKey="edit"
      actions={[
        { href: cancelHref, label: "İptal" },
        { label: saving ? "Kaydediliyor..." : "Kaydet ve Yayınla", onClick: () => void publish(), primary: true, disabled: publishDisabled },
      ]}
    >{editorBody}</UserPanelShell>;
  }

  return <main id="main-content" className="p8-corporate-editor" data-ui-context="dashboard">
    <PanelSidebar
      ariaLabel="Kurumsal yönetim menüsü"
      subtitle="Kurumsal Panel"
      className="corporate-card-editor-sidebar"
      brandHref="/kurumsal/panel"
      open={mobileNavOpen}
      onClose={() => setMobileNavOpen(false)}
      items={corporateNavItems}
    >
      <div className="enterprise-side-links enterprise-side-primary-links">
        <span className="enterprise-side-section-title">KİŞİSEL</span>
        <Link href={ownCardHref} className="active" onClick={() => setMobileNavOpen(false)}><Icon name="contact" /><span>Kartım</span></Link>
      </div>
      <div className="enterprise-side-links enterprise-side-management">
        <button type="button" onClick={() => void signOut()}>
          <Icon name="logout" />
          <span>Çıkış Yap</span>
        </button>
      </div>
      <div className="enterprise-side-plan">
        <small>{orgLock?.planName || "Business"}</small>
        <strong>{orgLock?.seatLimit ? `${orgLock.seatLimit} lisans kapasiteli kurumsal plan` : "Aktif kurumsal lisans"}</strong>
        {canManageLicenses && <Link href={CORPORATE_PANEL_TAB_ROUTE.licenses}>Lisansları Yönet</Link>}
      </div>
    </PanelSidebar>
    <section className="p8-corporate-workspace">
      <div className="enterprise-mobile-commandbar">
        <button type="button" className="enterprise-mobile-menu-button" aria-label={mobileNavOpen ? "Menüyü kapat" : "Menüyü aç"} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((value) => !value)}>
          <Icon name={mobileNavOpen ? "close" : "menu"} />
          <span>Menü</span>
        </button>
        <div className="enterprise-mobile-current">
          <small>Yenomi ID · Kurumsal</small>
          <strong>Kartım</strong>
        </div>
      </div>
      <header className="p8-corporate-header"><div><span>Kurumsal Kart</span><h1>{profileId ? "Kart Profilini Düzenle" : "Kart Profilini Oluştur"}</h1><p>Şirket politikasına açık alanları düzenleyin; kilitli alanlar merkezi olarak yönetilir.</p></div><div><Link className="ds-button ds-button--secondary" href={cancelHref}>İptal</Link><Button variant="primary" disabled={publishDisabled} onClick={() => void publish()}>{saving ? "Kaydediliyor..." : "Kaydet ve Yayınla"}</Button></div></header>
      <div className="p8-corporate-content">{editorBody}</div>
    </section>
  </main>;
}
