"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { writeSessionCookie } from "../../components/AuthSessionBridge";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import { Icon } from "../../icons";
import { EmptyState, LoadingState } from "../../components/ui/States";
import type { SidebarNavItem } from "../../components/ui/SidebarNav";
import PanelSidebar from "../../components/ui/PanelSidebar";
import { YenomiProductVisual } from "../../ui/YenomiProductVisual";
import {
  ROLE_CAPABILITIES,
  ROLE_LABELS,
  ROLE_MATRIX_COLUMNS,
} from "../../../lib/organizations/role-matrix";
import CardTemplate, { type CardBranding } from "../../CardTemplate";
import { getSeatBreakdown, physicalCardLabel } from "../../../lib/organizations/lifecycle";
import { formatTryFromKurus } from "../../../lib/config/product";
import type { DatabaseSeatPack, DatabaseTemplateOption } from "../../../lib/config/database";
import { addCartItem, clearLegacyCart, setCartOwner } from "../../../lib/cart";
import {
  DEPARTMENT_OPTIONS,
  TITLE_OPTIONS,
  normalizeEmailField,
} from "../../../lib/form-standards";
import { parseBulkInviteCsv, BULK_INVITE_CSV_TEMPLATE, BULK_INVITE_MAX_ROWS } from "../../../lib/organizations/bulk-invite";
import JobTitlesPanel from "./components/JobTitlesPanel";
import CorporateLinksPanel from "./components/CorporateLinksPanel";
import TemplatesPanel from "./components/TemplatesPanel";
import CompanySettingsPanel from "./components/CompanySettingsPanel";
import RolesPanel from "./components/RolesPanel";
import EmployeesPanel from "./components/EmployeesPanel";
import EmployeeDrawer from "./components/EmployeeDrawer";
import CorporateHeroPreview from "./components/CorporateHeroPreview";
import type {
  BulkInvitePreview,
  BulkInviteResults,
  CardAnalytics,
  Member,
  MemberActionTarget,
  MemberCardStatus,
  Org,
  PhysicalCard,
  Template,
  ViewedMemberProfile,
} from "./domain/types";
import { normalizeLockFields } from "./domain/template-fields";
import {
  CORPORATE_PANEL_ROUTE_TO_TAB,
  isCorporatePanelTab,
  type CorporatePanelTab,
  CORPORATE_PANEL_TAB_META,
  corporateSidebarItems,
} from "./domain/navigation";
import { fetchWithPanelTimeout, waitForInitialPanelLoads } from "./domain/runtime";
import { useJobTitlesAndRequests } from "./hooks/useJobTitlesAndRequests";
import { useCorporateLinks } from "./hooks/useCorporateLinks";
import { getIdentityInitials } from "../../../lib/organizations/identity";
import { isOrganizationRole } from "../../../lib/organizations/permissions";

