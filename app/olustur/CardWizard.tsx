"use client";

import Link from "next/link";
import { ChangeEvent, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CardTemplate from "../CardTemplate";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { isSupabaseConfigured } from "../../lib/supabase/config";
import UserPanelShell from "../components/UserPanelShell";
import QRCode from "qrcode";
import { Badge, Button, Drawer, Field, Input, Modal, Select, Textarea } from "../components/ui";
import { Icon } from "../icons";
import { TITLE_OPTIONS, normalizeEmailField, normalizeTrPhone } from "../../lib/form-standards";
import { unusedEntitlementId } from "../../lib/commerce/entitlement-bind";
import { fetchOwnProfile, fetchOwnProfileById, fetchOwnProfileByOrganizationId, fetchOwnProfiles } from "../../lib/repositories/profiles";
import { track } from "../../lib/analytics";
import { PageLoadingView } from "../components/ui/States";
import { useUnsavedChanges } from "../components/UnsavedChangesContext";
import { useProfileCardActions } from "../hooks/useProfileCardActions";

import {
  calculateProfileCompletion,
  createProfileSlug,
  ensureRealImage,
  formatMissingItemsText,
  isSupportedImageMimeType,
  INITIAL_CARD_DATA,
  sanitizeCardDraft,
  normalizeProfileSlug,
  storagePathFromPublicUrl,
  validateProfileSlug,
  type CardData,
  type UploadedImage,
} from "./domain/profile-editor";
import type { CardBranding } from "../CardTemplate";
import { fetchOrganizationIdentity, type OrgLock } from "./domain/organization-identity";
import { cardShareUrl } from "../../lib/public-card/urls";

const CARD_SECTIONS = [
  { id: "p8-basic", label: "Temel Bilgiler" },
  { id: "p8-contact", label: "İletişim" },
  { id: "p8-company", label: "Şirket" },
  { id: "p8-social", label: "Sosyal Medya" },
  { id: "p8-links", label: "Bağlantılar" },
  { id: "p8-appearance", label: "Profil Görünümü" },
] as const;

const HR_AUDIT_NOTICE = "Değişiklikler İK ve Sistem Yöneticisine bildirildi";
const HR_AUDIT_NOTICE_KEY = "yenomi:card-editor:hr-audit";

export default function CardWizard() {
  const [data, setData] = useState<CardData>(INITIAL_CARD_DATA);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [newCardEntitlementId, setNewCardEntitlementId] = useState<string | null>(null);
  const [profileSlug, setProfileSlug] = useState("");
  const [publicId, setPublicId] = useState("");
  const [englishRole, setEnglishRole] = useState("");
  const [englishAbout, setEnglishAbout] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "unavailable" | "invalid">("idle");
  const [slugMessage, setSlugMessage] = useState("");
  const [slugSuggestions, setSlugSuggestions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [imageMessage, setImageMessage] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [auditNotice, setAuditNotice] = useState("");
  const deferredData = useDeferredValue(data);
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [accessState, setAccessState] = useState<"checking" | "allowed" | "denied">("checking");
  const [orgLock, setOrgLock] = useState<OrgLock | null>(null);
  const [orgBranding, setOrgBranding] = useState<CardBranding | null>(null);
  const [titleRequestOpen, setTitleRequestOpen] = useState(false);
  const [titleRequestValue, setTitleRequestValue] = useState("");
  const [titleRequestBusy, setTitleRequestBusy] = useState(false);
  const [titleRequestMessage, setTitleRequestMessage] = useState("");
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<(typeof CARD_SECTIONS)[number]["id"]>("p8-basic");
  const [phoneTestOpen, setPhoneTestOpen] = useState(false);
  const [phoneTestQrDataUrl, setPhoneTestQrDataUrl] = useState("");
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [activePreviewTarget, setActivePreviewTarget] = useState<string | null>(null);
  const bindTarget = (target: string) => ({
    onFocus: () => setActivePreviewTarget(target),
    onBlur: () => setActivePreviewTarget(null),
  });
  const [baseline, setBaseline] = useState<{
    data: CardData;
    englishRole: string;
    englishAbout: string;
    slug: string;
  } | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedProfileId = searchParams.get("id");
  const isNewCard = searchParams.get("new") === "1";
  const businessOrganizationId = searchParams.get("organizationId");
  const isBusinessCard = searchParams.get("business") === "1" && Boolean(businessOrganizationId);
  const profileCardActions = useProfileCardActions({
    profileId,
    slug: profileSlug,
    publicUrl: cardShareUrl(profileSlug || ""),
    shareTitle: data.name || "Yenomi ID",
    isPublished,
    onPublishedChange: setIsPublished,
    onMessage: setMessage,
  });

  const isDirty = useMemo(() => {
    if (!baseline) return false;
    return (
      data.name !== baseline.data.name ||
      data.role !== baseline.data.role ||
      data.company !== baseline.data.company ||
      data.phone !== baseline.data.phone ||
      data.whatsapp !== baseline.data.whatsapp ||
      data.email !== baseline.data.email ||
      data.website !== baseline.data.website ||
      data.linkedin !== baseline.data.linkedin ||
      data.instagram !== baseline.data.instagram ||
      data.location !== baseline.data.location ||
      data.image !== baseline.data.image ||
      data.bio !== baseline.data.bio ||
      englishRole !== baseline.englishRole ||
      englishAbout !== baseline.englishAbout ||
      profileSlug !== baseline.slug
    );
  }, [data, englishRole, englishAbout, profileSlug, baseline]);

  const { setIsDirty: setContextDirty, guardLinkClick } = useUnsavedChanges();

  useEffect(() => {
    setContextDirty(isDirty);
    return () => setContextDirty(false);
  }, [isDirty, setContextDirty]);

  const handleCancelClick = (e: React.MouseEvent) => {
    guardLinkClick(e, cancelHref);
  };

  useEffect(() => {
    if (accessState !== "allowed") return;
    const sectionIds = CARD_SECTIONS.map((sec) => sec.id);
    const elements = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const sorted = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (sorted[0]?.target.id) {
            setActiveSection(sorted[0].target.id as (typeof CARD_SECTIONS)[number]["id"]);
          }
        }
      },
      { rootMargin: "-90px 0px -40% 0px", threshold: [0.1, 0.4] },
    );

    elements.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [accessState]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const activeTab = document.querySelector(`.p8-section-nav a[aria-current="true"]`);
    if (activeTab) {
      const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      activeTab.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "nearest", inline: "center" });
    }
  }, [activeSection]);

  const handleSectionClick = (event: React.MouseEvent<HTMLAnchorElement>, id: (typeof CARD_SECTIONS)[number]["id"]) => {
    event.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      element.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
      setActiveSection(id);
      if (typeof window !== "undefined" && window.history?.pushState) {
        window.history.pushState(null, "", `#${id}`);
      }
    }
  };

  useEffect(() => {
    if (!phoneTestOpen) return;
    const shareUrl = cardShareUrl(profileSlug || publicId || "yenomi-id");
    QRCode.toDataURL(shareUrl, { width: 360, margin: 2, errorCorrectionLevel: "H" })
      .then(setPhoneTestQrDataUrl)
      .catch(() => setPhoneTestQrDataUrl(""));
  }, [phoneTestOpen, profileSlug, publicId]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(HR_AUDIT_NOTICE_KEY) === "1") {
        sessionStorage.removeItem(HR_AUDIT_NOTICE_KEY);
        setAuditNotice(HR_AUDIT_NOTICE);
      }
    } catch {
      // Bildirim tercihi okunamazsa akış yine de devam eder.
    }
  }, []);

  useEffect(() => {
    // Eski global taslak anahtarı aynı tarayıcıdaki farklı kurumsal demo
    // kullanıcılarının verisini birbirine sızdırıyordu. Kurumsal kimlik ve
    // kilitli alanlar sunucudan gelir; bu yüzeyde global kişisel taslak okunmaz.
    if (!isBusinessCard) {
      const local = localStorage.getItem("yenomi-card-draft");
      if (local) {
        try { setData(sanitizeCardDraft(JSON.parse(local))); } catch { /* bozuk taslağı yok say */ }
      }
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAccessState(isSupabaseConfigured ? "denied" : "allowed");
      return;
    }
    supabase.auth.getUser().then(async ({ data: authData }) => {
      try {
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
        // `?new=1` yalnızca kurumsal çoklu kart akışlarında kullanılabilir.
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
        if (!isBusinessCard && (isNewCard || !profile)) {
          const { data: existingProfiles } = await fetchOwnProfiles(supabase, user.id);
          if (isNewCard && existingProfiles.length > 0) {
            setAccessState("denied");
            router.replace("/olustur");
            return;
          }
          const spareEntitlementId = unusedEntitlementId(entitlementPayload.entitlements ?? [], existingProfiles);
          if (!spareEntitlementId) {
            setAccessState("denied");
            router.replace(isNewCard ? "/urunler?reason=no-spare-card" : (entitlementPayload.next || "/urunler?reason=access-required"));
            return;
          }
          setNewCardEntitlementId(spareEntitlementId);
        }
        setAccessState("allowed");
        track("creation_start", { hasExistingProfile: Boolean(profile), isNewCard });
        if (profile) {
          setProfileId(profile.id);
          setPublicId(profile.public_id || "");
          setIsPublished(Boolean(profile.is_published));
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
          const { data: localeRows } = await supabase.from("card_profile_locales").select("locale,role,about").eq("profile_id", profile.id).eq("locale", "en").maybeSingle();
          const localeRole = localeRows?.role || "";
          const localeAbout = localeRows?.about || "";
          setEnglishRole(localeRole);
          setEnglishAbout(localeAbout);

          const initialProfileData: CardData = {
            name: profile.name ?? "", role: profile.role ?? "", company: profile.company ?? "",
            phone: profile.phone ?? "", whatsapp: profile.whatsapp ?? "", email: profile.email ?? "",
            website: profile.website ?? "", linkedin: profile.linkedin ?? "", instagram: profile.instagram ?? "",
            location: profile.location ?? "", image: imageUrl, bio: profile.bio ?? ""
          };
          setBaseline({
            data: initialProfileData,
            englishRole: localeRole,
            englishAbout: localeAbout,
            slug: profile.slug ?? "",
          });
        } else {
          const metadata = user.user_metadata ?? {};
          const linkedInName = metadata.full_name ?? metadata.name ?? [metadata.given_name, metadata.family_name].filter(Boolean).join(" ");
          const linkedInImage = metadata.avatar_url ?? metadata.picture ?? "";
          const linkedInHeadline = metadata.headline ?? "";
          setOriginalImageUrl(linkedInImage || "");
          const initialDraftData: CardData = {
            name: linkedInName || "",
            role: linkedInHeadline || "",
            company: "", phone: "", whatsapp: "",
            email: user.email || "",
            website: "", linkedin: "", instagram: "", location: "",
            image: linkedInImage || "", bio: ""
          };
          setData(initialDraftData);
          setBaseline({
            data: initialDraftData,
            englishRole: "",
            englishAbout: "",
            slug: "",
          });
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
            const finalData = { ...current, ...filledGaps, ...identity.lockedValues };
            setBaseline((prev) => prev ? { ...prev, data: finalData } : {
              data: finalData,
              englishRole: "",
              englishAbout: "",
              slug: "",
            });
            return finalData;
          });
        }
      } catch (err) {
        console.error("CardWizard authorization error:", err);
        setContextDirty(false);
        setAccessState("denied");
        router.replace("/giris?portal=business");
      }
    }).catch((err) => {
      console.error("CardWizard auth promise rejected:", err);
      setContextDirty(false);
      setAccessState("denied");
      router.replace("/giris?portal=business");
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


  async function applyLocationPayload(payload: { city?: string; district?: string; addressLine?: string }) {
    const location = [payload.district, payload.city].filter(Boolean).join(", ") || payload.addressLine || "";
    if (!location) return false;
    update("location", location);
    setLocationMessage(`${location} bulundu. İstersen alanı düzenleyebilirsin.`);
    return true;
  }

  async function fallbackIpLocation() {
    try {
      const response = await fetch("/api/location/ip");
      if (!response.ok) return false;
      const payload = await response.json() as { city?: string; district?: string; addressLine?: string };
      return applyLocationPayload(payload);
    } catch {
      return false;
    }
  }

  async function detectCity() {
    setLocationLoading(true);
    setLocationMessage("");

    const finish = () => setLocationLoading(false);

    async function applyGps(latitude: number, longitude: number) {
      try {
        const response = await fetch(`/api/location/reverse?lat=${latitude}&lng=${longitude}`);
        const payload = await response.json() as { city?: string; district?: string; addressLine?: string };
        if (response.ok && await applyLocationPayload(payload)) return;
      } catch {
        // GPS çözümlemesi başarısızsa IP yedeğine geçilir; kullanıcı bloklanmaz.
      }
      await fallbackIpLocation();
    }

    if (!("geolocation" in navigator)) {
      await fallbackIpLocation();
      finish();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        await applyGps(coords.latitude, coords.longitude);
        finish();
      },
      async () => {
        await fallbackIpLocation();
        finish();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
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
    if (saving) return;
    const formError = validateForm();
    if (formError) {
      setMessage(formError);
      return;
    }

    setSaving(true);
    setMessage("");
    if (!isBusinessCard) localStorage.setItem("yenomi-card-draft", JSON.stringify(sanitizeCardDraft(data)));

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
        if (!profileId && !isBusinessCard && !newCardEntitlementId) {
          throw new Error("Bu kart için kullanılabilir bir Yenomi ID hakkın yok.");
        }

        // profileId varsa o kart güncellenir; yoksa yeni bir kart profili
        // oluşturulur (kullanıcının varsa olan diğer kartlarına dokunulmaz).
        // Yazma işlemi artık `save_own_card_profile` sunucu RPC'sinden
        // geçiyor: kurumsal alan kilitleri (Şirket adı, Ünvan, E-posta,
        // Telefon, Ad Soyad) ve ünvan kataloğu istemciden bağımsız olarak
        // sunucuda zorlanıyor. Bireysel INSERT kullanılmamış entitlement ister.
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
          const linkResponse = await fetch("/api/organizations/card-profile-link", {
            method: "POST",
            headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ organizationId: businessOrganizationId, profileId: saved.id }),
          });
          if (!linkResponse.ok) {
            throw new Error("Kartvizit kaydedildi; fiziksel kart henüz bağlanamadı. Sayfayı yenileyip tekrar dene.");
          }
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
          if (savePayload.code === "ENTITLEMENT_REQUIRED" || savePayload.code === "ENTITLEMENT_INVALID" || savePayload.code === "ENTITLEMENT_IN_USE") {
            throw new Error("Bu kart için kullanılabilir bir Yenomi ID hakkın yok.");
          }
          if (savePayload.code === "DIGITAL_CARD_LIMIT_REACHED") {
            throw new Error("Şirketin dijital kart kotası doldu.");
          }
          if (savePayload.code === "INDIVIDUAL_PROFILE_LIMIT") {
            throw new Error("Bireysel hesapta yalnızca bir dijital profil oluşturabilirsin.");
          }
          throw new Error(saveError);
        }

        await deletePreviousImageIfNeeded(originalImageUrl, uploaded.path);
        setOriginalImageUrl(uploaded.url);
        setData((current) => ({ ...current, image: uploaded?.url ?? current.image }));
        if (saved) {
          const { error: localeError } = await supabase.from("card_profile_locales").upsert({
            profile_id: saved.id,
            locale: "en",
            role: englishRole.trim() || null,
            about: englishAbout.trim() || null,
          });
          if (localeError) setMessage("Kart kaydedildi; İngilizce içerik katmanı ayrıca kaydedilemedi.");
        }
        if (!isBusinessCard) localStorage.setItem("yenomi-card-draft", JSON.stringify(sanitizeCardDraft({ ...data, image: uploaded?.url ?? data.image })));
        localStorage.setItem("yenomi-card-slug", slug);
        setProfileSlug(slug);
        setIsPublished(true);
        setBaseline({
          data: { ...data, image: uploaded?.url ?? data.image },
          englishRole: englishRole.trim(),
          englishAbout: englishAbout.trim(),
          slug,
        });
      } else if (isSupabaseConfigured) {
        setMessage("Kalıcı yayın için önce giriş yapmalısın. Taslağın bu tarayıcıya kaydedildi.");
        setSaving(false);
        return;
      }
      if (isBusinessCard && orgLock) {
        try { sessionStorage.setItem(HR_AUDIT_NOTICE_KEY, "1"); } catch { /* bildirim kalıcılığı isteğe bağlı */ }
        setAuditNotice(HR_AUDIT_NOTICE);
      }
      if (isBusinessCard && businessOrganizationId) {
        const currentId = profileId || undefined;
        router.replace(currentId
          ? `/kurumsal/panel/kartim?business=1&organizationId=${encodeURIComponent(businessOrganizationId)}&id=${encodeURIComponent(currentId)}`
          : `/kurumsal/panel/kartim?business=1&organizationId=${encodeURIComponent(businessOrganizationId)}`);
      } else {
        router.push("/kartim");
      }
      setSaving(false);
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

  const cancelHref = isBusinessCard ? "/kurumsal/panel" : (profileId ? "/kartim" : "/");

  const isAlreadyPublished = Boolean(profileId) && isPublished;

  const primaryCtaLabel = saving
    ? "Kaydediliyor..."
    : isAlreadyPublished
    ? "Değişiklikleri Kaydet"
    : "Kaydet ve Yayınla";

  const publishDisabled =
    saving ||
    (isAlreadyPublished && !isDirty) ||
    slugStatus === "checking" ||
    slugStatus === "unavailable" ||
    slugStatus === "invalid";

  const saveStatusBadge = (
    <span className={`p8-save-status p8-save-status--${saving ? "saving" : isDirty ? "dirty" : "saved"}`} role="status">
      {saving ? (
        <><Icon name="clock" /> Kaydediliyor...</>
      ) : isDirty ? (
        "Kaydedilmemiş değişiklikler var"
      ) : (
        <><Icon name="check" /> Tüm değişiklikler kaydedildi</>
      )}
    </span>
  );

  const preview = <div className="p8-preview-stage"><CardTemplate data={deferredData} preview branding={orgBranding} activePreviewTarget={activePreviewTarget} /></div>;

  const editorBody = <div className="p8-editor" data-surface="dashboard">
    <nav className="p8-section-nav" aria-label="Profil bölümleri">
      {CARD_SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={activeSection === section.id ? "is-active" : undefined}
          aria-current={activeSection === section.id ? "true" : undefined}
          onClick={(e) => handleSectionClick(e, section.id)}
        >
          {section.label}
        </a>
      ))}
    </nav>

    <div className="p8-editor-grid">
      <form onSubmit={(event) => event.preventDefault()} className="p8-form" aria-label="Dijital kartvizit profil bilgileri">
        <p className="p8-required-hint">Yıldız (*) ile işaretlenen alanlar zorunludur. Değişiklikler anında önizlemede görünür.</p>

        <section id="p8-basic" className="p8-section-card">
          <div className="p8-section-heading"><span>01</span><div><h2>Temel Bilgiler</h2><p>Tanışma anında ilk görülecek kimlik bilgilerini düzenleyin.</p></div></div>
          <div className="p8-field-grid">
            <Field label="Ad Soyad" required help={orgLock?.lockName === "locked" ? <span className="p8-governance-help"><Icon name="lock" /> Şirket tarafından yönetiliyor</span> : orgLock?.lockName === "suggested" ? "Şirket önerisi (düzenleyebilirsiniz)" : "Kartınızda görünen adınız."}>
              <Input value={data.name} onChange={(e) => update("name", e.target.value)} placeholder="Ad Soyad" autoComplete="name" required disabled={orgLock?.lockName === "locked"} {...bindTarget("identity")}/>
            </Field>
          </div>
        </section>

        <section id="p8-contact" className="p8-section-card">
          <div className="p8-section-heading"><span>02</span><div><h2>İletişim</h2><p>Size ulaşmak için kullanılacak temel iletişim kanallarını belirleyin.</p></div></div>
          <div className="p8-field-grid">
            <Field label="Telefon" help={orgLock?.lockPhone === "locked" ? <span className="p8-governance-help"><Icon name="lock" /> Şirket tarafından yönetiliyor</span> : orgLock?.lockPhone === "suggested" ? "Şirket önerisi (düzenleyebilirsiniz)" : undefined}>
              <Input type="tel" inputMode="tel" autoComplete="tel" value={data.phone} onChange={(e) => update("phone", normalizeTrPhone(e.target.value))} placeholder="+90 5xx xxx xx xx" disabled={orgLock?.lockPhone === "locked"} {...bindTarget("phone")}/>
            </Field>
            <Field label="WhatsApp" help="Telefon numaranızdan farklıysa doldurun.">
              <Input type="tel" inputMode="tel" autoComplete="tel" value={data.whatsapp} onChange={(e) => update("whatsapp", normalizeTrPhone(e.target.value))} placeholder="+90 5xx xxx xx xx" {...bindTarget("phone")}/>
            </Field>
            <Field label="E-posta" className="p8-field-wide" help={orgLock?.lockEmail === "locked" ? <span className="p8-governance-help"><Icon name="lock" /> Şirket tarafından yönetiliyor</span> : orgLock?.lockEmail === "suggested" ? "Şirket önerisi (düzenleyebilirsiniz)" : undefined}>
              <Input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={254} value={data.email} onChange={(e) => update("email", e.target.value)} onBlur={() => { update("email", normalizeEmailField(data.email)); setActivePreviewTarget(null); }} onFocus={() => setActivePreviewTarget("email")} placeholder="ad@firma.com" disabled={orgLock?.lockEmail === "locked"}/>
            </Field>
            <Field label="Konum" className="p8-field-wide" help={locationMessage || "Şehir veya bölge bilgisi yeterlidir."}>
              <div className="p8-inline-field"><Input value={data.location} onChange={(e) => update("location", e.target.value)} placeholder="İzmir, Türkiye" {...bindTarget("social")}/><Button variant="secondary" onClick={() => void detectCity()} disabled={locationLoading}><Icon name="map" />{locationLoading ? "Bulunuyor" : "Konumumu Bul"}</Button></div>
            </Field>
          </div>
        </section>

        <section id="p8-company" className="p8-section-card">
          <div className="p8-section-heading"><span>03</span><div><h2>Şirket</h2><p>Profesyonel kimliğinizi şirket ve pozisyon bilgileriyle tamamlayın.</p></div></div>
          <div className="p8-field-grid">
            <Field label="Ünvan / Pozisyon" required help={orgLock?.lockTitle === "locked" ? <span className="p8-governance-help"><Icon name="lock" /> Şirket tarafından yönetiliyor</span> : orgLock?.lockTitle === "suggested" ? "Şirket önerisi (düzenleyebilirsiniz)" : undefined}>
              {orgLock && orgLock.jobTitles.length > 0 ? (
                <Select value={data.role} onChange={(e) => update("role", e.target.value)} required disabled={orgLock.lockTitle === "locked"} {...bindTarget("identity")}>
                  <option value="">Ünvan seç</option>
                  {orgLock.jobTitles.map((title) => <option key={title} value={title}>{title}</option>)}
                  {data.role && !orgLock.jobTitles.includes(data.role) && <option value={data.role}>{data.role}</option>}
                </Select>
              ) : (
                <Input list="yenomi-title-options" value={data.role} onChange={(e) => update("role", e.target.value)} placeholder="Ünvan / Pozisyon" required disabled={orgLock?.lockTitle === "locked"} {...bindTarget("identity")}/>
              )}
            </Field>
            {!(orgLock && orgLock.jobTitles.length > 0) ? <datalist id="yenomi-title-options">{TITLE_OPTIONS.map((title)=><option key={title} value={title}/>)}</datalist> : null}
            <Field label="Şirket" help={orgLock?.lockCompany === "locked" ? <span className="p8-governance-help"><Icon name="lock" /> Şirket tarafından yönetiliyor</span> : orgLock?.lockCompany === "suggested" ? "Şirket önerisi (düzenleyebilirsiniz)" : "İsteğe bağlı"}>
              <Input value={data.company} onChange={(e) => update("company", e.target.value)} placeholder="Şirket adı" disabled={orgLock?.lockCompany === "locked"} {...bindTarget("identity")}/>
            </Field>
          </div>
          {orgLock && orgLock.lockTitle !== "locked" && <div className="p8-title-request">{orgLock.titleRequest?.status === "PENDING" ? <p className="p8-message p8-message--info"><Icon name="clock" /> “{orgLock.titleRequest.requestedTitle}” ünvan talebiniz İK onayında.</p> : orgLock.titleRequest?.status === "REJECTED" ? <p className="p8-message p8-message--error"><Icon name="alert" /> Ünvan talebiniz reddedildi.{orgLock.titleRequest.note ? ` Not: ${orgLock.titleRequest.note}` : ""}</p> : titleRequestOpen ? <div className="p8-inline-field"><Input value={titleRequestValue} onChange={(e) => setTitleRequestValue(e.target.value)} placeholder="Listede olmayan ünvanınızı yazın" maxLength={120}/><Button variant="ghost" onClick={() => { setTitleRequestOpen(false); setTitleRequestValue(""); }}>Vazgeç</Button><Button variant="primary" disabled={titleRequestBusy || titleRequestValue.trim().length<2} onClick={() => void submitTitleRequest()}>{titleRequestBusy ? "Gönderiliyor..." : "İK'ya Gönder"}</Button></div> : <Button variant="ghost" onClick={() => setTitleRequestOpen(true)}><Icon name="sparkles" /> Listede yok mu? Yeni ünvan talep et</Button>}{titleRequestMessage && <p className="p8-message p8-message--info">{titleRequestMessage}</p>}</div>}
        </section>

        <section id="p8-social" className="p8-section-card">
          <div className="p8-section-heading"><span>04</span><div><h2>Sosyal Medya</h2><p>Profesyonel ağlarınızı yalnız kullanmak istediğiniz kanallarla sınırlayın.</p></div></div>
          <div className="p8-field-grid">
            <Field label="LinkedIn"><Input type="url" value={data.linkedin} onChange={(e) => update("linkedin", e.target.value)} placeholder="https://linkedin.com/in/kullanici" inputMode="url" autoCapitalize="none" spellCheck={false} {...bindTarget("social")}/></Field>
            <Field label="Instagram"><Input type="url" value={data.instagram} onChange={(e) => update("instagram", e.target.value)} placeholder="https://instagram.com/kullanici" inputMode="url" autoCapitalize="none" spellCheck={false} {...bindTarget("social")}/></Field>
          </div>
        </section>

        <section id="p8-links" className="p8-section-card">
          <div className="p8-section-heading"><span>05</span><div><h2>Bağlantılar</h2><p>Web sitenizi ve kalıcı Yenomi ID adresinizi yönetin.</p></div></div>
          <div className="p8-field-grid">
            <Field label="Web Sitesi"><Input type="url" value={data.website} onChange={(e) => update("website", e.target.value)} placeholder="https://firma.com" inputMode="url" autoCapitalize="none" spellCheck={false} {...bindTarget("social")}/></Field>
            <Field label="Yenomi ID" help="Paylaşım adresi /p/{slug} şeklindedir. QR kimliği ayrı ve sabittir; slug değişince QR yeniden basılmaz.">
              <div className="p8-slug-field"><span>yenomi.id/p/</span><Input value={profileSlug} onChange={(e) => updateSlug(e.target.value)} onBlur={() => setProfileSlug(normalizeProfileSlug(profileSlug))} placeholder="adsoyad" minLength={3} maxLength={40}/></div>
            </Field>
          </div>
          <div className={`p8-slug-feedback p8-slug-feedback--${slugStatus}`} aria-live="polite"><span>{slugMessage || "Ad-soyadından otomatik önerilir; yayınlamadan önce değiştirebilirsiniz."}</span>{slugTouched && <Button size="sm" variant="secondary" onClick={() => { setSlugTouched(false); setProfileSlug(createProfileSlug(data.name)); }}>Otomatik Öner</Button>}</div>
          {slugSuggestions.length > 0 && <div className="p8-slug-suggestions" aria-label="Uygun bağlantı önerileri">{slugSuggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => updateSlug(suggestion)}>{suggestion}</button>)}</div>}
        </section>

        <section id="p8-appearance" className="p8-section-card">
          <div className="p8-section-heading"><span>06</span><div><h2>Profil Görünümü &amp; Uluslararası Katman</h2><p>Fotoğraf, kısa biyografi ve İngilizce içerik ile kartınızın ilk izlenimini tamamlayın.</p></div></div>
          <div className="p8-photo-row">
            <div className="p8-photo-preview" aria-hidden="true">{data.image ? <img src={data.image} alt="" /> : <span>{data.name.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "Y"}</span>}</div>
            <div className="p8-photo-actions"><strong>Profil fotoğrafı</strong><p>JPG, PNG veya WebP · en fazla 5 MB · en az 240 × 240 px.</p><label className="ds-button ds-button--secondary p8-file-button">Fotoğraf Seç<input type="file" accept="image/jpeg,image/png,image/webp" onChange={imageChange} onFocus={() => setActivePreviewTarget("photo")} onBlur={() => setActivePreviewTarget(null)}/></label>{data.image && <Button size="sm" variant="ghost" onClick={() => { update("image", ""); setImageMessage(""); }}>Fotoğrafı Kaldır</Button>}{imageMessage && <span className="p8-field-error" role="alert">{imageMessage}</span>}</div>
          </div>
          <Field label="Kısa Biyografi" help={`${(data.bio || "").length}/280 karakter`}>
            <Textarea value={data.bio || ""} onChange={(e) => update("bio", e.target.value)} maxLength={280} rows={5} placeholder="Kısa ve profesyonel bir tanıtım yazın..." {...bindTarget("bio")}/>
          </Field>
          <div className="p8-international-heading"><span>ULUSLARARASI KATMAN</span><p>İngilizce görünümde kullanılacak isteğe bağlı bilgileri ekleyin.</p></div>
          <Field label="İngilizce ünvan" help="Uluslararası networking katmanı. Boş bırakılırsa İngilizce görünümde Türkçe ünvan kullanılır.">
            <Input value={englishRole} onChange={(e) => setEnglishRole(e.target.value)} placeholder="Head of Partnerships" />
          </Field>
          <Field label="Hakkında (EN)" help={`${englishAbout.length}/280 karakter`}>
            <Textarea value={englishAbout} onChange={(e) => setEnglishAbout(e.target.value)} maxLength={280} rows={4} placeholder="Uluslararası etkinlikler için kısa İngilizce tanıtım." />
          </Field>
        </section>

        {auditNotice && <div className="p8-msg p8-msg--info" role="status">{auditNotice}</div>}
        {message && <div className="p8-msg p8-msg--error" role="alert">{message}</div>}

        <div className="p8-mob-act" aria-label="Profil düzenleme işlemleri">
          <Button variant="secondary" onClick={() => setMobilePreviewOpen(true)}><Icon name="id" />Önizle</Button>
          <Button variant="primary" disabled={publishDisabled} onClick={() => void publish()}>{primaryCtaLabel}</Button>
        </div>
      </form>

      <aside className="p8-preview-column" aria-label="Canlı kart önizlemesi">
        {(() => {
          const completion = calculateProfileCompletion(data);
          const missingHint = formatMissingItemsText(data);
          return (
            <section className="p8-ccard" aria-label="Profil doluluk seviyesi">
              <div className="p8-chead">
                <div>
                  <strong>Profilin %{completion} hazır</strong>
                  <small>{completion === 100 ? "Tamamlandı" : "Önerilen adımlar"}</small>
                </div>
                <Badge tone={completion === 100 ? "success" : "neutral"}>%{completion}</Badge>
              </div>
              <div className="p8-ctrack" aria-hidden="true">
                <div className="p8-cfill" style={{ width: `${completion}%` }} />
              </div>
              <p className="p8-chint">{missingHint}</p>
            </section>
          );
        })()}

        <section className="p8-preview-card">
          <div className="p8-preview-hd">
            <div>
              <h3 className="p8-preview-title">Minimal Kart Önizlemesi</h3>
              <div className="p8-preview-sub-row">
                <span className={`p8-preview-badge p8-preview-badge--${isDirty ? "local" : isPublished ? "live" : "draft"}`}>
                  {isDirty ? (
                    isPublished ? (
                    <><Icon name="edit" /> Minimal önizleme — kaydedilmemiş değişiklikler var</>
                    ) : (
                    <><Icon name="edit" /> Minimal önizleme — henüz yayınlanmadı (kaydedilmemiş değişiklikler var)</>
                    )
                  ) : isPublished ? (
                    <><Icon name="check" /> Canlı profilin minimal görünümü</>
                  ) : (
                    <><Icon name="clock" /> Henüz yayınlanmadı</>
                  )}
                </span>
              </div>
            </div>
            <div className="p8-preview-acts">
              {isPublished && profileSlug && <a className="yi-btn yi-btn--secondary" href={cardShareUrl(profileSlug)} target="_blank" rel="noopener noreferrer"><Icon name="external" /> Canlı profili aç</a>}
              <Button size="sm" variant="secondary" onClick={() => setPhoneTestOpen(true)}>
                <Icon name="qr" /> Telefonda Test Et
              </Button>
            </div>
          </div>
          {preview}
        </section>

        <section className="p8-url-card">
          <div>
            <h3>Kart bağlantınız</h3>
            <p>Paylaşım adresi okunabilir slug kullanır. QR kimliği ayrıdır ve değişmez.</p>
          </div>
          <div className="p8-url-row">
            <span>yenomi.id/p/{profileSlug || "yenomi-id"}</span>
            <Button size="sm" variant="secondary" onClick={() => void profileCardActions.copyLink()}>
              <Icon name="copy" /> Kopyala
            </Button>
          </div>
          {publicId && <p>QR kimliği: /p/{publicId}</p>}
        </section>

        <section className="p8-note">
          <Icon name="sparkles" />
          <div>
            <strong>Anlık güncelleme</strong>
            <p>Kaydettiğiniz değişiklikler QR ve NFC kartınızı yeniden üretmeden aynı bağlantıda yayınlanır.</p>
          </div>
        </section>
      </aside>
    </div>

    <Drawer open={mobilePreviewOpen} title="Kart Önizlemesi" onClose={() => setMobilePreviewOpen(false)}><div className="p8-mobile-preview">{preview}</div></Drawer>

    <Modal open={phoneTestOpen} title="Telefonda Test Et" onClose={() => setPhoneTestOpen(false)}>
      <div className="p8-pmodal">
        {profileId ? (
          <>
            <p>Mobil cihazınızın kamerası ile aşağıdaki QR kodu okutarak canlı kart profilinizi telefonunuzda hemen görüntüleyin.</p>
            {isDirty && isPublished && (
              <p className="p8-phone-test-dirty-note" role="status">
                <Icon name="info" /> Kaydedilmemiş değişiklikler telefon testinde henüz görünmez. Değişiklikleri görmek için önce kaydetmelisiniz.
              </p>
            )}
            {phoneTestQrDataUrl ? (
              <img src={phoneTestQrDataUrl} alt="Mobil test QR kodu" className="p8-pqr" />
            ) : (
              <div className="p8-qr-placeholder">QR hazırlanıyor...</div>
            )}
            <span className="p8-purl">{cardShareUrl(profileSlug || publicId || "yenomi-id")}</span>
          </>
        ) : (
          <div className="p8-phone-test-unpublished">
            <p>Kartınız henüz yayınlanmadı.</p>
            <p>Telefonda test edebilmek için önce <strong>"Kaydet ve Yayınla"</strong> düğmesi ile profilinizi yayınlayın.</p>
          </div>
        )}
      </div>
    </Modal>
  </div>;

  if (!isBusinessCard) {
    return <UserPanelShell
      title={profileId ? "Profili Düzenle" : "Profilini Oluştur"}
      description="Dijital kartvizit bilgilerinizi düzenleyin. Kaydettiğiniz değişiklikler aynı QR ve NFC bağlantısında yayınlanır."
      eyebrow="Kart"
      activeKey="studio"
      actions={[
        { href: cancelHref, label: "İptal", onClick: () => { handleCancelClick({ preventDefault: () => {} } as React.MouseEvent); } },
        { label: primaryCtaLabel, onClick: () => void publish(), primary: true, disabled: publishDisabled },
      ]}
    >{editorBody}</UserPanelShell>;
  }

  return <div className="p8-corporate-workspace p8-corporate-workspace--decoupled">
    <header className="p8-corporate-header">
      <div>
        <span>Kurumsal Kart</span>
        <h1>{profileId ? "Kart Profilini Düzenle" : "Kart Profilini Oluştur"}</h1>
        <p>Şirket politikasına açık alanları düzenleyin; kilitli alanlar merkezi olarak yönetilir.</p>
      </div>
      <div className="p8-header-actions">
        {saveStatusBadge}
        <Link className="ds-button ds-button--secondary" href={cancelHref} onClick={handleCancelClick}>İptal</Link>
        <Button variant="primary" disabled={publishDisabled} onClick={() => void publish()}>{primaryCtaLabel}</Button>
      </div>
    </header>
    <div className="p8-corporate-content">{editorBody}</div>
  </div>;
}
