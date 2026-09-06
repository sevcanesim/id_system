"use client";

import Link from "next/link";
import { ChangeEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CardTemplate from "../CardTemplate";
import { getBrowserIdentity } from "../../lib/auth/browser-identity";
import { ownProfileImagePath, profileImagePathFromValue } from "../../lib/profile-images";
import UserPanelShell from "../components/UserPanelShell";
import QRCode from "qrcode";
import { Badge, Button, Drawer, Field, Input, Modal, Select, Textarea } from "../components/ui";
import { Icon } from "../icons";
import { TITLE_OPTIONS, normalizeEmailField, normalizeTrPhone } from "../../lib/form-standards";
import { unusedEntitlementId } from "../../lib/commerce/entitlement-bind";
import { INDIVIDUAL_PRODUCT_PURCHASE_HREF } from "../../lib/commerce/individual-portal-access";
import type { CardProfileRow } from "../../lib/card-profile";
import { track } from "../../lib/analytics";
import { ErrorState, PageLoadingView } from "../components/ui/States";
import { useNotice } from "../components/ui/NotificationCenter";
import { useUnsavedChanges } from "../components/UnsavedChangesContext";
import { useProfileCardActions } from "../hooks/useProfileCardActions";
import { clearLegacyUnscopedCardDraft } from "../../lib/security/client-private-state";

import {
  calculateProfileCompletion,
  ensureRealImage,
  formatMissingItemsText,
  INITIAL_CARD_DATA,
  normalizeProfileSlug,
  storagePathFromPublicUrl,
  type CardData,
  type UploadedImage,
} from "./domain/profile-editor";
import type { CardBranding, CardTemplateLink } from "../CardTemplate";
import {
  fetchOrganizationIdentity,
  type CorporateTemplateSettings,
  type OrgLock,
} from "./domain/organization-identity";
import { cardShareUrl } from "../../lib/public-card/urls";
import { minimizeCoordinates } from "../../lib/location/coordinates";

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

function getCardEditorScrollRoot(element: HTMLElement | null) {
  const panelScroller = element?.closest<HTMLElement>(".business-shell, .enterprise-dashboard-main") ?? null;
  if (!panelScroller || typeof window === "undefined") return null;

  const { overflowY } = window.getComputedStyle(panelScroller);
  const isScrollable = /auto|scroll|overlay/.test(overflowY) && panelScroller.scrollHeight > panelScroller.clientHeight;
  return isScrollable ? panelScroller : null;
}

function scrollCardEditorSection(element: HTMLElement, behavior: ScrollBehavior) {
  // Ordinary panel routes use .business-shell, while the long-form “Kartım”
  // editor intentionally uses document scrolling. Only scroll an ancestor
  // when it is a real scroll container; otherwise use the browser viewport.
  const panelScroller = getCardEditorScrollRoot(element);

  if (panelScroller) {
    const offset = 20;
    const top = panelScroller.scrollTop + element.getBoundingClientRect().top - panelScroller.getBoundingClientRect().top - offset;
    panelScroller.scrollTo({ top: Math.max(0, top), behavior });
    return;
  }

  element.scrollIntoView({ block: "start", behavior });
}

export default function CardWizard({ mode }: { mode?: "corporate" | "individual" }) {
  const { notify } = useNotice();
  const [data, setData] = useState<CardData>(INITIAL_CARD_DATA);
  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [newCardEntitlementId, setNewCardEntitlementId] = useState<string | null>(null);
  const [profileSlug, setProfileSlug] = useState("");
  const [publicId, setPublicId] = useState("");
  const [searchIndexingEnabled, setSearchIndexingEnabled] = useState(false);
  const [englishRole, setEnglishRole] = useState("");
  const [englishAbout, setEnglishAbout] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [imageMessage, setImageMessage] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const [auditNotice, setAuditNotice] = useState("");
  const deferredData = useDeferredValue(data);
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [accessState, setAccessState] = useState<"checking" | "allowed" | "denied" | "failed">("checking");
  const [loadFailure, setLoadFailure] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [orgLock, setOrgLock] = useState<OrgLock | null>(null);
  const [orgBranding, setOrgBranding] = useState<CardBranding | null>(null);
  const [corporateTemplate, setCorporateTemplate] = useState<CorporateTemplateSettings | null>(null);
  const [orgLinks, setOrgLinks] = useState<CardTemplateLink[]>([]);
  const [brandSettingsOpen, setBrandSettingsOpen] = useState(false);
  const [brandSettingsBusy, setBrandSettingsBusy] = useState(false);
  const [brandSettingsMessage, setBrandSettingsMessage] = useState("");
  const [brandSettings, setBrandSettings] = useState({
    name: "Kurumsal standart",
    primaryColor: "#17121f",
    logoUrl: "",
  });
  const brandSettingsRequestHandled = useRef(false);
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
    searchIndexingEnabled: boolean;
  } | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedProfileId = searchParams.get("id");
  const isNewCard = searchParams.get("new") === "1";
  const businessOrganizationId = searchParams.get("organizationId");
  const brandSettingsRequested = searchParams.get("brandSettings") === "1";
  // Kurumsal panel rotası, sorgu parametreleri yüklenirken veya yönlendirici
  // güncellenirken bireysel editöre düşmemelidir. Rota bu modu açıkça
  // sabitlediğinde URL yalnızca organizasyon kimliğini taşır.
  const isBusinessCard = mode === "corporate" || (searchParams.get("business") === "1" && Boolean(businessOrganizationId));
  const editorPath = `${mode === "corporate" ? "/kurumsal/panel/kartim" : "/olustur"}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const loginHref = `/giris?portal=${isBusinessCard ? "business" : "individual"}&next=${encodeURIComponent(editorPath)}`;
  const canManageCorporateTemplate = ["OWNER", "ADMIN"].includes(orgLock?.membershipRole.toUpperCase() || "");
  const profileCardActions = useProfileCardActions({
    profileId,
    publicId,
    publicUrl: publicId ? cardShareUrl(publicId) : "",
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
      profileSlug !== baseline.slug ||
      searchIndexingEnabled !== baseline.searchIndexingEnabled
    );
  }, [data, englishRole, englishAbout, profileSlug, searchIndexingEnabled, baseline]);

  const { setIsDirty: setContextDirty, guardLinkClick } = useUnsavedChanges();

  useEffect(() => {
    setContextDirty(isDirty);
    return () => setContextDirty(false);
  }, [isDirty, setContextDirty]);

  const handleCancelClick = (e: React.MouseEvent) => {
    guardLinkClick(e, cancelHref);
  };

  useEffect(() => {
    if (accessState !== "allowed" || typeof window === "undefined") return;

    // A short first section can leave the IntersectionObserver viewport before
    // the reader has reached the next heading. That made "İletişim" look
    // selected on the first paint. The active tab is now derived from the
    // last section heading the reader has actually passed.
    const scrollRoot = getCardEditorScrollRoot(document.querySelector<HTMLElement>(".p8-editor"));
    const scrollTarget: EventTarget = scrollRoot ?? window;
    let frame = 0;

    const syncActiveSection = () => {
      frame = 0;
      const anchor = scrollRoot
        ? scrollRoot.getBoundingClientRect().top + 132
        : 132;
      const passed = CARD_SECTIONS
        .map((section) => document.getElementById(section.id))
        .filter((section): section is HTMLElement => Boolean(section))
        .filter((section) => section.getBoundingClientRect().top <= anchor + 1)
        .at(-1);

      setActiveSection((passed?.id ?? CARD_SECTIONS[0].id) as (typeof CARD_SECTIONS)[number]["id"]);
    };

    const scheduleSync = () => {
      if (!frame) frame = window.requestAnimationFrame(syncActiveSection);
    };

    syncActiveSection();
    scrollTarget.addEventListener("scroll", scheduleSync, { passive: true });
    window.addEventListener("resize", scheduleSync);
    return () => {
      scrollTarget.removeEventListener("scroll", scheduleSync);
      window.removeEventListener("resize", scheduleSync);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [accessState]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const activeTab = document.querySelector(`.p8-section-nav a[aria-current="true"]`);
    const sectionNav = activeTab?.closest<HTMLElement>(".p8-section-nav");
    if (activeTab && sectionNav) {
      const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // `Element.scrollIntoView()` also scrolls the document. When the active
      // section changes while a user is reading the long form, that pulled the
      // viewport back to the tab strip at the top. Only the horizontally
      // scrollable tab rail needs centering here.
      const tabRect = activeTab.getBoundingClientRect();
      const navRect = sectionNav.getBoundingClientRect();
      const left = sectionNav.scrollLeft + tabRect.left - navRect.left - (sectionNav.clientWidth - tabRect.width) / 2;
      sectionNav.scrollTo({ left: Math.max(0, left), behavior: prefersReduced ? "auto" : "smooth" });
    }
  }, [activeSection]);

  useEffect(() => {
    if (accessState !== "allowed" || typeof window === "undefined") return;

    const scrollToHash = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!CARD_SECTIONS.some((section) => section.id === id)) return;

      window.requestAnimationFrame(() => {
        const element = document.getElementById(id);
        if (!element) return;
        scrollCardEditorSection(element, "auto");
        setActiveSection(id as (typeof CARD_SECTIONS)[number]["id"]);
      });
    };

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    window.addEventListener("popstate", scrollToHash);
    return () => {
      window.removeEventListener("hashchange", scrollToHash);
      window.removeEventListener("popstate", scrollToHash);
    };
  }, [accessState]);

  const handleSectionClick = (event: React.MouseEvent<HTMLAnchorElement>, id: (typeof CARD_SECTIONS)[number]["id"]) => {
    event.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const prefersReduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scrollCardEditorSection(element, prefersReduced ? "auto" : "smooth");
      setActiveSection(id);
      if (typeof window !== "undefined" && window.history?.pushState) {
        window.history.pushState(null, "", `#${id}`);
      }
    }
  };

  useEffect(() => {
    if (!phoneTestOpen) return;
    const shareUrl = publicId ? cardShareUrl(publicId) : "";
    if (!shareUrl) {
      setPhoneTestQrDataUrl("");
      return;
    }
    QRCode.toDataURL(shareUrl, { width: 360, margin: 2, errorCorrectionLevel: "H" })
      .then(setPhoneTestQrDataUrl)
      .catch(() => setPhoneTestQrDataUrl(""));
  }, [phoneTestOpen, publicId]);

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
    clearLegacyUnscopedCardDraft();
    void (async () => {
      try {
        const identity = await getBrowserIdentity();
        if (!identity) {
          setAccessState("denied");
          router.replace(loginHref);
          return;
        }
        const user = identity.user;
        setUserId(user.id);
        const profilesResponse = await fetch("/api/profiles/mine", { credentials: "same-origin", cache: "no-store" });
        if (profilesResponse.status === 401) {
          setAccessState("denied");
          router.replace(loginHref);
          return;
        }
        if (!profilesResponse.ok) throw new Error("Profil kayıtları yüklenemedi.");
        const profilesPayload = await profilesResponse.json() as { profiles?: CardProfileRow[] };
        const profiles = profilesPayload.profiles ?? [];
        const individualProfiles = profiles.filter((profile) => !profile.organization_id);

        // Eski veya eksik bir bağlantı kurumsal profil kimliğini yalnızca
        // `?id=...` ile açabilir. Bu durumda bireysel sidebar'ı bir an bile
        // göstermeden profili ait olduğu kurumsal editör rotasına taşı.
        if (requestedProfileId && !isBusinessCard && !isNewCard) {
          const mineResponse = await fetch("/api/organizations/mine", { credentials: "same-origin", cache: "no-store" });
          const requestedProfile = profiles.find((profile) => profile.id === requestedProfileId) ?? null;
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
        const organizationIdentityPromise = fetchOrganizationIdentity(businessOrganizationId);

        let entitlementPayload: { active?: boolean; next?: string; entitlements?: { id: string }[] } = {};
        if (isBusinessCard && businessOrganizationId) {
          const mineResponse = await fetch("/api/organizations/mine", { credentials: "same-origin", cache: "no-store" });
          if (mineResponse.status === 401) {
            setAccessState("denied");
            router.replace(loginHref);
            return;
          }
          const minePayload = await mineResponse.json() as { organizations?: Array<{ organization_id: string }> };
          const hasMembership = mineResponse.ok && Boolean(minePayload.organizations?.some((item) => item.organization_id === businessOrganizationId));
          if (!hasMembership) {
            setAccessState("denied");
            router.replace("/kurumsal/panel");
            return;
          }
        } else {
          const entitlementResponse = await fetch("/api/commerce/entitlements", {
            credentials: "same-origin",
            cache: "no-store",
          });
          entitlementPayload = await entitlementResponse.json() as { active?: boolean; next?: string; entitlements?: { id: string }[] };
          if (!entitlementResponse.ok || !entitlementPayload.active) {
            // DashboardShell keeps the user in the panel and presents the
            // intentional purchase CTA; it must not force a route change.
            setAccessState("allowed");
            return;
          }
        }
        // `?new=1` yalnızca kurumsal çoklu kart akışlarında kullanılabilir.
        // `?id=...` -> o belirli kartı düzenle.
        // Kurumsal Kartım ekranında `id` henüz URL'ye eklenmemiş olsa bile
        // kullanıcının kişisel ilk kartına düşme. Organizasyon adına bağlı
        // kurumsal profili bul; böylece sidebar'daki Kartım her zaman aynı
        // kurumsal karta açılır.
        let profile: CardProfileRow | null = null;
        if (!isNewCard && requestedProfileId) {
          profile = profiles.find((candidate) => candidate.id === requestedProfileId) ?? null;
        } else if (!isNewCard && isBusinessCard) {
          const identityForProfile = await organizationIdentityPromise;
          const organizationId = identityForProfile?.lock.organizationId || businessOrganizationId;
          if (organizationId) {
            profile = profiles.find((candidate) => candidate.organization_id === organizationId) ?? null;
          }
        } else if (!isNewCard) {
          profile = individualProfiles[0] ?? null;
        }
        if (!isBusinessCard && (isNewCard || !profile)) {
          if (isNewCard && individualProfiles.length > 0) {
            setAccessState("denied");
            router.replace("/olustur");
            return;
          }
          const spareEntitlementId = unusedEntitlementId(entitlementPayload.entitlements ?? [], individualProfiles);
          if (!spareEntitlementId) {
            setAccessState("denied");
            router.replace(isNewCard ? "/urunler/nfc-kart?paket=individual&reason=no-spare-card" : (entitlementPayload.next || INDIVIDUAL_PRODUCT_PURCHASE_HREF));
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
          const storedImage = profile.image_url ?? "";
          const storedImagePath = profileImagePathFromValue(storedImage);
          const imageUrl = storedImagePath ? ownProfileImagePath(storedImagePath) : "";
          setOriginalImageUrl(storedImage);
          setProfileSlug(profile.slug ?? "");
          setSearchIndexingEnabled(Boolean(profile.search_indexing_enabled));
          setData({
            name: profile.name ?? "", role: profile.role ?? "", company: profile.company ?? "",
            phone: profile.phone ?? "", whatsapp: profile.whatsapp ?? "", email: profile.email ?? "",
            website: profile.website ?? "", linkedin: profile.linkedin ?? "", instagram: profile.instagram ?? "",
            location: profile.location ?? "", image: imageUrl, bio: profile.bio ?? ""
          });
          const localeResponse = await fetch(`/api/profiles/locales?profileId=${encodeURIComponent(profile.id)}`, {
            credentials: "same-origin",
            cache: "no-store",
          });
          const localePayload = localeResponse.ok
            ? await localeResponse.json() as { locale?: { role?: string | null; about?: string | null } | null }
            : {};
          const localeRole = localePayload.locale?.role || "";
          const localeAbout = localePayload.locale?.about || "";
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
            searchIndexingEnabled: Boolean(profile.search_indexing_enabled),
          });
        } else {
          setOriginalImageUrl("");
          const initialDraftData: CardData = {
            name: "",
            role: "",
            company: "", phone: "", whatsapp: "",
            email: user.email || "",
            website: "", linkedin: "", instagram: "", location: "",
            image: "", bio: ""
          };
          setData(initialDraftData);
          setBaseline({
            data: initialDraftData,
            englishRole: "",
            englishAbout: "",
            slug: "",
            searchIndexingEnabled: false,
          });
        }

        // Applied last so a company's centrally managed identity always wins
        // over both a saved profile's old values and LinkedIn prefill — this is
        // what makes locked fields actually stay in sync with company Ayarlar.
        const organizationIdentity = await organizationIdentityPromise;
        if (organizationIdentity) {
          setOrgLock(organizationIdentity.lock);
          setOrgBranding(organizationIdentity.branding);
          setCorporateTemplate(organizationIdentity.template);
          setOrgLinks(organizationIdentity.links);
          // Legacy template bookmarks arrive without an organization id. Once
          // the authorized membership is known, canonicalize the URL so later
          // saves remain in the corporate workspace instead of falling back to
          // the personal Kartım route.
          if (isBusinessCard && !businessOrganizationId) {
            const params = new URLSearchParams({
              business: "1",
              organizationId: organizationIdentity.lock.organizationId,
            });
            if (requestedProfileId) params.set("id", requestedProfileId);
            if (isNewCard) params.set("new", "1");
            if (brandSettingsRequested) params.set("brandSettings", "1");
            router.replace(`${mode === "corporate" ? "/kurumsal/panel/kartim" : "/olustur"}?${params.toString()}`);
          }
          if (
            brandSettingsRequested &&
            !brandSettingsRequestHandled.current &&
            ["OWNER", "ADMIN"].includes(organizationIdentity.lock.membershipRole.toUpperCase())
          ) {
            brandSettingsRequestHandled.current = true;
            setBrandSettings({
              name: organizationIdentity.template.name,
              primaryColor: organizationIdentity.template.primaryColor,
              logoUrl: organizationIdentity.template.logoUrl,
            });
            setBrandSettingsMessage("");
            setBrandSettingsOpen(true);
          }
          setData((current) => {
            const filledGaps = Object.fromEntries(
              Object.entries(organizationIdentity.suggestedValues).filter(
                ([key, value]) => value && !current[key as keyof CardData],
              ),
            );
            const finalData = { ...current, ...filledGaps, ...organizationIdentity.lockedValues };
            setBaseline((prev) => prev ? { ...prev, data: finalData } : {
              data: finalData,
              englishRole: "",
              englishAbout: "",
              slug: "",
              searchIndexingEnabled: false,
            });
            return finalData;
          });
        }
      } catch (error) {
        setContextDirty(false);
        setLoadFailure(error instanceof Error && error.message ? error.message : "Kart bilgileri şu anda yüklenemedi.");
        setAccessState("failed");
      }
    })();
  }, [router, businessOrganizationId, brandSettingsRequested, isBusinessCard, isNewCard, loginHref, loadAttempt, mode, requestedProfileId]);

  function update(field: keyof CardData, value: string) {
    setData((current) => ({ ...current, [field]: value }));
  }

  function openCorporateBrandSettings() {
    if (!corporateTemplate) return;
    setBrandSettings({
      name: corporateTemplate.name,
      primaryColor: corporateTemplate.primaryColor,
      logoUrl: corporateTemplate.logoUrl,
    });
    setBrandSettingsMessage("");
    setBrandSettingsOpen(true);
  }

  async function saveCorporateBrandSettings() {
    if (!orgLock || !canManageCorporateTemplate) return;

    const name = brandSettings.name.trim();
    const primaryColor = brandSettings.primaryColor.trim();
    const logoUrl = brandSettings.logoUrl.trim();
    if (name.length < 2) {
      setBrandSettingsMessage("Kart standardı adı en az 2 karakter olmalı.");
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
      setBrandSettingsMessage("Ana renk #RRGGBB biçiminde olmalı.");
      return;
    }
    if (logoUrl && !/^https:\/\//i.test(logoUrl)) {
      setBrandSettingsMessage("Logo adresi HTTPS ile başlamalı.");
      return;
    }

    setBrandSettingsBusy(true);
    setBrandSettingsMessage("");
    try {
      const response = await fetch("/api/organizations/templates", {
        method: corporateTemplate?.id ? "PATCH" : "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corporateTemplate?.id
          ? {
              action: "UPDATE",
              templateId: corporateTemplate.id,
              name,
              primaryColor,
              logoUrl,
            }
          : {
              organizationId: orgLock.organizationId,
              name,
              primaryColor,
              logoUrl,
              isDefault: true,
            }),
      });
      const payload = await response.json().catch(() => ({})) as {
        error?: string;
        template?: { id?: string; name?: string | null; primary_color?: string | null; logo_url?: string | null };
      };
      if (!response.ok) throw new Error(payload.error || "Şirket kart standardı kaydedilemedi.");

      const saved = payload.template;
      const nextTemplate: CorporateTemplateSettings = {
        id: saved?.id || corporateTemplate?.id || null,
        name: saved?.name?.trim() || name,
        primaryColor: saved?.primary_color || primaryColor,
        logoUrl: saved?.logo_url || logoUrl,
      };
      setCorporateTemplate(nextTemplate);
      setOrgBranding({
        logoUrl: nextTemplate.logoUrl || null,
        primaryColor: nextTemplate.primaryColor || null,
        companyName: orgLock.organizationName || null,
        variant: "ESSENTIAL",
      });
      setBrandSettings(nextTemplate);
      setBrandSettingsMessage("Şirket kart standardı kaydedildi. Bu görünüm ekip kartlarına uygulanır.");
      notify({ message: "Şirket kart standardı güncellendi.", tone: "success" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Şirket kart standardı kaydedilemedi.";
      setBrandSettingsMessage(errorMessage);
      notify({ message: errorMessage, tone: "error" });
    } finally {
      setBrandSettingsBusy(false);
    }
  }


  async function applyLocationPayload(payload: { city?: string; district?: string; addressLine?: string }) {
    const location = [payload.district, payload.city].filter(Boolean).join(", ") || payload.addressLine || "";
    if (!location) return false;
    update("location", location);
    setLocationMessage(`${location} bulundu. İstersen alanı düzenleyebilirsin.`);
    return true;
  }

  async function detectCity() {
    setLocationLoading(true);
    setLocationMessage("");

    const finish = () => setLocationLoading(false);

    async function applyGps(latitude: number, longitude: number) {
      const coordinates = minimizeCoordinates(latitude, longitude);
      if (!coordinates) {
        setLocationMessage("Konum geçersiz görünüyor. Konumu elle yazabilirsin.");
        return;
      }
      try {
        const response = await fetch(`/api/location/reverse?lat=${coordinates.latitude}&lng=${coordinates.longitude}`);
        const payload = await response.json() as { city?: string; district?: string; addressLine?: string };
        if (response.ok && await applyLocationPayload(payload)) return;
      } catch {
        setLocationMessage("Konum adrese çevrilemedi. Konumu elle yazabilirsin.");
        return;
      }
      setLocationMessage("Konum adrese çevrilemedi. Konumu elle yazabilirsin.");
    }

    if (!("geolocation" in navigator)) {
      setLocationMessage("Tarayıcın konum özelliğini desteklemiyor. Konumu elle yazabilirsin.");
      finish();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        await applyGps(coords.latitude, coords.longitude);
        finish();
      },
      () => {
        setLocationMessage("Konum izni verilmedi. Konumu elle yazabilirsin.");
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

  async function uploadImageIfNeeded(): Promise<UploadedImage> {
    if (!data.image.startsWith("data:")) return { url: data.image, path: storagePathFromPublicUrl(data.image), uploaded: false };
    const response = await fetch(data.image);
    const blob = await response.blob();
    const body = new FormData();
    body.set("image", new File([blob], "profile-image", { type: blob.type }));
    const upload = await fetch("/api/profile-images", { method: "POST", body, credentials: "same-origin" });
    const payload = await upload.json().catch(() => ({})) as { path?: unknown; previewUrl?: unknown; error?: unknown };
    if (!upload.ok || typeof payload.path !== "string" || typeof payload.previewUrl !== "string") {
      throw new Error(typeof payload.error === "string" ? payload.error : "Profil fotoğrafı yüklenemedi.");
    }
    return { url: payload.previewUrl, path: payload.path, uploaded: true };
  }

  async function deletePreviousImageIfNeeded(previousUrl: string, nextPath: string | null) {
    const previousPath = storagePathFromPublicUrl(previousUrl);
    if (!previousPath || previousPath === nextPath) return;
    await fetch("/api/profile-images", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ path: previousPath }),
    });
  }

  async function submitTitleRequest() {
    const title = titleRequestValue.trim();
    if (title.length < 2 || !orgLock) return;
    setTitleRequestBusy(true);
    setTitleRequestMessage("");
    try {
      const response = await fetch("/api/organizations/title-requests", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
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
      notify({ message: "Ünvan talebin İK'ya iletildi.", tone: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Talep gönderilemedi.";
      setTitleRequestMessage(message);
      notify({ message, tone: "error" });
    } finally {
      setTitleRequestBusy(false);
    }
  }

  function validateForm() {
    if (data.name.trim().length < 2) return "Ad soyad alanı zorunlu.";
    if (data.role.trim().length < 2) return "Ünvan alanı zorunlu.";
    return null;
  }

  async function publish() {
    if (saving) return;
    const formError = validateForm();
    if (formError) {
      setMessage(formError);
      notify({ message: formError, tone: "error" });
      return;
    }

    setSaving(true);
    setMessage("");
    let uploaded: UploadedImage | null = null;
    try {
      let currentUserId = userId;
      if (!currentUserId) {
        currentUserId = (await getBrowserIdentity())?.user.id ?? null;
      }
      if (currentUserId) {
        uploaded = await uploadImageIfNeeded();
        const slug = normalizeProfileSlug(profileSlug);
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
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            profileId: profileId || null,
            organizationId: isBusinessCard ? businessOrganizationId : null,
            patch: {
              slug: slug || null,
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
              image_url: uploaded.path || null,
              bio: data.bio?.trim() || null,
              is_published: true,
              search_indexing_enabled: searchIndexingEnabled,
            },
          }),
        });
        const savePayload = await saveResponse.json().catch(() => ({}));
        const saved = savePayload.profile as { id: string; public_id?: string | null } | undefined;
        const saveError = saveResponse.ok ? null : (savePayload.error as string | undefined) || "Kartvizit kaydedilemedi.";

        if (!saveError && saved && !profileId) setProfileId(saved.id);
        if (!saveError && saved && isBusinessCard && businessOrganizationId) {
          const linkResponse = await fetch("/api/organizations/card-profile-link", {
            method: "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ organizationId: businessOrganizationId, profileId: saved.id }),
          });
          if (!linkResponse.ok) {
            throw new Error("Kartvizit kaydedildi; fiziksel kart henüz bağlanamadı. Sayfayı yenileyip tekrar dene.");
          }
        }
        if (saveError) {
          // Eski bir özel adres artık başka bir profile geçtiyse ham Postgres
          // hatasını göstermeyiz. Yeni/değiştirilen adresler ayrıca kullanım
          // hakkı ile korunur.
          if (savePayload.code === "SLUG_TAKEN") {
            throw new Error("Özel Yenomi adresi az önce alındı. Lütfen destek ekibiyle iletişime geç.");
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
        if (saved?.public_id) setPublicId(saved.public_id);
        if (savePayload.warning) notify({ message: savePayload.warning as string, tone: "warning" });
        if (saved) {
          const localeResponse = await fetch("/api/profiles/locales", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              profileId: saved.id,
              locale: "en",
              role: englishRole.trim() || null,
              about: englishAbout.trim() || null,
            }),
          });
          if (!localeResponse.ok) {
            const message = "Kart kaydedildi; İngilizce içerik katmanı ayrıca kaydedilemedi.";
            setMessage(message);
            notify({ message, tone: "warning" });
          }
        }
        clearLegacyUnscopedCardDraft();
        setProfileSlug(slug);
        setIsPublished(true);
        setBaseline({
          data: { ...data, image: uploaded?.url ?? data.image },
          englishRole: englishRole.trim(),
          englishAbout: englishAbout.trim(),
          slug,
          searchIndexingEnabled,
        });
      } else {
        throw new Error("Oturumun sona ermiş. Lütfen tekrar giriş yap.");
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
      notify({
        message: isBusinessCard ? "Kurumsal kart profili güncellendi." : "Dijital kartvizitin yayınlandı.",
        tone: "success",
      });
      setSaving(false);
    } catch (error) {
      if (uploaded?.uploaded && uploaded.path) {
        await fetch("/api/profile-images", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ path: uploaded.path }),
        });
      }
      const rawMessage = error instanceof Error ? error.message : "Kartvizit kaydedilemedi.";
      const friendlyMessage = /failed to fetch|networkerror|load failed/i.test(rawMessage)
        ? "Sunucuya ulaşılamadı. İnternet bağlantını ve Supabase ayarlarını kontrol edip tekrar dene."
        : rawMessage;
      setMessage(friendlyMessage);
      notify({ message: friendlyMessage, tone: "error" });
      setSaving(false);
    }
  }

  if (accessState === "checking") {
    return <PageLoadingView label="Kimlik Stüdyosu hazırlanıyor" />;
  }
  if (accessState === "failed") {
    return (
      <main className="ds-page-loading">
        <ErrorState
          title="Kimlik Stüdyosu yüklenemedi"
          description={loadFailure || "Bağlantını kontrol edip tekrar deneyebilirsin."}
          onRetry={() => {
            setLoadFailure("");
            setAccessState("checking");
            setLoadAttempt((current) => current + 1);
          }}
        />
      </main>
    );
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
    (isAlreadyPublished && !isDirty);

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

  const previewData = isBusinessCard ? { ...deferredData, links: orgLinks } : deferredData;
  // The corporate brand response arrives after the editor's first paint. Its
  // template belongs to the published corporate profile; applying it here was
  // replacing the personal, minimal card preview after a short delay.
  const previewBranding = isBusinessCard ? null : orgBranding;
  const preview = (
    <div className="p8-preview-stage">
      <CardTemplate
        data={previewData}
        preview
        slug={profileSlug}
        publicId={publicId || null}
        branding={previewBranding}
        activePreviewTarget={activePreviewTarget}
      />
    </div>
  );

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
          <div className="p8-section-heading"><span>05</span><div><h2>Bağlantılar</h2><p>Web sitenizi yönetin; kalıcı kart adresiniz kişisel veriden türetilmez.</p></div></div>
          <div className="p8-field-grid">
            <Field label="Web Sitesi"><Input type="url" value={data.website} onChange={(e) => update("website", e.target.value)} placeholder="https://firma.com" inputMode="url" autoCapitalize="none" spellCheck={false} {...bindTarget("social")}/></Field>
            <Field label="Kalıcı kart adresi" help="NFC ve QR kodunuz bu rastgele kimliğe bağlıdır; adınız, e-postanız veya iç UUID'niz burada kullanılmaz.">
              <div className="p8-slug-field"><span>yenomi.id/p/</span><Input value={publicId || "İlk kayıtta otomatik oluşturulur"} readOnly aria-label="Kalıcı kart adresi" /></div>
            </Field>
          </div>
          {profileSlug ? <>
            <Field label="Özel Yenomi adresi" help="Okunabilir adresiniz korunur. NFC ve QR hedefiniz yine gizliliği koruyan kalıcı kart adresidir.">
              <div className="p8-slug-field"><span>yenomi.id/</span><Input value={profileSlug} readOnly aria-label="Özel Yenomi adresi" /></div>
            </Field>
            <div className="p8-slug-feedback p8-slug-feedback--idle" aria-live="polite"><span>Özel adres değişikliği, satışa açıldığında katalogdaki kullanım hakkınızla etkinleşir. Arama motoru görünürlüğü tercihiniz bundan bağımsızdır.</span></div>
          </> : <div className="p8-slug-feedback p8-slug-feedback--idle" aria-live="polite"><span>Özel Yenomi adresi yakında katalogdan etkinleştirilecek. Bu sırada NFC ve QR kartınız, yalnızca size ait kalıcı rastgele kart adresini kullanır.</span></div>}
        </section>

        <section id="p8-appearance" className="p8-section-card">
          <div className="p8-section-heading"><span>06</span><div><h2>Profil Görünümü &amp; Uluslararası Katman</h2><p>Fotoğraf, kısa biyografi ve İngilizce içerik ile kartınızın ilk izlenimini tamamlayın.</p></div></div>
          {isBusinessCard && orgLock && (
            <section className="p8-corporate-brand-card" aria-label="Şirket kart standardı">
              <div>
                <span>ŞİRKET KART STANDARDI</span>
                <h3>{corporateTemplate?.name || "Kurumsal standart"}</h3>
                <p>Logo ve ana renk ekipteki tüm dijital kartlarda ortak kullanılır.</p>
              </div>
              {canManageCorporateTemplate ? (
                <Button size="sm" variant="secondary" onClick={openCorporateBrandSettings} disabled={!corporateTemplate}>
                  <Icon name="pencil" /> Marka ayarlarını düzenle
                </Button>
              ) : (
                <span className="p8-governance-help"><Icon name="lock" /> Şirket tarafından yönetiliyor</span>
              )}
            </section>
          )}
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
          <section className="p8-privacy-card" aria-label="Arama motoru görünürlüğü">
            <div>
              <strong>Arama motoru görünürlüğü</strong>
              <p>Varsayılan olarak kapalıdır. Kapalıyken profil bağlantısını bilenler kartınızı açabilir, ancak Google gibi arama motorlarına indeksleme izni verilmez.</p>
            </div>
            <label className="p8-privacy-toggle">
              <input type="checkbox" checked={searchIndexingEnabled} onChange={(event) => setSearchIndexingEnabled(event.target.checked)} />
              <span>Profilimin arama motorlarında bulunmasına izin ver</span>
            </label>
          </section>
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
          const checklist = [
            { label: "Kimlik", complete: Boolean(data.name?.trim() && data.role?.trim()) },
            { label: "İletişim", complete: Boolean(data.phone?.trim() || data.email?.trim()) },
            { label: "Profil fotoğrafı", complete: Boolean(data.image?.trim()) },
            { label: "Şirket bilgisi", complete: Boolean(data.company?.trim()) },
            { label: "Kısa biyografi", complete: Boolean(data.bio?.trim()) },
            { label: "LinkedIn", complete: Boolean(data.linkedin?.trim()) },
          ];
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
              <ul className="p8-completion-checklist" aria-label="Profil tamamlama kontrol listesi">
                {checklist.map((item) => (
                  <li key={item.label} className={item.complete ? "is-complete" : ""}>
                    <Icon name={item.complete ? "check" : "clock"} aria-hidden="true" />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })()}

        <section className="p8-preview-card">
          <div className="p8-preview-hd">
            <div>
              <h3 className="p8-preview-title">Canlı Kart Önizlemesi</h3>
              <div className="p8-preview-sub-row">
                <span className={`p8-preview-badge p8-preview-badge--${isDirty ? "local" : isPublished ? "live" : "draft"}`}>
                  {isDirty ? (
                    isPublished ? (
                    <><Icon name="edit" /> Minimal önizleme — kaydedilmemiş değişiklikler var</>
                    ) : (
                    <><Icon name="edit" /> Minimal önizleme — henüz yayınlanmadı (kaydedilmemiş değişiklikler var)</>
                    )
                  ) : isPublished ? (
                    <><Icon name="check" /> {isBusinessCard ? "Minimal bireysel kart görünümü" : "Canlı bireysel kart görünümü"}</>
                  ) : (
                    <><Icon name="clock" /> Henüz yayınlanmadı</>
                  )}
                </span>
              </div>
            </div>
            <div className="p8-preview-acts">
              {isPublished && publicId && <a className="yi-btn yi-btn--secondary" href={cardShareUrl(publicId)} target="_blank" rel="noopener noreferrer"><Icon name="external" /> Canlı profili aç</a>}
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
            <p>Bu tek, rastgele adres NFC ve QR kodunuzun değişmez hedefidir.</p>
          </div>
          <div className="p8-url-row">
            <span>{publicId ? cardShareUrl(publicId) : "İlk kayıtta otomatik oluşturulur"}</span>
            <Button size="sm" variant="secondary" disabled={!publicId} onClick={() => void profileCardActions.copyLink()}>
              <Icon name="copy" /> Kopyala
            </Button>
          </div>
          {profileSlug && <p>Özel adres: yenomi.id/{profileSlug} → kalıcı kart adresinize yönlenir.</p>}
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
            <span className="p8-purl">{publicId ? cardShareUrl(publicId) : "Kart adresi hazırlanıyor..."}</span>
          </>
        ) : (
          <div className="p8-phone-test-unpublished">
            <p>Kartınız henüz yayınlanmadı.</p>
            <p>Telefonda test edebilmek için önce <strong>"Kaydet ve Yayınla"</strong> düğmesi ile profilinizi yayınlayın.</p>
          </div>
        )}
      </div>
    </Modal>

    <Modal open={brandSettingsOpen} title="Şirket kart standardı" onClose={() => !brandSettingsBusy && setBrandSettingsOpen(false)}>
      <div className="p8-brand-modal">
        <p>Bu ayarlar şirketinizdeki tüm dijital kartların ortak marka görünümünü belirler. Kişisel profil bilgilerini değiştirmez.</p>
        <Field label="Kart standardı adı" help="Yönetim içi tanımlama için kullanılır.">
          <Input
            value={brandSettings.name}
            onChange={(event) => setBrandSettings((current) => ({ ...current, name: event.target.value }))}
            maxLength={80}
            autoComplete="off"
          />
        </Field>
        <Field label="Ana renk" help="HEX biçiminde marka rengi.">
          <div className="p8-brand-color-input">
            <input
              type="color"
              aria-label="Ana renk seçici"
              value={/^#[0-9a-fA-F]{6}$/.test(brandSettings.primaryColor) ? brandSettings.primaryColor : "#17121f"}
              onChange={(event) => setBrandSettings((current) => ({ ...current, primaryColor: event.target.value }))}
            />
            <Input
              value={brandSettings.primaryColor}
              onChange={(event) => setBrandSettings((current) => ({ ...current, primaryColor: event.target.value }))}
              inputMode="text"
              maxLength={7}
              spellCheck={false}
              aria-label="Ana renk HEX değeri"
            />
          </div>
        </Field>
        <Field label="Logo URL" help="İsteğe bağlı. HTTPS adresi kullanın; şeffaf PNG veya SVG önerilir.">
          <Input
            type="url"
            value={brandSettings.logoUrl}
            onChange={(event) => setBrandSettings((current) => ({ ...current, logoUrl: event.target.value }))}
            placeholder="https://firma.com/logo.svg"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
          />
        </Field>
        {brandSettingsMessage && <p className="p8-brand-message" role="status">{brandSettingsMessage}</p>}
        <div className="p8-brand-modal-actions">
          <Button variant="secondary" onClick={() => setBrandSettingsOpen(false)} disabled={brandSettingsBusy}>Vazgeç</Button>
          <Button variant="primary" onClick={() => void saveCorporateBrandSettings()} disabled={brandSettingsBusy}>
            {brandSettingsBusy ? "Kaydediliyor..." : "Şirket standardını kaydet"}
          </Button>
        </div>
      </div>
    </Modal>
  </div>;

  // "Kartım", profil şirket tarafından yönetilse dahi kişisel bir düzenleme
  // yüzeyidir. Şirket kilitleri ve markası korunur; veri yüklendiğinde kişisel
  // editör kabuğu kurumsal kabukla değiştirilmez.
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