export default function CompanyPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selected, setSelected] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [message, setMessage] = useState("");
  const [seatPacks, setSeatPacks] = useState<DatabaseSeatPack[]>([]);
  const [templateOptions, setTemplateOptions] = useState<DatabaseTemplateOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const [loadingError, setLoadingError] = useState("");
  const [dataErrors, setDataErrors] = useState<Partial<Record<CorporatePanelTab, string>>>({});
  const setDataError = (tab: CorporatePanelTab, error: string | null) => {
    setDataErrors((current) => {
      const next = { ...current };
      if (error) next[tab] = error;
      else delete next[tab];
      return next;
    });
  };
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [busyMember, setBusyMember] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [template, setTemplate] = useState({
    name: "Kurumsal Standart",
    primaryColor: "#17121f",
    logoUrl: "",
  });
  const [orgNameDraft, setOrgNameDraft] = useState("");
  const [orgNameBusy, setOrgNameBusy] = useState(false);
  const [companyFields, setCompanyFields] = useState<
    Record<string, string | boolean>
  >({
    website: "",
    phone: "",
    address: "",
    privacyUrl: "",
    lockCompany: "locked",
    lockTitle: "locked",
    lockEmail: "suggested",
    lockPhone: "free",
    lockName: "suggested",
    templateVariant: "ESSENTIAL",
  });
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [bulkInvitePreview, setBulkInvitePreview] = useState<BulkInvitePreview | null>(null);
  const [bulkInviteBusy, setBulkInviteBusy] = useState(false);
  const [bulkInviteResults, setBulkInviteResults] = useState<BulkInviteResults | null>(null);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    title: "",
    department: "",
    role: "EMPLOYEE",
  });
  const [activeTab, setActiveTab] = useState<CorporatePanelTab>("overview");
  const routeTab = CORPORATE_PANEL_ROUTE_TO_TAB[pathname] || null;
  const currentTab: CorporatePanelTab = routeTab || activeTab;
  useEffect(() => {
    const routed = CORPORATE_PANEL_ROUTE_TO_TAB[pathname];
    const requested = searchParams.get("tab");
    const bulkInviteRequested = searchParams.get("bulkInvite") === "1";
    if (routed) setActiveTab(routed);
    else if (isCorporatePanelTab(requested)) {
      setActiveTab(requested);
    }
    setShowBulkInvite(routed === "employees" && bulkInviteRequested);
    window.sessionStorage.setItem("yenomi-active-portal", "business");
    fetch("/api/public-config?scope=corporate")
      .then(async (response) => {
        if (!response.ok) throw new Error("config unavailable");
        return response.json();
      })
      .then((data) => {
        setSeatPacks(data.seatPacks || []);
        setTemplateOptions(data.templateOptions || []);
      })
      .catch(() => setMessage("Lisans paketleri DB’den yüklenemedi."));
  }, [pathname, searchParams]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [physicalCards, setPhysicalCards] = useState<PhysicalCard[]>([]);
  const [cardAnalytics, setCardAnalytics] = useState<CardAnalytics | null>(
    null,
  );
  const [analyticsDays, setAnalyticsDays] = useState<7 | 30 | 90>(30);
  const [analyticsFrom, setAnalyticsFrom] = useState(() =>
    new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
  );
  const [analyticsTo, setAnalyticsTo] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [cardBusy, setCardBusy] = useState<string | null>(null);
  const [viewedProfile, setViewedProfile] = useState<ViewedMemberProfile | null>(null);
  const [viewLoading, setViewLoading] = useState<string | null>(null);
  const [openMemberMenuId, setOpenMemberMenuId] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [memberCardStatuses, setMemberCardStatuses] = useState<
    MemberCardStatus[]
  >([]);
  const [drawerMemberId, setDrawerMemberId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<
    "profile" | "card" | "invite" | "lifecycle"
  >("profile");
  const [memberEdit, setMemberEdit] = useState({
    firstName: "",
    lastName: "",
    email: "",
    title: "",
    department: "",
    role: "EMPLOYEE",
  });
  const [memberEditBusy, setMemberEditBusy] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  async function token() {
    const supabase = getSupabaseBrowserClient();
    const { data } = (await supabase?.auth.getSession()) ?? {
      data: { session: null },
    };
    if (data.session?.user?.id) setCurrentUserId(data.session.user.id);
    return data.session?.access_token || null;
  }

  const {
    jobTitles,
    newJobTitle,
    setNewJobTitle,
    jobTitleBusy,
    titleRequests,
    titleRequestBusyId,
    loadJobTitles,
    loadTitleRequests,
    addJobTitle,
    removeJobTitle,
    resolveTitleRequest,
  } = useJobTitlesAndRequests(selected, token, setMessage);

  const {
    corporateLinks,
    linkVersions,
    linkUrlDraft,
    setLinkUrlDraft,
    linkScheduleDraft,
    setLinkScheduleDraft,
    linkBusyKind,
    loadCorporateLinks,
    saveCorporateLinkUrl,
    uploadCorporateLinkFile,
    removeCorporateLink,
    toggleCorporateLinkPublication,
    rollbackCorporateLink,
  } = useCorporateLinks(selected, token, setMessage);

  async function loadMembers(id: string, access?: string) {
    const auth = access || (await token());
    if (!auth) return;
    const response = await fetchWithPanelTimeout(
      `/api/organizations/members?organizationId=${id}`,
      { headers: { authorization: `Bearer ${auth}` } },
    );
    const data = await response.json();
    if (response.ok) {
      setMembers(data.members || []);
      setDataError("employees", null);
    } else {
      const detail = data.error || "Çalışanlar yüklenemedi.";
      setDataError("employees", detail);
      setMessage("");
    }
  }

  async function loadTemplates(id: string, access?: string) {
    const auth = access || (await token());
    if (!auth) return;
    const response = await fetchWithPanelTimeout(
      `/api/organizations/templates?organizationId=${id}`,
      { headers: { authorization: `Bearer ${auth}` } },
    );
    const data = await response.json();
    if (response.ok) {
      setTemplates(data.templates || []);
      setDataError("templates", null);
      const current =
        data.templates?.find((item: Template) => item.is_default) ||
        data.templates?.[0];
      if (current) {
        setTemplate({
          name: current.name,
          primaryColor: current.primary_color || "#17121f",
          logoUrl: current.logo_url || "",
        });
        setCompanyFields((value) => ({ ...value, ...normalizeLockFields(current.fields || {}) }));
      }
    } else {
      setDataError("templates", data.error || "Kurumsal şablonlar yüklenemedi.");
    }
  }

  async function loadPhysicalCards(id: string, access?: string) {
    const auth = access || (await token());
    if (!auth) return;
    const response = await fetchWithPanelTimeout(
      `/api/organizations/physical-cards?organizationId=${id}`,
      { headers: { authorization: `Bearer ${auth}` } },
    );
    const data = await response.json();
    if (response.ok) {
      setPhysicalCards(data.cards || []);
      setDataError("cards", null);
    } else setDataError("cards", data.error || "Fiziksel kart verileri yüklenemedi.");
  }

  async function loadMemberCardStatuses(id: string, access?: string) {
    const auth = access || (await token());
    if (!auth) return;
    const response = await fetchWithPanelTimeout(
      `/api/organizations/member-card-statuses?organizationId=${id}`,
      { headers: { authorization: `Bearer ${auth}` } },
    );
    const data = await response.json();
    if (response.ok) {
      setMemberCardStatuses(data.statuses || []);
      setDataError("overview", null);
    } else setDataError("overview", data.error || "Kart durumları yüklenemedi.");
  }

  async function loadCardAnalytics(
    id: string,
    access?: string,
    days: 7 | 30 | 90 = analyticsDays,
    range?: { from: string; to: string },
  ) {
    const auth = access || (await token());
    if (!auth) return;
    const params = new URLSearchParams({ organizationId: id, days: String(days) });
    if (range) {
      params.set("from", range.from);
      params.set("to", range.to);
    }
    const response = await fetchWithPanelTimeout(
      `/api/organizations/card-analytics?${params.toString()}`,
      { headers: { authorization: `Bearer ${auth}` } },
    );
    const data = await response.json();
    if (response.ok) setCardAnalytics(data);
  }

  function exportAnalyticsCsv() {
    if (!cardAnalytics) return;
    const rows: Array<Array<string | number>> = [
      ["Kategori", "Ad", "Değer", "PDF Açma"],
      ...(cardAnalytics.byCard || []).map((item) => [
        "Kart",
        item.name,
        item.count,
        "",
      ]),
      ...(cardAnalytics.byDepartment || []).map((item) => [
        "Departman",
        item.department,
        item.count,
        "",
      ]),
      ...(cardAnalytics.byCountry || []).map((item) => [
        "Ülke",
        item.country,
        item.count,
        "",
      ]),
      ...(cardAnalytics.content?.byLink || []).map((item) => [
        "İçerik",
        item.label,
        item.count,
        item.downloads,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    const periodName = cardAnalytics.periodStart && cardAnalytics.periodEnd
      ? `${cardAnalytics.periodStart}_${cardAnalytics.periodEnd}`
      : `${analyticsDays}-gun`;
    anchor.download = `yenomi-kurumsal-analitik-${periodName}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function linkReplacementCard(oldCardId: string, newCardId: string) {
    const access = await token();
    if (!access || !selected) return;
    setCardBusy(oldCardId);
    setMessage("");
    try {
      const response = await fetch("/api/organizations/physical-cards", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({
          organizationId: selected,
          oldCardId,
          newCardId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Replacement kart bağlanamadı.");
        return;
      }
      setPhysicalCards((current) =>
        current.map((card) =>
          card.id === oldCardId
            ? { ...card, replacedByCardId: newCardId }
            : card,
        ),
      );
      setMessage("Eski kart yeni fiziksel kartla kalıcı olarak eşleştirildi.");
    } finally {
      setCardBusy(null);
    }
  }

  async function toggleCardStatus(
    cardId: string,
    status: "ACTIVE" | "DISABLED",
  ) {
    const access = await token();
    if (!access || !selected) return;
    setCardBusy(cardId);
    setMessage("");
    try {
      const response = await fetch("/api/organizations/physical-cards", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ organizationId: selected, cardId, status }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Kart durumu güncellenemedi.");
        return;
      }
      setPhysicalCards((current) =>
        current.map((card) =>
          card.id === cardId ? { ...card, status } : card,
        ),
      );
      setMessage(
        status === "DISABLED"
          ? "Kart devre dışı bırakıldı."
          : "Kart yeniden etkinleştirildi.",
      );
    } finally {
      setCardBusy(null);
    }
  }

  async function viewMemberProfile(member: MemberActionTarget) {
    const access = await token();
    if (!access || !selected) return;
    setViewLoading(member.id);
    setViewedProfile(null);
    setMessage("");
    try {
      const response = await fetch(
        `/api/organizations/member-profile?organizationId=${selected}&memberId=${member.id}`,
        { headers: { authorization: `Bearer ${access}` } },
      );
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Kart görüntülenemedi.");
        return;
      }
      setViewedProfile({
        memberId: member.id,
        memberName: member.full_name || member.email,
        memberStatus: member.status,
        profiles: data.profiles || [],
        physicalCards: data.physicalCards || [],
        identityChanges: data.identityChanges || [],
      });
    } finally {
      setViewLoading(null);
    }
  }

  const loadingLabel = CORPORATE_PANEL_TAB_META[currentTab].loadingLabel;

  async function reloadPanelData() {
    setLoading(true);
    setLoadingSlow(false);
    setLoadingError("");
    setDataErrors({});
    setMessage("");
    try {
      const access = await token();
      if (!access) {
        setMessage("Kurumsal panel için giriş yapmalısın.");
        return;
      }
      const response = await fetchWithPanelTimeout("/api/organizations/mine?management=true", {
        headers: { authorization: `Bearer ${access}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setLoadingError(data.error || "Şirket bilgileri yüklenemedi.");
        return;
      }
      const nextOrgs = data.organizations || [];
      setOrgs(nextOrgs);
      const id = nextOrgs[0]?.organization_id || "";
      setSelected(id);
      if (!id) {
        setLoading(false);
        return;
      }

      // Shell ve route içeriği organizasyon kimliği geldikten sonra hemen
      // kullanılabilir olmalı. Ağır veri blokları birbirinden bağımsız yüklenir;
      // tek bir members/templates isteği başarısız olduğunda bütün paneli
      // sonsuz loading ekranına çevirmeyiz.
      setLoading(false);
      const result = await waitForInitialPanelLoads([
        loadMembers(id, access),
        loadTemplates(id, access),
        loadPhysicalCards(id, access),
        loadCardAnalytics(id, access),
        loadMemberCardStatuses(id, access),
        loadJobTitles(id, access),
        loadTitleRequests(id, access),
        loadCorporateLinks(id, access),
      ]);
      if (result.timedOut) {
        setMessage("Bazı veriler henüz hazır değil. İlgili bölümden yeniden deneyebilirsin.");
      }
    } catch {
      setLoadingError("Kurumsal panel verileri şu anda yüklenemiyor. Bağlantıyı kontrol edip yeniden deneyin.");
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const access = await token();
        if (!access) {
          setMessage("Kurumsal panel için giriş yapmalısın.");
          return;
        }
        const response = await fetchWithPanelTimeout("/api/organizations/mine?management=true", {
          headers: { authorization: `Bearer ${access}` },
        });
        const data = await response.json();
        if (!response.ok) {
          // Yönetim paneli yalnız OWNER / ADMIN / HR içindir. Aktif kurumsal
          // çalışanı hata ekranında bırakmak yerine kendi kurumsal kart alanına
          // yönlendir; böylece /kurumsal/panel URL'si EMPLOYEE için fiilen
          // erişilebilir bir ekran gibi görünmez.
          if (response.status === 403) {
            // EMPLOYEE / non-manager roles may belong to an organization,
            // but they must never be routed into the profile editor from a
            // management-panel denial. Their canonical workspace is Kartım.
            router.replace("/kartim");
            return;
          }
          if (response.status === 401) {
            router.replace("/giris?portal=business&next=%2Fkurumsal%2Fpanel");
            return;
          }
          setLoadingError(data.error || "Şirket bilgileri yüklenemedi.");
          setMessage("");
          return;
        }
        const nextOrgs = data.organizations || [];
        setOrgs(nextOrgs);
        const id = nextOrgs[0]?.organization_id || "";
        setSelected(id);
        if (id && nextOrgs[0]?.role === "DEPARTMENT_MANAGER") {
          setActiveTab("employees");
          setForm((current) => ({
            ...current,
            department: nextOrgs[0]?.department || "",
            role: "EMPLOYEE",
          }));
          setLoading(false);
          const result = await waitForInitialPanelLoads([
            loadMembers(id, access),
            loadJobTitles(id, access),
            loadTitleRequests(id, access),
          ]);
          if (result.timedOut) setMessage("Bazı veriler henüz hazır değil. İlgili bölümden yeniden deneyebilirsin.");
        } else if (id) {
          // Organizasyon bulunduğu anda panel shell'i açılır. Her veri bloğu
          // kendi sonucunu gösterebilir; aggregate timeout yalnızca uyarıdır.
          setLoading(false);
          const result = await waitForInitialPanelLoads([
            loadMembers(id, access),
            loadTemplates(id, access),
            loadPhysicalCards(id, access),
            loadCardAnalytics(id, access),
            loadMemberCardStatuses(id, access),
            loadJobTitles(id, access),
            loadTitleRequests(id, access),
            loadCorporateLinks(id, access),
          ]);
          if (result.timedOut) setMessage("Bazı veriler henüz hazır değil. İlgili bölümden yeniden deneyebilirsin.");
        } else {
          setLoading(false);
        }
      } catch {
        setLoadingError("Kurumsal panel verileri yüklenemedi. Bağlantıyı kontrol edip yeniden deneyin.");
        setMessage("");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loading) { setLoadingSlow(false); return; }
    const timer = window.setTimeout(() => setLoadingSlow(true), 3000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileNavOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNavOpen]);

  async function add(event: FormEvent) {
    event.preventDefault();
    const access = await token();
    if (!access || !selected) return;
    setMessage("");
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
    const response = await fetch("/api/organizations/members", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({
        organizationId: selected,
        email: form.email,
        fullName,
        title: form.title,
        department: form.department,
        role: form.role,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Çalışan eklenemedi.");
      return;
    }
    setMembers((current) => [...current, data.member]);
    setForm({
      email: "",
      firstName: "",
      lastName: "",
      title: "",
      department: "",
      role: "EMPLOYEE",
    });
    setMessage(
      data.emailSent === false
        ? "Davet kaydedildi ancak e-posta gönderilemedi. Yeniden gönder butonunu kullanabilirsin."
        : "Çalışan daveti gönderildi.",
    );
  }

  async function handleBulkInviteFile(file: File) {
    const text = await file.text();
    const parsed = parseBulkInviteCsv(text);
    setBulkInvitePreview({
      fileName: file.name,
      rows: parsed.rows,
      errors: parsed.errors.map((item) => ({ line: item.line, error: item.error })),
    });
    setBulkInviteResults(null);
  }

  async function submitBulkInvite() {
    if (!selected || !bulkInvitePreview || bulkInvitePreview.rows.length === 0) return;
    const access = await token();
    if (!access) return;
    setBulkInviteBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/organizations/members/bulk-invite", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${access}` },
        body: JSON.stringify({
          organizationId: selected,
          rows: bulkInvitePreview.rows.slice(0, BULK_INVITE_MAX_ROWS).map((row) => ({
            email: row.email,
            fullName: row.fullName,
            title: row.title,
            department: row.department,
            role: row.role,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Toplu davet işlenemedi.");
        return;
      }
      setBulkInviteResults(data);
      if (data.created > 0) await loadMembers(selected, access || undefined);
      setMessage(`Toplu davet tamamlandı: ${data.created} başarılı, ${data.failed} başarısız.`);
    } finally {
      setBulkInviteBusy(false);
    }
  }

  function openBulkInvite() {
    setActiveTab("employees");
    setShowBulkInvite(true);
    setBulkInvitePreview(null);
    setBulkInviteResults(null);
    setMobileNavOpen(false);
    router.push(`${tabRoutes.employees}?bulkInvite=1`);
  }

  function closeBulkInvite() {
    setShowBulkInvite(false);
    setBulkInvitePreview(null);
    setBulkInviteResults(null);
    if (pathname === tabRoutes.employees && searchParams.get("bulkInvite") === "1") {
      router.replace(tabRoutes.employees);
    }
  }

  async function saveTemplate(event: FormEvent) {
    event.preventDefault();
    const access = await token();
    if (!access || !selected) return;
    const existingDefault = templates.find((item) => item.is_default);
    // Aktif/varsayılan şablon zaten kayıtlıysa YERİNDE güncelle (PATCH) —
    // her kaydetmede yeni satır biriktirmemek için. Hiç şablon yoksa (ilk
    // kurulum) POST ile oluşturup anında varsayılan yap.
    const response = existingDefault
      ? await fetch("/api/organizations/templates", {
          method: "PATCH",
          headers: { "content-type": "application/json", authorization: `Bearer ${access}` },
          body: JSON.stringify({ templateId: existingDefault.id, ...template, fields: companyFields }),
        })
      : await fetch("/api/organizations/templates", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${access}` },
          body: JSON.stringify({ organizationId: selected, ...template, fields: companyFields, isDefault: true }),
        });
    const data = await response.json();
    if (response.ok) {
      setTemplates((current) => {
        const next = current.filter((item) => item.id !== data.template.id);
        return [data.template, ...next].sort((a, b) => Number(b.is_default) - Number(a.is_default));
      });
      setMessage("Varsayılan kurumsal şablon güncellendi.");
    } else setMessage(data.error || "Şablon kaydedilemedi.");
  }

  async function mutateMember(
    memberId: string,
    path: string,
    method: string,
    body: Record<string, unknown>,
  ) {
    const access = await token();
    if (!access) return null;
    setBusyMember(memberId);
    setMessage("");
    try {
      const response = await fetch(path, {
        method,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ organizationId: selected, memberId, ...body }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "İşlem tamamlanamadı.");
        return null;
      }
      if (data.warning) setMessage(data.warning);
      return data;
    } finally {
      setBusyMember(null);
    }
  }

  async function changeStatus(memberId: string, status: Member["status"]) {
    const result = await mutateMember(
      memberId,
      "/api/organizations/members",
      "PATCH",
      { status, reason: "Kurumsal panel işlemi" },
    );
    if (result) {
      setMembers((current) =>
        current.map((member) =>
          member.id === memberId ? { ...member, status } : member,
        ),
      );
      setMessage("Çalışan durumu güncellendi.");
    }
  }

  async function changeMembersStatus(memberIds: string[], status: "ACTIVE" | "SUSPENDED" | "LEFT") {
    const access = await token();
    if (!access || !selected || !memberIds.length) return;
    setMessage("");
    const successful: string[] = [];
    const failures: string[] = [];
    for (const memberId of memberIds) {
      try {
        const response = await fetch("/api/organizations/members", {
          method: "PATCH",
          headers: { "content-type": "application/json", authorization: `Bearer ${access}` },
          body: JSON.stringify({ organizationId: selected, memberId, status, reason: "Kurumsal panel toplu işlemi" }),
        });
        if (response.ok) successful.push(memberId);
        else failures.push(memberId);
      } catch {
        failures.push(memberId);
      }
    }
    if (successful.length) {
      setMembers((current) => current.map((member) => successful.includes(member.id) ? { ...member, status } : member));
    }
    if (failures.length) setMessage(`${successful.length} çalışan güncellendi; ${failures.length} çalışan için işlem tamamlanamadı.`);
    else setMessage(`${successful.length} çalışanın durumu güncellendi.`);
  }

  async function changeRole(memberId: string, role: string) {
    const result = await mutateMember(
      memberId,
      "/api/organizations/members",
      "PUT",
      { role, reason: "Kurumsal panel rol değişikliği" },
    );
    if (result) {
      setMembers((current) =>
        current.map((member) =>
          member.id === memberId ? { ...member, role } : member,
        ),
      );
      setMessage("Çalışan rolü güncellendi.");
    }
  }

  async function inviteAction(memberId: string, action: "RESEND" | "REVOKE") {
    const result = await mutateMember(
      memberId,
      "/api/organizations/invites",
      "POST",
      {
        action,
        reason: action === "REVOKE" ? "Kurumsal panelden iptal" : undefined,
      },
    );
    if (!result) return;
    if (action === "REVOKE")
      setMembers((current) =>
        current.map((member) =>
          member.id === memberId ? { ...member, status: "LEFT" } : member,
        ),
      );
    setMessage(
      action === "RESEND"
        ? result.emailSent === false
          ? result.warning
          : "Davet yeniden gönderildi."
        : "Davet iptal edildi ve lisans serbest bırakıldı.",
    );
  }

  const org = orgs.find((item) => item.organization_id === selected);
  const subscription = org?.organization_subscriptions?.[0];
  useEffect(() => {
    setOrgNameDraft(org?.organizations?.name || "");
  }, [org?.organizations?.name]);

  async function renameOrganization() {
    const name = orgNameDraft.trim();
    if (!selected || name.length < 2 || name === org?.organizations?.name) return;
    setOrgNameBusy(true);
    const access = await token();
    const response = await fetch("/api/organizations/rename", {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: `Bearer ${access}` },
      body: JSON.stringify({ organizationId: selected, name }),
    });
    const data = await response.json();
    if (response.ok) {
      setOrgs((current) =>
        current.map((item) =>
          item.organization_id === selected && item.organizations
            ? { ...item, organizations: { ...item.organizations, name: data.organization.name } }
            : item,
        ),
      );
      setMessage("Şirket adı güncellendi.");
    } else setMessage(data.error || "Şirket adı güncellenemedi.");
    setOrgNameBusy(false);
  }
  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "ACTIVE").length,
    [members],
  );
  const digitalCardsReady = useMemo(
    () =>
      memberCardStatuses.filter((item) => item.hasDigitalCard && item.published)
        .length,
    [memberCardStatuses],
  );
  const invitedMembers = useMemo(
    () => members.filter((member) => member.status === "INVITED").length,
    [members],
  );
  const seatBreakdown = useMemo(() => getSeatBreakdown(members), [members]);
  const usedSeats = seatBreakdown.used;
  const availableSeats =
    subscription?.seat_limit == null
      ? null
      : Math.max(0, subscription.seat_limit - usedSeats);
  const canInvite = availableSeats == null || availableSeats > 0;
  const cardStatusCounts = useMemo(
    () =>
      physicalCards.reduce(
        (acc, card) => {
          acc[card.status] = (acc[card.status] || 0) + 1;
          return acc;
        },
        {} as Record<PhysicalCard["status"], number>,
      ),
    [physicalCards],
  );
  const distributionGradient = (
    entries: ReadonlyArray<readonly [string, number, ...unknown[]]>,
    total: number,
  ) => {
    const colors = ["#8b5cf6", "#4e9df5", "#42c99a", "#f59e42", "#ec4899"];
    if (!entries.length || total <= 0) return "conic-gradient(#242034 0 100%)";
    let cursor = 0;
    const stops = entries.map(([, count], index) => {
      const start = cursor;
      cursor += (count / total) * 100;
      return `${colors[index % colors.length]} ${start}% ${cursor}%`;
    });
    if (cursor < 100) stops.push(`#242034 ${cursor}% 100%`);
    return `conic-gradient(${stops.join(",")})`;
  };
  const filteredMembers = useMemo(
    () =>
      members.filter((member) => {
        const term = search.trim().toLocaleLowerCase("tr");
        const matchesText =
          !term ||
          [
            member.full_name,
            member.email,
            member.title,
            member.department,
          ].some((value) => value?.toLocaleLowerCase("tr").includes(term));
        const matchesDepartment =
          departmentFilter === "ALL" ||
          (member.department?.trim() || "Belirtilmemiş") === departmentFilter;
        return (
          matchesText &&
          matchesDepartment &&
          (statusFilter === "ALL" || member.status === statusFilter)
        );
      }),
    [members, search, statusFilter, departmentFilter],
  );
  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          members.map((member) => member.department?.trim() || "Belirtilmemiş"),
        ),
      ).sort(),
    [members],
  );
  const roleLabel = (role: string) =>
    ({
      OWNER: "Yönetim",
      ADMIN: "Yönetim",
      HR: "İnsan Kaynakları",
      HR_MANAGER: "İnsan Kaynakları",
      DEPARTMENT_MANAGER: "Departman Yöneticisi",
      EMPLOYEE: "Çalışan",
    })[role] || role;
  const initials = (member: MemberActionTarget) => getIdentityInitials(member.full_name || member.email);
  const relativeTime = (value: string) => {
    const diff = Math.max(0, Date.now() - new Date(value).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins <= 1 ? "Az önce" : `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    return days === 1 ? "1 gün önce" : `${days} gün önce`;
  };
  const splitName = (value: string | null | undefined) => {
    const parts = (value || "").trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
  };
  const drawerMember =
    members.find((member) => member.id === drawerMemberId) || null;

  // Profile sekmesi drawer açılışından bağımsız olarak her zaman seçili
  // çalışanın güncel kimlik verisiyle hydrate edilir. Böylece Davet/Kart gibi
  // başka sekmelerden Profil'e geçildiğinde eski veya boş draft state'i
  // gösterilmez. Kullanıcı yazmaya başladıktan sonra draft'ı ezmemek için
  // yalnızca drawer üyesi değiştiğinde çalışır.
  useEffect(() => {
    if (!drawerMember) return;
    const name = splitName(drawerMember.full_name);
    setMemberEdit({
      firstName: name.firstName,
      lastName: name.lastName,
      email: drawerMember.email,
      title: drawerMember.title || "",
      department: drawerMember.department || "",
      role: drawerMember.role,
    });
  }, [drawerMember?.id]);

  function openMemberDrawer(
    member: MemberActionTarget,
    tab: "profile" | "card" | "invite" | "lifecycle" = "profile",
  ) {
    const name = splitName(member.full_name);
    setDrawerMemberId(member.id);
    setDrawerTab(tab);
    setMemberEdit({
      firstName: name.firstName,
      lastName: name.lastName,
      email: member.email,
      title: member.title || "",
      department: member.department || "",
      role: member.role,
    });
    setOpenMemberMenuId(null);
    if (tab === "card" || tab === "lifecycle") void viewMemberProfile(member);
  }

  async function saveMemberIdentity(event: FormEvent) {
    event.preventDefault();
    if (!drawerMember || !selected) return;
    const access = await token();
    if (!access) return;
    setMemberEditBusy(true);
    setMessage("");
    try {
      const fullName =
        `${memberEdit.firstName.trim()} ${memberEdit.lastName.trim()}`.trim();
      const response = await fetch("/api/organizations/members", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({
          action: "IDENTITY",
          organizationId: selected,
          memberId: drawerMember.id,
          fullName,
          email: memberEdit.email,
          title: memberEdit.title,
          department: memberEdit.department,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Çalışan bilgileri güncellenemedi.");
        return;
      }
      setMembers((current) =>
        current.map((member) =>
          member.id === drawerMember.id
            ? { ...member, ...data.member }
            : member,
        ),
      );
      setMessage(
        data.inviteRenewed
          ? data.emailSent === false
            ? "Bilgiler güncellendi. Yeni davet oluşturuldu ancak e-posta gönderilemedi."
            : "Bilgiler güncellendi ve yeni e-posta adresine davet gönderildi."
          : "Çalışan bilgileri güncellendi.",
      );
    } finally {
      setMemberEditBusy(false);
    }
  }

  function buySeatPack(pack: DatabaseSeatPack) {
    if (!selected || !canManageLicenses) return;
    addCartItem({
      productId: "yenomi-business-seat-pack",
      variantSku: pack.sku,
      kind: "NFC_PHYSICAL_CARD",
      name: pack.name,
      unitPriceKurus: pack.priceKurus,
      quantity: 1,
      configuration: { organizationId: selected, seatCount: pack.seats },
    });
    router.push("/sepet");
  }

  const departmentManager = org?.role === "DEPARTMENT_MANAGER";
  const canManageLicenses = org?.role === "OWNER" || org?.role === "ADMIN";
  const allTabs: ReadonlyArray<readonly [CorporatePanelTab, string]> = [
        ["overview", "Genel Bakış"],
        ["employees", "Çalışanlar"],
        ["cards", "Kartlar"],
        ["templates", "Marka & Şablon"],
        ["content", "İçerik"],
        ["analytics", "İstatistikler"],
        ["licenses", "Lisanslar"],
        ["organization", "Organizasyon"],
        ["roles", "Roller & Yetkiler"],
        ["settings", "Ayarlar"],
      ];
  const tabs: ReadonlyArray<readonly [CorporatePanelTab, string]> = org
    ? corporateSidebarItems(org.role).map(({ key, label }) => [key, label] as const)
    : [];
  const sidebarPermissionsLoading = !org && loading;
  const tabRoutes: Record<CorporatePanelTab, string> = {
    overview: "/kurumsal/panel",
    employees: "/kurumsal/panel/calisanlar",
    cards: "/kurumsal/panel/kartlar",
    roles: "/kurumsal/panel/roller",
    templates: "/kurumsal/panel/sablon",
    content: "/kurumsal/panel/icerik",
    analytics: "/kurumsal/panel/istatistikler",
    licenses: "/kurumsal/panel/lisans",
    organization: "/kurumsal/panel/organizasyon",
    settings: "/kurumsal/panel/ayarlar",
  };
  const tabMeta: Record<CorporatePanelTab, { title: string; description: string; icon: Parameters<typeof Icon>[0]["name"] }> = {
    overview: { title: "Genel Bakış", description: "Şirket sağlığını, lisansları ve kart operasyonlarını tek ekrandan izle.", icon: "building" },
    employees: { title: "Çalışanlar", description: "Ekibini yönet, davetleri ve çalışan yaşam döngüsünü takip et.", icon: "users" },
    cards: { title: "Kartlar", description: "Fiziksel ve dijital kart durumlarını tek yerde yönet.", icon: "contact" },
    roles: { title: "Roller & Yetkiler", description: "Kurumsal yetki sınırlarını ve rol dağılımını kontrol et.", icon: "lock" },
    templates: { title: "Marka & Şablon", description: "Kurumsal kart görünümünü ve marka standartlarını merkezi olarak yönet.", icon: "contact" },
    content: { title: "İçerik", description: "Merkezi bağlantıları ve kurumsal dosyaları çalışan kartlarına dağıt.", icon: "link" },
    analytics: { title: "İstatistikler", description: "Kart görüntülenmelerini ve içerik etkileşimlerini gerçek verilerle izle.", icon: "analytics" },
    licenses: { title: "Lisanslar", description: "Toplam, kullanılan ve boş lisansları; ek kullanıcı paketleriyle birlikte yönet.", icon: "analytics" },
    organization: { title: "Organizasyon", description: "Şirket kimliği, alan politikaları ve ünvan standardını yönet.", icon: "building" },
    settings: { title: "Ayarlar", description: "Sık değişmeyen kurumsal yönetim alanlarına ulaş.", icon: "pencil" },
  };
  const openTab = (tab: CorporatePanelTab) => {
    if (tab === "licenses" && !canManageLicenses) {
      const fallback = departmentManager ? "employees" : "overview";
      setActiveTab(fallback);
      setMobileNavOpen(false);
      router.replace(tabRoutes[fallback]);
      return;
    }
    setActiveTab(tab);
    setMobileNavOpen(false);
    router.push(tabRoutes[tab]);
  };
  const goToLicenses = () => openTab("licenses");

  useEffect(() => {
    if (!org || activeTab !== "licenses" || canManageLicenses) return;
    const fallback = departmentManager ? "employees" : "overview";
    setActiveTab(fallback);
    router.replace(tabRoutes[fallback]);
  }, [activeTab, canManageLicenses, departmentManager, org, router]);
  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    writeSessionCookie(null);
    clearLegacyCart();
    setCartOwner(null, { claimGuest: false });
    router.replace("/giris?portal=business");
  };
  const sidebarUser =
    members.find((member) => member.user_id === currentUserId) ||
    members.find((member) => member.role === "OWNER" && member.status === "ACTIVE") ||
    members.find((member) => member.status === "ACTIVE") ||
    members[0];
  const sidebarCardProfile = memberCardStatuses.find(
    (item) => item.memberId === sidebarUser?.id,
  );
  const ownCardEditorHref = selected
    ? `/kurumsal/panel/kartim?business=1&organizationId=${encodeURIComponent(selected)}${sidebarCardProfile?.profileId ? `&id=${encodeURIComponent(sidebarCardProfile.profileId)}` : "&new=1"}`
    : "/kurumsal/panel/calisanlar";
  const templatePreviewMember =
    members.find((member) => member.status === "ACTIVE") || members[0];
  const templatePreviewBranding: CardBranding = {
    logoUrl: template.logoUrl || null,
    primaryColor: template.primaryColor || null,
    companyName: org?.organizations?.name || "Şirketiniz",
    variant: ([
      "ESSENTIAL",
      "PROFESSIONAL",
      "EXECUTIVE",
      "CLASSIC",
      "MINIMAL",
    ].includes(String(companyFields.templateVariant))
      ? String(companyFields.templateVariant) === "CLASSIC"
        ? "ESSENTIAL"
        : String(companyFields.templateVariant) === "MINIMAL"
          ? "PROFESSIONAL"
          : String(companyFields.templateVariant)
      : "ESSENTIAL") as CardBranding["variant"],
  };
  const templatePreviewData = {
    name: templatePreviewMember?.full_name || "Ayşe Yılmaz",
    role: templatePreviewMember?.title || "Satış Yöneticisi",
    company: org?.organizations?.name || "Şirketiniz",
    phone: String(companyFields.phone || "+90 555 123 45 67"),
    whatsapp: String(companyFields.phone || "+90 555 123 45 67"),
    email: templatePreviewMember?.email || "ayse@firma.com",
    website: String(companyFields.website || "www.firma.com"),
    linkedin: "linkedin.com/in/ayseyilmaz",
    instagram: "",
    location: String(companyFields.address || "İzmir, Türkiye"),
    image: "",
    links: corporateLinks
      .filter((link) => link.configured && Boolean(link.fileUrl || link.url))
      .map((link) => ({
        title: link.label,
        subtitle: link.subtitle,
        href: link.fileUrl || link.url || "#",
        kind: "external" as const,
      })),
  };

  return (
    <main id="main-content" className="business-console business-console--compact p10-corporate-platform" data-ui-context="dashboard">
      <div className="enterprise-dashboard-shell">
        <PanelSidebar
          ariaLabel="Kurumsal yönetim menüsü"
          subtitle="Kurumsal Panel"
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          onBrandClick={() => { const next = departmentManager ? "employees" : "overview"; setActiveTab(next); router.push(tabRoutes[next]); }}
          activeKey={currentTab}
          onNavigate={(key) => setActiveTab(key as CorporatePanelTab)}
          loading={sidebarPermissionsLoading}
          storageKey="yenomi:corporate-sidebar:collapsed"
          items={tabs.map<SidebarNavItem>(([key, label]) => ({
              key,
              label,
              href: tabRoutes[key],
              icon: tabMeta[key].icon as SidebarNavItem["icon"],
              group: CORPORATE_PANEL_TAB_META[key].group,
          }))}
        >
          <div className="enterprise-side-links enterprise-side-primary-links">
            <span className="enterprise-side-section-title">KİŞİSEL</span>
            <button type="button" onClick={() => router.push(ownCardEditorHref)}>
              <Icon name="contact" />
              <span>Kartım</span>
            </button>
          </div>
          <div className="enterprise-side-links enterprise-side-management">
            <button type="button" onClick={signOut}>
              <Icon name="logout" />
              <span>Çıkış Yap</span>
            </button>
          </div>
          <div className="enterprise-side-plan">
            <small>
              {subscription?.business_plans?.name || "Business Plan"}
            </small>
            <strong>
              {loading ? "—" : usedSeats} / {subscription?.seat_limit ?? "—"} lisans kullanılıyor
            </strong>
            <div className="enterprise-plan-meter">
              <span
                style={{
                  width: `${subscription?.seat_limit ? Math.min(100, Math.round((usedSeats / subscription.seat_limit) * 100)) : 0}%`,
                }}
              />
            </div>
            {canManageLicenses && <button type="button" onClick={() => openTab("licenses")}>
              Lisansları Yönet
            </button>}
          </div>
          <div className="enterprise-side-user">
            <span>{(sidebarUser?.full_name || sidebarUser?.email || "Y").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{sidebarUser?.full_name || sidebarUser?.email || "Yönetici"}</strong>
              <small>{sidebarUser?.role === "OWNER" ? "Yönetici" : roleLabel(sidebarUser?.role || "EMPLOYEE")}</small>
            </div>
            <b aria-hidden><Icon name="chevronDown" /></b>
          </div>
        </PanelSidebar>
        <section className="enterprise-dashboard-main">
          <div className="enterprise-mobile-commandbar">
            <button type="button" className="enterprise-mobile-menu-button" aria-label={mobileNavOpen ? "Menüyü kapat" : "Menüyü aç"} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((value) => !value)}>
              <Icon name={mobileNavOpen ? "close" : "menu"} />
              <span>Menü</span>
            </button>
            <div className="enterprise-mobile-current">
              <small>Yenomi ID · Kurumsal</small>
              <strong>{tabMeta[currentTab].title}</strong>
            </div>
            <button type="button" className="enterprise-mobile-account-button" aria-label="Hesap ve lisans bilgileri" onClick={() => setMobileNavOpen(true)}>
              <span>{(sidebarUser?.full_name || sidebarUser?.email || "Y").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
            </button>
          </div>
              <header className="enterprise-topbar">
            <div>
              <h1>{tabMeta[currentTab].title}</h1>
              <p>{tabMeta[currentTab].description}</p>
            </div>
            <div className="enterprise-topbar-actions">
              {canManageLicenses && <button
                type="button"
                className="enterprise-quick-link"
                onClick={goToLicenses}
              >
                Lisans Ekle
              </button>}
              <div className="enterprise-topbar-account">
                <span className="enterprise-org-icon">
                  <Icon name="mail" />
                </span>
                <div>
                  {orgs.length > 1 ? (
                    <select
                      aria-label="Aktif şirket"
                      value={selected}
                      onChange={(event) => {
                        const id = event.target.value;
                        setSelected(id);
                        setViewedProfile(null);
                        setMembers([]);
                        setTemplates([]);
                        setPhysicalCards([]);
                        setMemberCardStatuses([]);
                        setCardAnalytics(null);
                        setLoading(true);
                        setLoadingSlow(false);
                        setLoadingError("");
                        setDataErrors({});
                        void (async () => {
                          try {
                            const access = await token();
                            if (!access) return;
                            const result = await waitForInitialPanelLoads([
                              loadMembers(id, access),
                              loadTemplates(id, access),
                              loadPhysicalCards(id, access),
                              loadCardAnalytics(id, access),
                              loadMemberCardStatuses(id, access),
                              loadJobTitles(id, access),
                              loadTitleRequests(id, access),
                              loadCorporateLinks(id, access),
                            ]);
                            if (result.timedOut) {
                              setMessage("Bazı veriler henüz hazır değil. İlgili bölümden yeniden deneyebilirsin.");
                            }
                          } finally {
                            setLoading(false);
                          }
                        })();
                      }}
                    >
                      {orgs.map((item) => (
                        <option
                          key={item.organization_id}
                          value={item.organization_id}
                        >
                          {item.organizations?.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <strong>{org?.organizations?.name || "Şirket"}</strong>
                  )}
                  <small>
                    {subscription?.business_plans?.name || "Business"} ·{" "}
                    {loading ? "—" : usedSeats} / {subscription?.seat_limit ?? "—"} lisans
                  </small>
                </div>
              </div>
            </div>
          </header>
          <section className="business-shell">
            {loading ? (
              <div className="enterprise-loading-shell" aria-live="polite">
                <LoadingState label={loadingLabel} />
                {loadingSlow ? <div className="enterprise-loading-slow"><strong>Bu işlem beklenenden uzun sürüyor.</strong><p>Panel sonsuz yüklemede kalmaz; yanıt vermeyen istekler zaman aşımına uğrar ve panel kullanılabilir hale gelir.</p><button type="button" onClick={() => void reloadPanelData()}>Yeniden Dene</button></div> : null}
              </div>
            ) : !orgs.length ? (
              <EmptyState
                icon="building"
                title={message || "Hesabına bağlı aktif şirket bulunmuyor."}
                description="Kurumsal bir hesaba davet edildiysen, davet e-postasındaki bağlantıyı kullanarak katılabilirsin."
              />
            ) : (
              <>
                {(() => {
                  const scopedDataError = dataErrors[currentTab];
                  const overviewMemberError = currentTab === "overview" ? dataErrors.employees : null;
                  const visibleError = scopedDataError || overviewMemberError;
                  if (!visibleError) return null;
                  return (
                    <div className="enterprise-data-error" role="alert" aria-live="assertive">
                      <strong>Kurumsal veriler yüklenemedi.</strong>
                      <p>{visibleError}</p>
                      <button type="button" onClick={() => void reloadPanelData()}>Yeniden Dene</button>
                    </div>
                  );
                })()}
                {currentTab === "overview" && (
                  <>
                <header className="business-hero">
                  <div>
                    <span>YENOMI BUSINESS</span>
                    <h2>Genel Bakış</h2>
                    <p>
                      Şirketindeki çalışanları davet et, rollerini yönet ve
                      kurumsal kimlik erişimlerini kontrol et.
                    </p>
                  </div>
                  <div className="business-hero-art" aria-hidden="true">
                    <span className="yi-icon-badge yi-icon-badge--lg"><Icon name="users" variant="solid" /></span>
                  </div>
                </header>
                <div className="business-company-picker">
                  <label>
                    Şirket
                    <select
                      value={selected}
                      onChange={(event) => {
                        const id = event.target.value;
                        setSelected(id);
                        setViewedProfile(null);
                        setMembers([]);
                        setTemplates([]);
                        setPhysicalCards([]);
                        setMemberCardStatuses([]);
                        setCardAnalytics(null);
                        setLoading(true);
                        void (async () => {
                          try {
                            const access = await token();
                            if (!access) return;
                            const result = await waitForInitialPanelLoads([
                              loadMembers(id, access),
                              loadTemplates(id, access),
                              loadPhysicalCards(id, access),
                              loadCardAnalytics(id, access),
                              loadMemberCardStatuses(id, access),
                              loadJobTitles(id, access),
                              loadTitleRequests(id, access),
                              loadCorporateLinks(id, access),
                            ]);
                            if (result.timedOut) {
                              setMessage("Bazı veriler henüz hazır değil. İlgili bölümden yeniden deneyebilirsin.");
                            }
                          } finally {
                            setLoading(false);
                          }
                        })();
                      }}
                    >
                      {orgs.map((item) => (
                        <option
                          key={item.organization_id}
                          value={item.organization_id}
                        >
                          {item.organizations?.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="business-account-strip">
                  <div>
                    <small>Aktif kurumsal hesap</small>
                    <strong>{org?.organizations?.name || "—"}</strong>
                    <span>
                      {org?.role === "OWNER"
                        ? "Şirket Sahibi"
                        : org?.role === "ADMIN"
                          ? "Yönetici"
                          : org?.role === "HR"
                            ? "İnsan Kaynakları"
                            : org?.role || "—"}
                    </span>
                  </div>
                  <div>
                    <small>Paket / lisans</small>
                    <strong>{subscription?.business_plans?.name ?? "—"}</strong>
                    <span>
                      {loading ? "—" : usedSeats} / {subscription?.seat_limit ?? "—"} lisans
                      kullanılıyor
                    </span>
                  </div>
                </div>
                <div className="business-kpis">
                  <article className="purple">
                    <i>
                      <Icon name="users" />
                    </i>
                    <div>
                      <small>Aktif Çalışan</small>
                      <b>{activeMembers}</b>
                      <span>Şu anda şirkete aktif bağlı</span>
                    </div>
                  </article>
                  <article className="amber">
                    <i>
                      <Icon name="mail" />
                    </i>
                    <div>
                      <small>Bekleyen Davet</small>
                      <b>{invitedMembers}</b>
                      <span>Henüz kabul edilmemiş davet</span>
                    </div>
                  </article>
                  <article className="green">
                    <i>
                      <Icon name="users" />
                    </i>
                    <div>
                      <small>Lisans Kullanımı</small>
                      <b>
                        {usedSeats} / {subscription?.seat_limit ?? "—"}
                      </b>
                      <span>
                        {availableSeats == null
                          ? "Limit bilgisi yok"
                          : `${availableSeats} lisans boş`}
                      </span>
                    </div>
                  </article>
                  <article className="blue">
                    <i>
                      <Icon name="analytics" />
                    </i>
                    <div>
                      <small>Kart Görüntülenmesi</small>
                      <b>
                        {cardAnalytics?.available === false
                          ? "—"
                          : (cardAnalytics?.last30DaysViews ?? 0)}
                      </b>
                      <span>
                        {cardAnalytics?.available === false
                          ? "Analitik geçici olarak kullanılamıyor"
                          : `Son 30 gün · toplam ${cardAnalytics?.totalViews ?? 0}`}
                      </span>
                    </div>
                  </article>
                </div>
                </>
                )}
                {currentTab === "licenses" && canManageLicenses && (
                  <section
                    className={`business-seat-packs${availableSeats === 0 ? " is-urgent" : ""}`}
                    aria-labelledby="seat-pack-title"
                  >
                    <div className="license-reference-hero" aria-label="Yenomi Business kapasite avantajları">
                      <div>
                        <span>{availableSeats === 0 ? "KAPASİTE DOLDU" : "KAPASİTEYİ BÜYÜT"}</span>
                        <h2 id="seat-pack-title">Ekibiniz büyüdükçe Yenomi sizinle büyür.</h2>
                        <p>Her paket kişiye özel NFC + QR kartı, merkezi yönetimi ve mevcut abonelik döneminiz boyunca ek çalışan kapasitesini birlikte sunar.</p>
                        {availableSeats === 0 && <b className="license-reference-alert"><Icon name="contact" /> Yeni çalışan için ek lisans gerekli</b>}
                      </div>
                      <div className="license-reference-art" aria-hidden="true">
                        <div className="license-reference-product-glow" />
                        <YenomiProductVisual variant="card" compact />
                        <span><i /> NFC + QR hazır</span>
                      </div>
                      <div className="license-reference-proofs">
                        <span><Icon name="shield" /><b>Güvenli Erişim</b><small>Rol ve şirket kontrolü</small></span>
                        <span><Icon name="contact" /><b>Kolay Dağıtım</b><small>Kart başına tekil kimlik</small></span>
                        <span><Icon name="analytics" /><b>Tam Entegrasyon</b><small>Panel ve raporlarla uyumlu</small></span>
                      </div>
                    </div>
                    <div className="business-seat-pack-grid">
                      {seatPacks.map((pack) => (
                        <article
                          key={pack.sku}
                          className={pack.seats === 5 ? "recommended" : ""}
                        >
                          {pack.seats === 5 && <em>En çok tercih edilen</em>}
                          <div className="seat-pack-count">
                            <strong>+{pack.seats}</strong>
                            <span>kullanıcı</span>
                          </div>
                          <h3>
                            {pack.seats} lisans + {pack.seats} kart
                          </h3>
                          <ul>
                            <li>
                              <Icon name="check" /> Mevcut abonelik dönemi sonuna kadar
                            </li>
                            <li>
                              <Icon name="check" /> NFC + kişisel QR
                            </li>
                            <li>
                              <Icon name="check" /> Kargo dahil
                            </li>
                          </ul>
                          <div className="seat-pack-price">
                            <strong>
                              {formatTryFromKurus(pack.priceKurus)}
                            </strong>
                            <small>KDV dahil</small>
                          </div>
                          <button
                            type="button"
                            className="ds-button ds-button--accent ds-button--sm"
                            onClick={() => buySeatPack(pack)}
                          >
                            Paketi Seç <span>→</span>
                          </button>
                        </article>
                      ))}
                    </div>
                    <small className="business-seat-note">
                      Ek limit mevcut aktif kurumsal aboneliğin bitiş tarihine kadar tanımlanır; satın alma abonelik süresini uzatmaz.
                      Fiziksel kart aktive edildikten sonra başka çalışana
                      devredilemez.
                    </small>
                    <div className="license-reference-features">
                      <span><Icon name="shield" /><b>Güvenli ve Kişiye Özel</b><small>Her kart tek çalışan için üretilir</small></span>
                      <span><Icon name="contact" /><b>NFC + Kişisel QR</b><small>Temassız ve hızlı paylaşım</small></span>
                      <span><Icon name="box" /><b>Kargo Dahil</b><small>Türkiye içi standart teslimat</small></span>
                      <span><Icon name="analytics" /><b>Panelden Kontrol</b><small>Kapasite ve kart takibi</small></span>
                    </div>
                  </section>
                )}
                {message && (
                  <div className="business-message" role="status">
                    {message}
                  </div>
                )}

                {currentTab === "employees" && (
                  <EmployeesPanel
                    org={org}
                    subscription={subscription}
                    usedSeats={usedSeats}
                    availableSeats={availableSeats}
                    canInvite={canInvite}
                    activeMembers={activeMembers}
                    invitedMembers={invitedMembers}
                    digitalCardsReady={digitalCardsReady}
                    physicalCards={physicalCards}
                    totalMembers={members.length}
                    filteredMembers={filteredMembers}
                    memberCardStatuses={memberCardStatuses}
                    search={search}
                    setSearch={setSearch}
                    departmentFilter={departmentFilter}
                    setDepartmentFilter={setDepartmentFilter}
                    departmentOptions={departmentOptions}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    showInviteForm={showInviteForm}
                    setShowInviteForm={setShowInviteForm}
                    setActiveTab={setActiveTab}
                    form={form}
                    setForm={setForm}
                    add={add}
                    currentUserId={currentUserId}
                    onEditOwnCard={() => router.push(ownCardEditorHref)}
                    initials={initials}
                    roleLabel={roleLabel}
                    relativeTime={relativeTime}
                    openMemberDrawer={openMemberDrawer}
                    showBulkInvite={showBulkInvite}
                    onToggleBulkInvite={openBulkInvite}
                    onCloseBulkInvite={closeBulkInvite}
                    bulkInvitePreview={bulkInvitePreview}
                    bulkInviteBusy={bulkInviteBusy}
                    bulkInviteResults={bulkInviteResults}
                    onBulkInviteFile={handleBulkInviteFile}
                    onSubmitBulkInvite={submitBulkInvite}
                    onBulkStatus={changeMembersStatus}
                  />
                )}

                {currentTab === "employees" && drawerMember && (
                  <EmployeeDrawer
                    drawerMember={drawerMember}
                    drawerTab={drawerTab}
                    setDrawerTab={setDrawerTab}
                    setDrawerMemberId={setDrawerMemberId}
                    memberEdit={memberEdit}
                    setMemberEdit={setMemberEdit}
                    memberEditBusy={memberEditBusy}
                    saveMemberIdentity={saveMemberIdentity}
                    org={org}
                    physicalCards={physicalCards}
                    memberCardStatuses={memberCardStatuses}
                    cardBusy={cardBusy}
                    viewLoading={viewLoading}
                    viewedProfile={viewedProfile}
                    setViewedProfile={setViewedProfile}
                    viewMemberProfile={viewMemberProfile}
                    corporateLinks={corporateLinks}
                    templates={templates}
                    changeStatus={changeStatus}
                    inviteAction={inviteAction}
                    linkReplacementCard={linkReplacementCard}
                    toggleCardStatus={toggleCardStatus}
                    initials={initials}
                    roleLabel={roleLabel}
                  />
                )}

                {currentTab === "templates" && (
                  <TemplatesPanel
                    templateVariant={String(companyFields.templateVariant || "ESSENTIAL")}
                    onTemplateVariantChange={(templateVariant) =>
                      setCompanyFields((value) => ({ ...value, templateVariant }))
                    }
                    template={template}
                    setTemplate={setTemplate}
                    previewBranding={templatePreviewBranding}
                    previewData={templatePreviewData}
                    activeTemplateName={templates.find((item) => item.is_default)?.name ?? null}
                    onSubmit={saveTemplate}
                    templateOptions={templateOptions}
                  />
                )}
                {currentTab === "overview" &&
                  (() => {
                    const roleCounts = {
                      OWNER: 0,
                      ADMIN: 0,
                      HR: 0,
                      EMPLOYEE: 0,
                    } as Record<string, number>;
                    const statusCounts = {
                      ACTIVE: 0,
                      INVITED: 0,
                      SUSPENDED: 0,
                      LEFT: 0,
                    } as Record<string, number>;
                    for (const member of members) {
                      if (member.status !== "LEFT")
                        roleCounts[member.role] =
                          (roleCounts[member.role] || 0) + 1;
                      statusCounts[member.status] =
                        (statusCounts[member.status] || 0) + 1;
                    }
                    const recentMembers = [...members]
                      .sort(
                        (a, b) =>
                          new Date(b.last_activity_at || b.created_at).getTime() -
                          new Date(a.last_activity_at || a.created_at).getTime(),
                      )
                      .slice(0, 4);
                    const departmentCounts = members
                      .filter((member) => member.status !== "LEFT")
                      .reduce(
                        (acc, member) => {
                          const key =
                            member.department?.trim() || "Belirtilmemiş";
                          acc[key] = (acc[key] || 0) + 1;
                          return acc;
                        },
                        {} as Record<string, number>,
                      );
                    const departmentEntries = Object.entries(departmentCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5);
                    const cardStatusCounts = {
                      UNASSIGNED: 0,
                      ACTIVE: 0,
                      LOST: 0,
                      DISABLED: 0,
                    } as Record<string, number>;
                    for (const card of physicalCards)
                      cardStatusCounts[card.status] =
                        (cardStatusCounts[card.status] || 0) + 1;
                    const daysUntilExpiry = subscription?.expires_at
                      ? Math.max(
                          0,
                          Math.ceil(
                            (new Date(subscription.expires_at).getTime() -
                              Date.now()) /
                              86400000,
                          ),
                        )
                      : null;
                    const seatLimit = subscription?.seat_limit ?? 0;
                    const seatPercent = seatLimit
                      ? Math.min(100, Math.round((usedSeats / seatLimit) * 100))
                      : 0;
                    const cardActivationPercent = usedSeats
                      ? Math.round((digitalCardsReady / usedSeats) * 100)
                      : 0;
                    const acceptedMembers = members.filter(
                      (member) =>
                        member.status !== "LEFT" && member.status !== "INVITED",
                    );
                    const cardsWithoutDigital = Math.max(
                      0,
                      acceptedMembers.length - digitalCardsReady,
                    );
                    const membersWithActivePhysical = new Set(
                      physicalCards
                        .filter(
                          (card) =>
                            card.status === "ACTIVE" && card.ownerUserId,
                        )
                        .map((card) => card.ownerUserId),
                    );
                    const assignableMembers = members.filter(
                      (member) =>
                        member.status !== "LEFT" &&
                        member.status !== "INVITED" &&
                        Boolean(member.user_id),
                    );
                    const unassignedPhysical = assignableMembers.filter(
                      (member) =>
                        !membersWithActivePhysical.has(member.user_id || ""),
                    ).length;
                    const physicalShowcase = physicalCards.slice(0, 4);
                    const roleEntries = [
                      [
                        "Yönetici",
                        roleCounts.OWNER + roleCounts.ADMIN,
                        "#8b5cf6",
                      ],
                      ["İK", roleCounts.HR, "#4e9df5"],
                      ["Çalışan", roleCounts.EMPLOYEE, "#f59e42"],
                    ] as const;
                    const roleTotal = Math.max(
                      1,
                      roleEntries.reduce((sum, row) => sum + row[1], 0),
                    );
                    const departmentTotal = Math.max(
                      1,
                      departmentEntries.reduce((sum, row) => sum + row[1], 0),
                    );
                    const ownMember = members.find((member) => member.user_id === currentUserId);
                    const representative = ownMember || members.find((member) => member.role === "OWNER" && member.status === "ACTIVE") || members.find((member) => member.status === "ACTIVE") || members[0];
                    const representativeCard = memberCardStatuses.find((item) => item.memberId === representative?.id);
                    const overviewSeries = cardAnalytics?.byDay?.length
                      ? cardAnalytics.byDay
                      : [{ date: new Date().toISOString().slice(0, 10), count: 0 }];
                    const overviewSeriesMax = Math.max(1, ...overviewSeries.map((item) => item.count));
                    const hasOverviewData = overviewSeries.some((item) => item.count > 0);
                    const overviewChartPoints = overviewSeries.map((item, index) => {
                      const x = overviewSeries.length === 1 ? 50 : (index / (overviewSeries.length - 1)) * 100;
                      const y = 92 - (item.count / overviewSeriesMax) * 76;
                      return `${x},${y}`;
                    }).join(" ");
                    const recentActivity = recentMembers.slice(0, 5);
                    const activePhysicalOwners = new Set(
                      physicalCards
                        .filter((card) => card.status === "ACTIVE" && card.ownerUserId)
                        .map((card) => card.ownerUserId),
                    ).size;
                    const digitalOnlyCards = Math.max(0, digitalCardsReady - activePhysicalOwners);
                    const distributedCardTotal = digitalOnlyCards + activePhysicalOwners;
                    const digitalCardPercent = distributedCardTotal ? Math.round((digitalOnlyCards / distributedCardTotal) * 100) : 0;
                    const interactionClicks = cardAnalytics?.content?.clicks ?? 0;
                    const interactionDownloads = cardAnalytics?.content?.downloads ?? 0;
                    const interactionTotal = interactionClicks + interactionDownloads;
                    const clickPercent = interactionTotal ? Math.round((interactionClicks / interactionTotal) * 100) : 0;
                    const cardRing = distributedCardTotal
                      ? `radial-gradient(circle at center,#10111e 55%,transparent 57%),conic-gradient(#8d3ff0 0 ${digitalCardPercent}%,#4f8ee8 ${digitalCardPercent}% 100%)`
                      : "radial-gradient(circle at center,#10111e 55%,transparent 57%),conic-gradient(#292638 0 100%)";
                    const interactionRing = interactionTotal
                      ? `radial-gradient(circle at center,#10111e 55%,transparent 57%),conic-gradient(#8d3ff0 0 ${clickPercent}%,#dca12d ${clickPercent}% 100%)`
                      : "radial-gradient(circle at center,#10111e 55%,transparent 57%),conic-gradient(#292638 0 100%)";
                    const licenseRing = `radial-gradient(circle at center,#10111e 55%,transparent 57%),conic-gradient(#8d3ff0 0 ${seatPercent}%,#292638 ${seatPercent}% 100%)`;
                    return (
                      <div className="v25-overview">
                        <section className="v26-overview-hero">
                          <div className="v26-overview-copy">
                            <span>YENOMI BUSINESS · {org?.organizations?.name || "ŞİRKET"}</span>
                            <small>Merhaba, {representative?.full_name?.split(" ")[0] || "Yönetici"}.</small>
                            <h2>Dijital kartvizit altyapınız <em>tam kontrol</em> altında.</h2>
                            <p>Çalışan kartlarını, kurumsal bağlantıları, lisans kapasitesini ve gerçek etkileşim verilerini tek merkezden yönetin.</p>
                            <div><button type="button" className="primary" onClick={() => router.push(ownCardEditorHref)}><Icon name="pencil" /> Kartımı Düzenle</button><button type="button" onClick={() => setActiveTab("employees")}><Icon name="users" /> Ekibi Yönet</button></div>
                          </div>
                          <div className="v26-card-stage" aria-label="Kurumsal kart önizlemesi">
                            <div className="v26-stage-glow" />
                            <CorporateHeroPreview
                              company={org?.organizations?.name || "Şirket"}
                              name={representative?.full_name || org?.organizations?.name || "Kurumsal Kart"}
                              title={representative?.title || representative?.department || "Kurumsal Dijital Kartvizit"}
                              email={representative?.email || "Kurumsal profil"}
                              slug={representativeCard?.slug || ""}
                            />
                          </div>
                          <ul className="v26-hero-capabilities"><li><Icon name="contact" /><span>NFC ile paylaşım</span></li><li><Icon name="qr" /><span>QR kod ile erişim</span></li><li><Icon name="refresh" /><span>Anlık güncelleme</span></li><li><Icon name="shield" /><span>Merkezi marka kontrolü</span></li></ul>
                        </section>

                        <div
                          className={`v25-health-strip${availableSeats === 0 || (daysUntilExpiry ?? 999) <= 30 ? " warning" : ""}`}
                        >
                          <span className="v25-health-dot">
                            <Icon
                              name={
                                availableSeats === 0 ||
                                (daysUntilExpiry ?? 999) <= 30
                                  ? "lock"
                                  : "check"
                              }
                            />
                          </span>
                          <strong>
                            {availableSeats === 0
                              ? "Lisans kapasitesi dolu"
                              : daysUntilExpiry != null && daysUntilExpiry <= 30
                                ? `Abonelik ${daysUntilExpiry} gün içinde bitiyor`
                                : "Her şey yolunda"}
                          </strong>
                          <small>
                            {availableSeats === 0
                              ? "Yeni çalışan daveti kapatıldı; ek lisans alındığında otomatik açılır."
                              : daysUntilExpiry != null && daysUntilExpiry <= 30
                                ? "Kesinti yaşamamak için yenileme planını kontrol edin."
                                : "Tüm temel sistemler aktif durumda."}
                          </small>
                          <button
                            type="button"
                            onClick={() => {
                              if ((availableSeats ?? 0) > 0 && (daysUntilExpiry ?? 999) <= 30) {
                                window.location.href = `mailto:hello@yenomilabs.com?subject=${encodeURIComponent(`${org?.organizations?.name || "Kurumsal hesap"} yenileme teklifi`)}`;
                                return;
                              }
                              openTab(
                                availableSeats === 0 && canManageLicenses
                                  ? "licenses"
                                  : "employees",
                              );
                            }}
                          >
                            {availableSeats === 0
                              ? canManageLicenses
                                ? "Lisans Satın Al →"
                                : "Çalışanları görüntüle →"
                              : daysUntilExpiry != null && daysUntilExpiry <= 30
                                ? "Yenileme için teklif iste →"
                                : "Detayları görüntüle →"}
                          </button>
                        </div>

                        <div className="v26-reference-dashboard">
                          <section className="v26-reference-kpis">
                            <article><i className="violet"><Icon name="users" /></i><span><small>Aktif Çalışan</small><b>{usedSeats}</b><em>Kullanılan lisans</em></span></article>
                            <article><i className="green"><Icon name="contact" /></i><span><small>Aktif Kart</small><b>{digitalCardsReady} / {usedSeats || 0}</b><em>%{cardActivationPercent} aktivasyon oranı</em></span></article>
                            <article><i className="violet"><Icon name="analytics" /></i><span><small>Toplam Görüntülenme</small><b>{cardAnalytics?.available === false ? "—" : (cardAnalytics?.totalViews ?? 0).toLocaleString("tr-TR")}</b><em>Seçili dönem</em></span></article>
                            <article><i className="blue"><Icon name="qr" /></i><span><small>İçerik Etkileşimi</small><b>{cardAnalytics?.content?.clicks ?? 0}</b><em>URL tıklaması</em></span></article>
                          </section>

                          <div className="v26-reference-main-row">
                            <section className="v26-reference-chart">
                              <header><div><h3>Kart Etkileşimleri</h3><p>Gerçek kart görüntüleme verileri</p></div><select aria-label="Etkileşim tarih aralığı" value={analyticsDays} onChange={(event) => { const days = Number(event.target.value) as 7 | 30 | 90; setAnalyticsDays(days); if (selected) void loadCardAnalytics(selected, undefined, days); }}><option value={7}>Son 7 gün</option><option value={30}>Son 30 gün</option><option value={90}>Son 90 gün</option></select></header>
                              <div className="v26-chart-tabs"><b>Görüntülenme</b><span>QR / NFC ölçümleri yalnızca kayıt oluştuğunda gösterilir</span></div>
                              <div className="v26-chart-canvas">
                                {hasOverviewData && <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Kart görüntülenme eğrisi"><defs><linearGradient id="overviewArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9848f2" stopOpacity=".52"/><stop offset="1" stopColor="#9848f2" stopOpacity="0"/></linearGradient></defs><polygon points={`0,100 ${overviewChartPoints} 100,100`} fill="url(#overviewArea)"/><polyline points={overviewChartPoints} fill="none" stroke="#a855f7" strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg>}
                                {!hasOverviewData && <p>Bu dönemde henüz kart görüntülenmesi yok.</p>}
                              </div>
                              <footer><span>{cardAnalytics?.periodStart || overviewSeries[0]?.date}</span><strong>{(cardAnalytics?.totalViews ?? 0).toLocaleString("tr-TR")} toplam görüntülenme</strong><span>{cardAnalytics?.periodEnd || overviewSeries[overviewSeries.length - 1]?.date}</span></footer>
                            </section>
                            <section className="v26-reference-activity"><header><h3>Son Aktiviteler</h3><button type="button" onClick={() => setActiveTab("employees")}>Tümünü Gör →</button></header>{recentActivity.length ? recentActivity.map((member) => { const activity = member.status === "INVITED" ? { text: "Çalışan daveti oluşturuldu", tone: "invite", icon: "mail" as const } : member.status === "ACTIVE" ? { text: "Çalışan hesabı aktif", tone: "active", icon: "check" as const } : member.status === "LEFT" ? { text: "Çalışan şirketten ayrıldı", tone: "left", icon: "logout" as const } : member.status === "SUSPENDED" ? { text: "Çalışan hesabı pasife alındı", tone: "suspended", icon: "lock" as const } : { text: "Çalışan kaydı güncellendi", tone: "updated", icon: "users" as const }; return <button type="button" key={member.id} onClick={() => { setActiveTab("employees"); openMemberDrawer(member); }}><i className={`tone-${activity.tone}`}><Icon name={activity.icon}/></i><span><b>{member.full_name || member.email}</b><small>{activity.text}</small></span><time>{relativeTime(member.last_activity_at || member.created_at)}</time></button>; }) : <p className="v25-empty-line">Henüz aktivite oluşmadı.</p>}</section>
                          </div>

                          <section className="v26-reference-bottom">
                            <article><h3>Kart Dağılımı</h3><div className="v26-summary-body"><div className="v26-ring" style={{ background: cardRing }}><b>{distributedCardTotal}</b><small>Toplam</small></div><ul><li><i className="purple"/>Yalnız Dijital <b>{digitalOnlyCards}</b></li><li><i className="blue"/>Fiziksel + Dijital <b>{activePhysicalOwners}</b></li></ul></div><button type="button" onClick={() => setActiveTab("employees")}>Kartları Yönet →</button></article>
                            <article><h3>Etkileşim Kanalları</h3><div className="v26-summary-body"><div className="v26-ring alternate" style={{ background: interactionRing }}><b>{interactionTotal}</b><small>Toplam</small></div><ul><li><i className="purple"/>URL Tıklaması <b>{interactionClicks}</b></li><li><i className="gold"/>PDF Açma <b>{interactionDownloads}</b></li></ul></div><button type="button" onClick={() => setActiveTab("settings")}>Detayları Görüntüle →</button></article>
                            <article><h3>Kart Şablonları</h3><div className="v26-template-count"><i><Icon name="pencil"/></i><b>{templates.length}</b><span>Kayıtlı şablon</span></div><p>Kurumsal kart görünümünü merkezi yönetin.</p><button type="button" onClick={() => setActiveTab("templates")}>Şablonları Yönet →</button></article>
                            <article><h3>Lisans Kullanımı</h3><div className="v26-summary-body"><div className="v26-ring" style={{ background: licenseRing }}><b>{usedSeats}/{subscription?.seat_limit ?? "—"}</b><small>Kullanılan</small></div><ul><li><i className="purple"/>Kullanılan <b>{usedSeats}</b></li><li><i className="muted"/>Boş <b>{availableSeats ?? "—"}</b></li></ul></div>{canManageLicenses && <button type="button" onClick={() => openTab("licenses")}>Lisansları Yönet →</button>}</article>
                          </section>
                        </div>

                        <div className="v25-dashboard-grid">
                          <div className="v25-dashboard-core">
                            <section className="v25-kpi-grid">
                              <article>
                                <i className="violet">
                                  <Icon name="users" />
                                </i>
                                <div>
                                  <small>Toplam Çalışan</small>
                                  <b>{usedSeats}</b>
                                  <span>
                                    {members.length > usedSeats
                                      ? `${members.length - usedSeats} geçmiş kayıt`
                                      : "Kurumsal ekip"}
                                  </span>
                                </div>
                              </article>
                              <article>
                                <i className="violet"><Icon name="analytics" /></i>
                                <div><small>Toplam Görüntülenme</small><b>{cardAnalytics?.available === false ? "—" : (cardAnalytics?.totalViews ?? 0).toLocaleString("tr-TR")}</b><span>{cardAnalytics?.available === false ? "Analitik kullanılamıyor" : "Gerçek kart erişimi"}</span></div>
                              </article>
                              <article>
                                <i className="green">
                                  <Icon name="contact" />
                                </i>
                                <div>
                                  <small>Aktif Kart</small>
                                  <b>{digitalCardsReady}</b>
                                  <span>
                                    %{cardActivationPercent} aktivasyon oranı
                                  </span>
                                  <div className="mini-meter">
                                    <em
                                      style={{
                                        width: `${cardActivationPercent}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </article>
                              <article>
                                <i className="amber">
                                  <Icon name="mail" />
                                </i>
                                <div>
                                  <small>Bekleyen Davet</small>
                                  <b>{invitedMembers}</b>
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab("employees")}
                                  >
                                    Davetleri görüntüle
                                  </button>
                                </div>
                              </article>
                              <article>
                                <i className="blue">
                                  <Icon name="analytics" />
                                </i>
                                <div>
                                  <small>Boş Lisans</small>
                                  <b>{availableSeats ?? "—"}</b>
                                  {canManageLicenses && (
                                    <button
                                      type="button"
                                      onClick={() => openTab("licenses")}
                                    >
                                      Lisans satın al
                                    </button>
                                  )}
                                </div>
                              </article>
                            </section>

                            <div className="v25-two-col">
                              <section className="v25-panel v25-tasks">
                                <header>
                                  <h3>Bugün Yapılacaklar</h3>
                                </header>
                                <div className="v25-task-list">
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab("employees")}
                                  >
                                    <i className="amber">!</i>
                                    <span>
                                      <strong>
                                        {invitedMembers} çalışan daveti kabul
                                        etmedi
                                      </strong>
                                      <small>Davetleri takip et</small>
                                    </span>
                                    <b>{invitedMembers}</b>
                                    <em>Git →</em>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab("employees")}
                                  >
                                    <i className="gold">◷</i>
                                    <span>
                                      <strong>
                                        {cardsWithoutDigital} kişi kartını
                                        oluşturmadı
                                      </strong>
                                      <small>
                                        Dijital kart kurulumu bekliyor
                                      </small>
                                    </span>
                                    <b>{cardsWithoutDigital}</b>
                                    <em>Git →</em>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openTab(
                                        canManageLicenses
                                          ? "licenses"
                                          : "employees",
                                      )
                                    }
                                  >
                                    <i
                                      className={
                                        availableSeats === 0 ? "red" : "green"
                                      }
                                    >
                                      △
                                    </i>
                                    <span>
                                      <strong>
                                        {availableSeats === 0
                                          ? "Lisans kapasitesi doldu"
                                          : `${availableSeats ?? "—"} boş lisans mevcut`}
                                      </strong>
                                      <small>
                                        {usedSeats} /{" "}
                                        {subscription?.seat_limit ?? "—"}{" "}
                                        kullanım
                                      </small>
                                    </span>
                                    <b>
                                      {usedSeats}/
                                      {subscription?.seat_limit ?? "—"}
                                    </b>
                                    <em>
                                      {canManageLicenses
                                        ? "Yönet →"
                                        : "Ekibi gör →"}
                                    </em>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab("employees")}
                                  >
                                                                        <span>
                                      <strong>
                                        {unassignedPhysical} kart atanmamış
                                      </strong>
                                      <small>Fiziksel kart eşleştirmesi</small>
                                    </span>
                                    <b>{unassignedPhysical}</b>
                                    <em>Git →</em>
                                  </button>
                                </div>
                              </section>

                              <section className="v25-panel v25-recent">
                                <header>
                                  <h3>Son Eklenen Çalışanlar</h3>
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab("employees")}
                                  >
                                    Tümünü Gör →
                                  </button>
                                </header>
                                <div>
                                  {recentMembers.length === 0 ? (
                                    <p className="v25-empty-line">
                                      Henüz çalışan eklenmedi.
                                    </p>
                                  ) : (
                                    recentMembers.map((member, index) => {
                                      const state = memberCardStatuses.find(
                                        (x) => x.memberId === member.id,
                                      );
                                      return (
                                        <button
                                          type="button"
                                          key={member.id}
                                          onClick={() => {
                                            setActiveTab("employees");
                                            openMemberDrawer(member);
                                          }}
                                        >
                                          <span
                                            className={`v25-person-avatar tone-${index % 4}`}
                                          >
                                            {initials(member)}
                                          </span>
                                          <span>
                                            <strong>
                                              {member.full_name || member.email}
                                            </strong>
                                            <small>
                                              {member.title ||
                                                member.department ||
                                                roleLabel(member.role)}
                                            </small>
                                          </span>
                                          <b
                                            className={
                                              state?.hasDigitalCard
                                                ? "ready"
                                                : "waiting"
                                            }
                                          >
                                            {state?.hasDigitalCard
                                              ? "Kart Hazır"
                                              : member.status === "INVITED"
                                                ? "Bekliyor"
                                                : "Kurulum"}
                                          </b>
                                          <em>
                                            {relativeTime(member.last_activity_at || member.created_at)}
                                          </em>
                                          <u>Profili Aç</u>
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              </section>
                            </div>

                            <section className="v25-panel v25-physical">
                              <header>
                                <h3>
                                  <i className="overview-icon">
                                    <Icon name="nfc" />
                                  </i>
                                  Fiziksel Kartlar
                                </h3>
                                <button
                                  type="button"
                                  onClick={() => setActiveTab("employees")}
                                >
                                  Tüm Kartları Gör →
                                </button>
                              </header>
                              <div className="v25-card-status-summary">
                                <span>
                                  Aktif <b>{cardStatusCounts.ACTIVE || 0}</b>
                                </span>
                                <span>
                                  Kayıp <b>{cardStatusCounts.LOST || 0}</b>
                                </span>
                                <span>
                                  Devre dışı{" "}
                                  <b>{cardStatusCounts.DISABLED || 0}</b>
                                </span>
                                <span>
                                  Atanmamış{" "}
                                  <b>{cardStatusCounts.UNASSIGNED || 0}</b>
                                </span>
                              </div>
                              {physicalShowcase.length === 0 ? (
                                <div className="v25-empty-line">
                                  Henüz fiziksel kart kaydı yok.
                                </div>
                              ) : (
                                <div className="v25-card-strip">
                                  {physicalShowcase.map((card, index) => {
                                    const owner = members.find(
                                      (m) => m.user_id === card.ownerUserId,
                                    );
                                    return (
                                      <article
                                        key={card.id}
                                        className={`card-tone-${index % 4}`}
                                      >
                                        <div>
                                          <span
                                            className={`v25-person-avatar tone-${index % 4}`}
                                          >
                                            {owner ? initials(owner) : "Y"}
                                          </span>
                                          <span>
                                            <strong>
                                              {owner?.full_name ||
                                                owner?.email ||
                                                "Atanmamış kart"}
                                            </strong>
                                            <small>
                                              {owner?.title ||
                                                owner?.department ||
                                                card.cardCodeMasked}
                                            </small>
                                            <code>{card.cardCodeMasked}</code>
                                          </span>
                                          <Icon name="nfc" />
                                        </div>
                                        <footer>
                                          <b
                                            className={
                                              card.status === "ACTIVE"
                                                ? "active"
                                                : "waiting"
                                            }
                                          >
                                            ●{" "}
                                            {card.status === "ACTIVE"
                                              ? "Aktif"
                                              : card.status === "LOST"
                                                ? "Kayıp"
                                                : card.status === "DISABLED"
                                                  ? "Devre dışı"
                                                  : "Bekliyor"}
                                          </b>
                                          <span>
                                            {card.activatedAt
                                              ? `Aktivasyon ${new Date(card.activatedAt).toLocaleDateString("tr-TR")}`
                                              : "Henüz aktive edilmedi"}
                                          </span>
                                          {card.status === "ACTIVE" && (
                                            <button
                                              type="button"
                                              disabled={cardBusy === card.id}
                                              onClick={() =>
                                                void toggleCardStatus(
                                                  card.id,
                                                  "DISABLED",
                                                )
                                              }
                                            >
                                              Devre dışı
                                            </button>
                                          )}
                                          {card.status === "DISABLED" && (
                                            <button
                                              type="button"
                                              disabled={cardBusy === card.id}
                                              onClick={() =>
                                                void toggleCardStatus(
                                                  card.id,
                                                  "ACTIVE",
                                                )
                                              }
                                            >
                                              Etkinleştir
                                            </button>
                                          )}
                                        </footer>
                                      </article>
                                    );
                                  })}
                                </div>
                              )}
                            </section>

                            <div className="v25-three-col">
                              <section className="v25-panel v25-distribution">
                                <h3>Departman dağılımı</h3>
                                <div className="v25-donut-wrap">
                                  <div
                                    className="v25-donut"
                                    style={{
                                      background: distributionGradient(
                                        departmentEntries,
                                        departmentTotal,
                                      ),
                                    }}
                                  >
                                    <span>
                                      <b>{usedSeats}</b>
                                      <small>Toplam</small>
                                    </span>
                                  </div>
                                  <ul>
                                    {departmentEntries.map(
                                      ([name, count], index) => (
                                        <li key={name}>
                                          <i className={`dot-${index % 4}`} />
                                          <span>{name}</span>
                                          <b>{count}</b>
                                          <small>
                                            %
                                            {Math.round(
                                              (count / departmentTotal) * 100,
                                            )}
                                          </small>
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              </section>
                              <section className="v25-panel v25-distribution">
                                <h3>Rol Dağılımı</h3>
                                <div className="v25-donut-wrap">
                                  <div
                                    className="v25-donut role"
                                    style={{
                                      background: distributionGradient(
                                        roleEntries,
                                        roleTotal,
                                      ),
                                    }}
                                  >
                                    <span>
                                      <b>{usedSeats}</b>
                                      <small>Toplam</small>
                                    </span>
                                  </div>
                                  <ul>
                                    {roleEntries.map(([name, count], index) => (
                                      <li key={name}>
                                        <i className={`dot-${index}`} />
                                        <span>{name}</span>
                                        <b>{count}</b>
                                        <small>
                                          %
                                          {Math.round(
                                            (count / roleTotal) * 100,
                                          )}
                                        </small>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </section>
                              <section className="v25-panel v25-activity">
                                <h3>Son Aktiviteler</h3>
                                <div>
                                  {recentMembers
                                    .slice(0, 4)
                                    .map((member, index) => (
                                      <p key={member.id}>
                                        <i className={`tone-${index % 4}`}>
                                          <Icon
                                            name={
                                              member.status === "INVITED"
                                                ? "mail"
                                                : index % 2
                                                  ? "check"
                                                  : "users"
                                            }
                                          />
                                        </i>
                                        <span>
                                          <strong>
                                            {member.full_name || member.email}
                                          </strong>{" "}
                                          {member.status === "INVITED"
                                            ? "davet edildi."
                                            : "çalışan kaydı güncellendi."}
                                        </span>
                                        <time>
                                          {relativeTime(member.last_activity_at || member.created_at)}
                                        </time>
                                      </p>
                                    ))}
                                </div>
                              </section>
                            </div>
                          </div>

                          <aside className="v25-dashboard-rail">
                            <section className="v25-panel v25-quick-actions">
                              <h3>Hızlı İşlemler</h3>
                              <button
                                onClick={() => {
                                  if (!canInvite) {
                                    openTab(
                                      canManageLicenses
                                        ? "licenses"
                                        : "employees",
                                    );
                                    return;
                                  }
                                  setActiveTab("employees");
                                  setShowInviteForm(true);
                                }}
                              >
                                <Icon name={canInvite ? "users" : "lock"} />
                                {canInvite
                                  ? "Çalışan Ekle"
                                  : "Lisans Kotası Dolu"}
                              </button>
                              <button onClick={() => setActiveTab("employees")}>
                                <Icon name="contact" />
                                Kartları Yönet
                              </button>
                              {canManageLicenses && (
                                <button onClick={() => openTab("licenses")}>
                                  <Icon name="analytics" />
                                  Lisans Satın Al
                                </button>
                              )}
                              <button onClick={() => setActiveTab("templates")}>
                                <Icon name="pencil" />
                                Şablon Yönetimi
                              </button>
                              <button onClick={() => setActiveTab("employees")}>
                                <Icon name="users" />
                                CSV ile Yükle
                              </button>
                              <button onClick={() => setActiveTab("overview")}>
                                <Icon name="analytics" />
                                Raporları Gör
                              </button>
                            </section>
                            <section className="v25-panel v25-license-card">
                              <h3>Lisans Kullanımı</h3>
                              <b>
                                {usedSeats} / {subscription?.seat_limit ?? "—"}
                              </b>
                              <span>Kullanılan Lisans</span>
                              <div className="v25-license-meter">
                                <i style={{ width: `${seatPercent}%` }} />
                              </div>
                              <div>
                                <span>
                                  <b>{usedSeats}</b>
                                  <small>Aktif</small>
                                </span>
                                <span>
                                  <b>{availableSeats ?? "—"}</b>
                                  <small>Boş</small>
                                </span>
                                <span>
                                  <b>{subscription?.seat_limit ?? "—"}</b>
                                  <small>Toplam</small>
                                </span>
                              </div>
                              {canManageLicenses && (
                                <button
                                  type="button"
                                  onClick={() => openTab("licenses")}
                                >
                                  Lisans Satın Al
                                </button>
                              )}
                            </section>
                            <section className="v25-panel v25-analytics-card">
                              <header>
                                <h3>
                                  <i className="overview-icon">
                                    <Icon name="analytics" />
                                  </i>
                                  Kart görüntülenmeleri
                                </h3>
                                <select
                                  aria-label="Analitik tarih aralığı"
                                  value={analyticsDays}
                                  onChange={(event) => {
                                    const days = Number(event.target.value) as
                                      | 7
                                      | 30
                                      | 90;
                                    setAnalyticsDays(days);
                                    if (selected)
                                      void loadCardAnalytics(
                                        selected,
                                        undefined,
                                        days,
                                      );
                                  }}
                                >
                                  <option value={7}>Son 7 gün</option>
                                  <option value={30}>Son 30 gün</option>
                                  <option value={90}>Son 90 gün</option>
                                </select>
                              </header>
                              <div className="v25-analytics-date-range">
                                <label>Başlangıç<input type="date" value={analyticsFrom} max={analyticsTo} onChange={(event) => setAnalyticsFrom(event.target.value)} /></label>
                                <label>Bitiş<input type="date" value={analyticsTo} min={analyticsFrom} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setAnalyticsTo(event.target.value)} /></label>
                                <button type="button" disabled={!analyticsFrom || !analyticsTo || analyticsFrom > analyticsTo} onClick={() => selected && void loadCardAnalytics(selected, undefined, analyticsDays, { from: analyticsFrom, to: analyticsTo })}>Uygula</button>
                              </div>
                              <b>
                                {cardAnalytics?.available === false
                                  ? "—"
                                  : (cardAnalytics?.totalViews ?? 0)}
                              </b>
                              <span>Toplam Görüntülenme</span>
                              <div className="v25-sparkline">
                                <i />
                                <i />
                                <i />
                                <i />
                                <i />
                                <i />
                                <i />
                                <i />
                                <i />
                                <i />
                              </div>
                              <footer>
                                <span>
                                  <b>{cardAnalytics?.totalViews ?? 0}</b>
                                  <small>Seçili dönem</small>
                                </span>
                                <span>
                                  <b>{cardAnalytics?.totalViews ?? 0}</b>
                                  <small>Toplam</small>
                                </span>
                                <span>
                                  <b>{digitalCardsReady}</b>
                                  <small>Aktif Kart</small>
                                </span>
                              </footer>
                            </section>
                            <section className="v25-panel v25-analytics-breakdown">
                              <header>
                                <h3>Konum dağılımı</h3>
                                <small>Ülke</small>
                              </header>
                              {cardAnalytics?.available === false ? (
                                <p className="v25-empty-line">
                                  Analitik geçici olarak kullanılamıyor.
                                </p>
                              ) : cardAnalytics?.byCountry?.length ? (
                                <ol>
                                  {cardAnalytics.byCountry
                                    .slice(0, 5)
                                    .map((item, index) => (
                                      <li key={`${item.country}-${index}`}>
                                        <span>
                                          {item.country || "Bilinmiyor"}
                                        </span>
                                        <b>{item.count}</b>
                                      </li>
                                    ))}
                                </ol>
                              ) : (
                                <p className="v25-empty-line">
                                  Henüz konum kırılımı oluşmadı.
                                </p>
                              )}
                            </section>
                            <section className="v25-panel v25-content-analytics">
                              <header>
                                <h3>Kurumsal içerik etkileşimleri</h3>
                                <button
                                  type="button"
                                  className="v25-csv-export"
                                  onClick={exportAnalyticsCsv}
                                >
                                  CSV indir
                                </button>
                              </header>
                              <div className="v25-content-metrics">
                                <span>
                                  <b>
                                    {cardAnalytics?.content
                                      ?.totalInteractions ?? 0}
                                  </b>
                                  <small>Toplam</small>
                                </span>
                                <span>
                                  <b>{cardAnalytics?.content?.clicks ?? 0}</b>
                                  <small>URL tıklaması</small>
                                </span>
                                <span>
                                  <b>
                                    {cardAnalytics?.content?.downloads ?? 0}
                                  </b>
                                  <small>PDF açma</small>
                                </span>
                              </div>
                              {cardAnalytics?.content?.byLink?.length ? (
                                <ol>
                                  {cardAnalytics.content.byLink.map(
                                    (item, index) => (
                                      <li key={item.linkId}>
                                        <span>
                                          {index + 1}. {item.label}
                                        </span>
                                        <b>{item.count}</b>
                                      </li>
                                    ),
                                  )}
                                </ol>
                              ) : (
                                <p className="v25-empty-line">
                                  Seçilen dönemde içerik etkileşimi oluşmadı.
                                </p>
                              )}
                              {cardAnalytics?.content?.byKind?.length ? (
                                <div className="v25-content-kind-breakdown">
                                  <small>İÇERİK TÜRÜ KIRILIMI</small>
                                  {cardAnalytics.content.byKind.map((item) => (
                                    <span key={item.kind}>
                                      <b>{({ CATALOG: "Ürün kataloğu", PRESENTATION: "Şirket sunumu", MEETING: "Toplantı", REFERENCES: "Referans" } as Record<string, string>)[item.kind] || item.kind}</b>
                                      <i style={{ width: `${Math.max(8, Math.round((item.count / Math.max(1, cardAnalytics.content?.totalInteractions || 1)) * 100))}%` }} />
                                      <em>{item.count}</em>
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </section>
                            <section className="v25-panel v25-analytics-breakdown">
                              <header>
                                <h3>Departman performansı</h3>
                                <small>{cardAnalytics?.periodStart && cardAnalytics?.periodEnd ? `${cardAnalytics.periodStart} – ${cardAnalytics.periodEnd}` : `Son ${analyticsDays} gün`}</small>
                              </header>
                              {cardAnalytics?.byDepartment?.length ? (
                                <ol>
                                  {cardAnalytics.byDepartment.map(
                                    (item, index) => (
                                      <li key={item.department}>
                                        <span>
                                          {index + 1}. {item.department}
                                        </span>
                                        <b>{item.count}</b>
                                      </li>
                                    ),
                                  )}
                                </ol>
                              ) : (
                                <p className="v25-empty-line">
                                  Henüz departman kırılımı oluşmadı.
                                </p>
                              )}
                            </section>
                            <section className="v25-panel v25-analytics-breakdown">
                              <header>
                                <h3>En çok görüntülenen kartlar</h3>
                                <small>Top 5</small>
                              </header>
                              {cardAnalytics?.available === false ? (
                                <p className="v25-empty-line">
                                  Analitik geçici olarak kullanılamıyor.
                                </p>
                              ) : cardAnalytics?.byCard?.length ? (
                                <ol>
                                  {cardAnalytics.byCard
                                    .slice(0, 5)
                                    .map((item, index) => (
                                      <li key={item.profileId}>
                                        <span>
                                          {index + 1}. {item.name}
                                        </span>
                                        <b>{item.count}</b>
                                      </li>
                                    ))}
                                </ol>
                              ) : (
                                <p className="v25-empty-line">
                                  Henüz kart görüntülenmesi kaydedilmedi.
                                </p>
                              )}
                            </section>
                          </aside>
                        </div>
                      </div>
                    );
                  })()}
                {currentTab === "cards" && (
                  <section className="p10-domain-panel">
                    <header><div><span>Kart Yönetimi</span><h2>Fiziksel ve dijital kartlar</h2><p>Kart durumunu çalışan profilinden bağımsız fakat aynı operasyon akışı içinde yönetin.</p></div><button type="button" onClick={() => openTab("employees")}>Çalışanlara Git</button></header>
                    <div className="p10-metric-grid"><article><small>Fiziksel kart</small><strong>{physicalCards.length}</strong></article><article><small>Aktif fiziksel kart</small><strong>{physicalCards.filter((card) => card.status === "ACTIVE").length}</strong></article><article><small>Dijital kart hazır</small><strong>{digitalCardsReady}</strong></article></div>
                    <div className="p10-card-list">{physicalCards.length ? physicalCards.map((card) => <article key={card.id}><div><strong>{card.ownerName || "Atanmamış kart"}</strong><small>{card.cardCodeMasked} · {card.ownerUserId ? "Çalışana atanmış" : "Atama bekliyor"}</small></div><span data-status={card.status}>{physicalCardLabel(card.status)}</span>{card.status === "ACTIVE" ? <button disabled={cardBusy===card.id} onClick={() => void toggleCardStatus(card.id,"DISABLED")}>Pasife Al</button> : card.status === "DISABLED" ? <button disabled={cardBusy===card.id} onClick={() => void toggleCardStatus(card.id,"ACTIVE")}>Aktifleştir</button> : <i />}</article>) : <p className="p10-empty">Henüz fiziksel kart kaydı yok.</p>}</div>
                  </section>
                )}
                {currentTab === "analytics" && (
                  <section className="p10-domain-panel">
                    <header><div><span>Analitik</span><h2>Kurumsal kart performansı</h2><p>Gerçek görüntülenme ve içerik etkileşim verilerini seçili dönem için inceleyin.</p></div><select value={analyticsDays} onChange={(event) => { const days=Number(event.target.value) as 7|30|90; setAnalyticsDays(days); if(selected) void loadCardAnalytics(selected,undefined,days); }}><option value={7}>Son 7 gün</option><option value={30}>Son 30 gün</option><option value={90}>Son 90 gün</option></select></header>
                    <div className="p10-metric-grid"><article><small>Toplam görüntülenme</small><strong>{cardAnalytics?.available===false ? "—" : (cardAnalytics?.totalViews ?? 0).toLocaleString("tr-TR")}</strong></article><article><small>Son 30 gün</small><strong>{cardAnalytics?.available===false ? "—" : (cardAnalytics?.last30DaysViews ?? 0).toLocaleString("tr-TR")}</strong></article><article><small>İçerik etkileşimi</small><strong>{cardAnalytics?.available===false ? "—" : (cardAnalytics?.content?.totalInteractions ?? 0).toLocaleString("tr-TR")}</strong></article></div>
                    <div className="p10-ranking"><h3>En çok görüntülenen kartlar</h3>{cardAnalytics?.byCard?.length ? cardAnalytics.byCard.slice(0,10).map((item,index)=><div key={item.profileId}><span>{index+1}</span><strong>{item.name}</strong><small>{item.count.toLocaleString("tr-TR")} görüntülenme</small></div>) : <p className="p10-empty">Bu dönem için görüntülenme verisi yok.</p>}</div>
                  </section>
                )}
                {currentTab === "settings" && (
                  <section className="p10-domain-panel p10-settings-hub">
                    <header><div><span>Ayarlar</span><h2>Kurumsal yönetim ayarları</h2><p>Sık değişmeyen yönetim alanlarına buradan ulaşın.</p></div></header>
                    <div className="p10-settings-grid"><button type="button" onClick={() => openTab("organization")}><strong>Organizasyon</strong><span>Şirket kimliği, alan politikaları ve ünvanlar</span></button><button type="button" onClick={() => openTab("roles")}><strong>Roller & Yetkiler</strong><span>Kim hangi işlemleri yapabilir?</span></button><button type="button" onClick={() => openTab("content")}><strong>İçerik Merkezi</strong><span>Merkezi bağlantılar ve kurumsal dosyalar</span></button></div>
                  </section>
                )}
                {currentTab === "roles" && <RolesPanel members={members} />}
                {false && (
                  <section className="business-role-panel">
                    <header>
                      <div>
                        <span>ERİŞİM YÖNETİMİ</span>
                        <h2>Rol ve yetki matrisi</h2>
                        <p>
                          Roller açıklama kartı değil, gerçek işlem yetkilerini
                          gösterir.
                        </p>
                      </div>
                      <b>4 sistem rolü</b>
                    </header>
                    <div className="business-role-summary">
                      <article>
                        <small>Şirket Sahibi</small>
                        <strong>
                          {
                            members.filter(
                              (m) => m.role === "OWNER" && m.status !== "LEFT",
                            ).length
                          }
                        </strong>
                      </article>
                      <article>
                        <small>Yönetici</small>
                        <strong>
                          {
                            members.filter(
                              (m) => m.role === "ADMIN" && m.status !== "LEFT",
                            ).length
                          }
                        </strong>
                      </article>
                      <article>
                        <small>İnsan Kaynakları</small>
                        <strong>
                          {
                            members.filter(
                              (m) => m.role === "HR" && m.status !== "LEFT",
                            ).length
                          }
                        </strong>
                      </article>
                      <article>
                        <small>Çalışan</small>
                        <strong>
                          {
                            members.filter(
                              (m) =>
                                m.role === "EMPLOYEE" && m.status !== "LEFT",
                            ).length
                          }
                        </strong>
                      </article>
                    </div>
                    <div className="business-role-matrix">
                      <table>
                        <thead>
                          <tr>
                            <th>Yetki</th>
                            {ROLE_MATRIX_COLUMNS.map((role) => (
                              <th key={role}>{ROLE_LABELS[role]}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ROLE_CAPABILITIES.map((capability) => (
                            <tr key={capability.label}>
                              <td>{capability.label}</td>
                              {ROLE_MATRIX_COLUMNS.map((role) => {
                                const allowed = capability.allows(role);
                                return (
                                  <td
                                    key={role}
                                    className={allowed ? "allowed" : "denied"}
                                  >
                                    {allowed ? "✓" : "—"}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <aside>
                      <Icon name="lock" />
                      <p>
                        <strong>Güvenlik kuralı:</strong> Kullanıcı kendi rolünü
                        yükseltemez. Şirket Sahibi rolü panelden silinemez veya
                        pasife alınamaz; rol değişiklikleri sunucu tarafında
                        yetki kontrolünden geçer.
                      </p>
                    </aside>
                  </section>
                )}
                {currentTab === "organization" && (
                  <CompanySettingsPanel
                    fields={companyFields}
                    setFields={setCompanyFields}
                    onSubmit={saveTemplate}
                    organizationName={orgNameDraft}
                    onOrganizationNameChange={setOrgNameDraft}
                    onSaveOrganizationName={renameOrganization}
                    canRenameOrganization={org?.role === "OWNER"}
                    organizationNameBusy={orgNameBusy}
                  />
                )}
                {currentTab === "organization" && (
                  <JobTitlesPanel
                    jobTitles={jobTitles}
                    newJobTitle={newJobTitle}
                    onNewJobTitleChange={setNewJobTitle}
                    onAddJobTitle={addJobTitle}
                    jobTitleBusy={jobTitleBusy}
                    onRemoveJobTitle={removeJobTitle}
                    titleRequests={titleRequests}
                    titleRequestBusyId={titleRequestBusyId}
                    onResolveTitleRequest={resolveTitleRequest}
                  />
                )}
                {currentTab === "content" && (
                  <CorporateLinksPanel
                    links={corporateLinks}
                    linkVersions={linkVersions}
                    linkUrlDraft={linkUrlDraft}
                    onUrlDraftChange={(kind, value) => setLinkUrlDraft((v) => ({ ...v, [kind]: value }))}
                    linkScheduleDraft={linkScheduleDraft}
                    onScheduleDraftChange={(kind, value) => setLinkScheduleDraft((current) => ({ ...current, [kind]: value }))}
                    linkBusyKind={linkBusyKind}
                    onSaveUrl={saveCorporateLinkUrl}
                    onUploadFile={uploadCorporateLinkFile}
                    onTogglePublication={toggleCorporateLinkPublication}
                    onRemove={removeCorporateLink}
                    onRollback={rollbackCorporateLink}
                  />
                )}
              </>
            )}
          </section>
        </section>
      </div>
      <nav className="enterprise-mobile-bottom-nav" aria-label="Hızlı panel navigasyonu">
        {(["overview", "employees", "cards", "analytics"] as CorporatePanelTab[]).filter((key) => tabs.some(([tabKey]) => tabKey === key)).map((key) => (
          <button
            key={key}
            type="button"
            className={currentTab === key ? "active" : ""}
            aria-current={currentTab === key ? "page" : undefined}
            onClick={() => { setMobileNavOpen(false); setActiveTab(key); router.push(tabRoutes[key]); }}
          >
            <Icon name={tabMeta[key].icon} />
            <span>{key === "overview" ? "Genel" : key === "employees" ? "Ekip" : key === "cards" ? "Kartlar" : "Analitik"}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
