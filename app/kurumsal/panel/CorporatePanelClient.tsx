"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { writeSessionCookie } from "../../components/AuthSessionBridge";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import { Icon } from "../../icons";
import { EmptyState, LoadingState } from "../../components/ui/States";
import PanelSidebar from "../../components/ui/PanelSidebar";
import { YenomiProductVisual } from "../../ui/YenomiProductVisual";
import {
  ROLE_LABELS,
} from "../../../lib/organizations/role-matrix";
import CardTemplate, { type CardBranding } from "../../CardTemplate";
import { getSeatBreakdown } from "../../../lib/organizations/lifecycle";
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
import CardsPanel from "./components/CardsPanel";
import AnalyticsPanel from "./components/AnalyticsPanel";
import OverviewPanel from "./components/OverviewPanel";
import NetworkingPanel from "./components/NetworkingPanel";
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
  corporatePanelNavItems,
  corporateSidebarItems,
} from "./domain/navigation";
import { fetchWithPanelTimeout, waitForInitialPanelLoads } from "./domain/runtime";
import { useJobTitlesAndRequests } from "./hooks/useJobTitlesAndRequests";
import { useCorporateLinks } from "./hooks/useCorporateLinks";
import { getIdentityInitials } from "../../../lib/organizations/identity";
import { isOrganizationRole, normalizeOrganizationRole } from "../../../lib/organizations/permissions";

export default function CompanyPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selected, setSelected] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [organizationSeatUsage, setOrganizationSeatUsage] = useState<number | null>(null);
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
  const [orgNameError, setOrgNameError] = useState<string | null>(null);
  const [orgNameSaved, setOrgNameSaved] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
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
      if (typeof data.seatUsage?.used === "number") setOrganizationSeatUsage(data.seatUsage.used);
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
        setProfileDirty(false);
        setProfileSaved(false);
        setProfileError(null);
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

  function selectOrganization(id: string) {
    setSelected(id);
    setViewedProfile(null);
    setMembers([]);
    setOrganizationSeatUsage(null);
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

  const loadingLabel = CORPORATE_PANEL_TAB_META[activeTab].loadingLabel;

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
        if (response.status === 403) {
          router.replace("/kartim");
          return;
        }
        if (response.status === 401) {
          router.replace("/giris?portal=business&next=%2Fkurumsal%2Fpanel");
          return;
        }
        setLoadingError(data.error || "Şirket bilgileri yüklenemedi.");
        setLoading(false);
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
      let redirecting = false;
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
          // Yönetim paneli yalnız OWNER / ADMIN / HR / DEPARTMENT_MANAGER içindir.
          // EMPLOYEE'yi boş-şirket ekranında bırakmak yerine Kartım'a götür.
          if (response.status === 403) {
            redirecting = true;
            router.replace("/kartim");
            return;
          }
          if (response.status === 401) {
            redirecting = true;
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
            loadPhysicalCards(id, access),
            loadMemberCardStatuses(id, access),
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
        if (!redirecting) setLoading(false);
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
    setProfileBusy(true);
    setProfileError(null);
    setProfileSaved(false);
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
      setProfileDirty(false);
      setProfileSaved(true);
      setMessage("Varsayılan kurumsal şablon güncellendi.");
    } else {
      setProfileError(data.error || "Şablon kaydedilemedi.");
      setMessage(data.error || "Şablon kaydedilemedi.");
    }
    setProfileBusy(false);
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

  async function changeMembersDepartment(memberIds: string[], department: string) {
    const access = await token();
    if (!access || !selected || !memberIds.length) return;
    setMessage("");
    const successful: string[] = [];
    const failures: string[] = [];
    const membersById = new Map(members.map((member) => [member.id, member]));
    for (const memberId of memberIds) {
      const member = membersById.get(memberId);
      if (!member) {
        failures.push(memberId);
        continue;
      }
      const fullName = (member.full_name || "").trim().length >= 2 ? member.full_name!.trim() : member.email;
      try {
        const response = await fetch("/api/organizations/members", {
          method: "PATCH",
          headers: { "content-type": "application/json", authorization: `Bearer ${access}` },
          body: JSON.stringify({
            action: "IDENTITY",
            organizationId: selected,
            memberId,
            fullName,
            email: member.email,
            title: member.title || "",
            department,
          }),
        });
        if (response.ok) successful.push(memberId);
        else failures.push(memberId);
      } catch {
        failures.push(memberId);
      }
    }
    if (successful.length) {
      setMembers((current) => current.map((member) => successful.includes(member.id) ? { ...member, department } : member));
    }
    if (failures.length) setMessage(`${successful.length} çalışanın departmanı güncellendi; ${failures.length} çalışan için işlem tamamlanamadı.`);
    else setMessage(`${successful.length} çalışanın departmanı güncellendi.`);
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
    setOrgNameError(null);
    setOrgNameSaved(false);
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
      setOrgNameSaved(true);
      setMessage("Şirket adı güncellendi.");
    } else {
      setOrgNameError(data.error || "Şirket adı güncellenemedi.");
      setMessage(data.error || "Şirket adı güncellenemedi.");
    }
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
  const usedSeats = organizationSeatUsage ?? seatBreakdown.used;
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
  const roleLabel = (role: string) => {
    const normalized = normalizeOrganizationRole(role);
    if (normalized) return ROLE_LABELS[normalized];
    if (role === "HR_MANAGER") return ROLE_LABELS.HR;
    return role;
  };
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
  const canManageNetworking = canManageLicenses;
  const sidebarItems = org ? corporateSidebarItems(org.role) : [];
  const tabs: ReadonlyArray<readonly [CorporatePanelTab, string]> = sidebarItems.map(({ key, label }) => [key, label] as const);
  const sidebarPermissionsLoading = !org && loading;
  const tabRoutes: Record<CorporatePanelTab, string> = {
    overview: "/kurumsal/panel",
    employees: "/kurumsal/panel/calisanlar",
    cards: "/kurumsal/panel/kartlar",
    roles: "/kurumsal/panel/roller",
    templates: "/kurumsal/panel/sablon",
    content: "/kurumsal/panel/icerik",
    analytics: "/kurumsal/panel/istatistikler",
    leads: "/kurumsal/panel/leadler",
    events: "/kurumsal/panel/etkinlikler",
    meetings: "/kurumsal/panel/gorusmeler",
    licenses: "/kurumsal/panel/lisans",
    organization: "/kurumsal/panel/organizasyon",
    settings: "/kurumsal/panel/ayarlar",
  };
  const tabMeta: Record<CorporatePanelTab, { title: string; description: string; icon: Parameters<typeof Icon>[0]["name"] }> = {
    overview: { title: "Genel Bakış", description: "Şirket sağlığını, lisansları ve kart operasyonlarını tek ekrandan izle.", icon: "building" },
    employees: { title: "Çalışanlar", description: "Ekibini, davetleri ve kart yaşam döngüsünü buradan yönet.", icon: "users" },
    cards: { title: "Kartlar", description: "Fiziksel ve dijital kart durumlarını tek yerde yönet.", icon: "id" },
    roles: { title: "Roller & Yetkiler", description: "Kurumsal yetki sınırlarını ve rol dağılımını kontrol et.", icon: "lock" },
    templates: { title: "Marka & Şablon", description: "Kurumsal kart görünümünü ve marka standartlarını merkezi olarak yönet.", icon: "id" },
    content: { title: "İçerik", description: "Merkezi bağlantıları ve kurumsal dosyaları çalışan kartlarına dağıt.", icon: "link" },
    analytics: { title: "İstatistikler", description: "Kart görüntülenmelerini ve içerik etkileşimlerini gerçek verilerle izle.", icon: "analytics" },
    leads: { title: "Leadler", description: "Karttan düşen networking lead’lerini, mail ve görüşme takibini yönet.", icon: "mail" },
    events: { title: "Etkinlikler", description: "Etkinlik QR attribution katmanını kişi kartından ayrı tut.", icon: "clock" },
    meetings: { title: "Görüşmeler", description: "Online ve yüz yüze görüşme taleplerini kabul et, alternatif öner veya reddet.", icon: "headset" },
    licenses: { title: "Lisanslar", description: "Toplam, kullanılan ve boş lisansları; ek kullanıcı paketleriyle birlikte yönet.", icon: "box" },
    organization: { title: "Organizasyon", description: "Şirket kimliği, alan politikaları ve ünvan standardını yönet.", icon: "building" },
    settings: { title: "Ayarlar", description: "Sık değişmeyen kurumsal yönetim alanlarına ulaş.", icon: "adjustments" },
  };
  const pageOwnsTitle =
    currentTab === "content" ||
    currentTab === "templates" ||
    currentTab === "leads" ||
    currentTab === "events" ||
    currentTab === "meetings" ||
    currentTab === "settings" ||
    currentTab === "roles" ||
    currentTab === "organization" ||
    currentTab === "licenses" ||
    currentTab === "analytics";
  const openTab = (tab: CorporatePanelTab) => {
    const allowed = !org || corporateSidebarItems(org.role).some((item) => item.key === tab);
    if (!allowed) {
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
    if (!org) return;
    const allowed = corporateSidebarItems(org.role);
    if (allowed.length === 0) return;
    if (allowed.some((item) => item.key === currentTab)) return;
    const fallback = departmentManager ? "employees" : "overview";
    setActiveTab(fallback);
    router.replace(tabRoutes[fallback]);
  }, [currentTab, departmentManager, org, router]);
  const signOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    await writeSessionCookie(null);
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
  const sidebarRole = normalizeOrganizationRole(sidebarUser?.role);
  const sidebarRoleLabel = sidebarRole ? ROLE_LABELS[sidebarRole] : roleLabel(sidebarUser?.role || "EMPLOYEE");
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
    name: templatePreviewMember?.full_name || org?.organizations?.name || "Çalışan",
    role: templatePreviewMember?.title || "Ünvan",
    company: org?.organizations?.name || "Şirketiniz",
    phone: String(companyFields.phone || ""),
    whatsapp: String(companyFields.phone || ""),
    email: templatePreviewMember?.email || "",
    website: String(companyFields.website || ""),
    linkedin: "",
    instagram: "",
    location: String(companyFields.address || ""),
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
    <main id="main-content" className="business-console business-console--compact p10-corporate-platform" data-ui-context="dashboard" lang="tr" translate="no">
      <div className="enterprise-dashboard-shell">
        <PanelSidebar
          ariaLabel="Kurumsal yönetim menüsü"
          subtitle="Kurumsal Panel"
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          onBrandClick={() => { const next = departmentManager ? "employees" : "overview"; setActiveTab(next); router.push(tabRoutes[next]); }}
          activeKey={currentTab}
          onNavigate={(key) => { if (isCorporatePanelTab(key)) setActiveTab(key); }}
          loading={sidebarPermissionsLoading}
          storageKey="yenomi:corporate-sidebar:collapsed"
          items={org ? corporatePanelNavItems(org.role, ownCardEditorHref) : []}
        >
          <div className="enterprise-side-links enterprise-side-management">
            <button type="button" onClick={signOut}>
              <Icon name="logout" />
              <span>Çıkış Yap</span>
            </button>
          </div>
          <div className="enterprise-side-plan">
            <small>
              {subscription?.business_plans?.name || "Business"}
            </small>
            <strong>
              {loading ? "—" : usedSeats} / {subscription?.seat_limit ?? "—"} Lisans
            </strong>
            <div className="enterprise-plan-meter" aria-hidden="true">
              <span
                style={{
                  width: `${subscription?.seat_limit ? Math.min(100, Math.round((usedSeats / subscription.seat_limit) * 100)) : 0}%`,
                }}
              />
            </div>
            {canManageLicenses && currentTab !== "licenses" && (
              <button type="button" onClick={() => openTab("licenses")}>
                Yönet
              </button>
            )}
          </div>
          <div className="enterprise-side-user">
            <span>{(sidebarUser?.full_name || sidebarUser?.email || "Y").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{sidebarUser?.full_name || sidebarUser?.email || "Yönetici"}</strong>
              <small>{sidebarRoleLabel}</small>
            </div>
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
              <header className={`enterprise-topbar${pageOwnsTitle ? " enterprise-topbar--chrome" : ""}`}>
            <div className={pageOwnsTitle ? "sr-only" : undefined}>
              <h1>{tabMeta[currentTab].title}</h1>
              <p>{tabMeta[currentTab].description}</p>
            </div>
            <div className="enterprise-topbar-actions">
              {canManageLicenses && <button
                type="button"
                className="enterprise-quick-link"
                onClick={() => {
                  if (currentTab === "licenses") {
                    document.getElementById("seat-pack-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    return;
                  }
                  goToLicenses();
                }}
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
                      onChange={(event) => selectOrganization(event.target.value)}
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
                <LoadingState label={loadingLabel} variant="panel" />
                {loadingSlow ? <div className="enterprise-loading-slow"><strong>Bu işlem beklenenden uzun sürüyor.</strong><p>Panel sonsuz yüklemede kalmaz; yanıt vermeyen istekler zaman aşımına uğrar ve panel kullanılabilir hale gelir.</p><button type="button" onClick={() => void reloadPanelData()}>Yeniden Dene</button></div> : null}
              </div>
            ) : !orgs.length ? (
              <EmptyState
                icon="building"
                title={message || "Hesabına bağlı aktif şirket bulunmuyor."}
                description="Ödemen alındıysa şirket kurulumu henüz bitmemiş olabilir. Siparişlerimden durumu gör veya başarı sayfasından kurulumu tekrar dene. Davetle katıldıysan e-postadaki bağlantıyı kullan."
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
                  <OverviewPanel
                    org={org}
                    orgs={orgs}
                    selected={selected}
                    onSelectOrganization={selectOrganization}
                    subscription={subscription}
                    loading={loading}
                    usedSeats={usedSeats}
                    availableSeats={availableSeats}
                    invitedMembers={invitedMembers}
                    digitalCardsReady={digitalCardsReady}
                    members={members}
                    physicalCards={physicalCards}
                    memberCardStatuses={memberCardStatuses}
                    templates={templates}
                    analytics={cardAnalytics}
                    analyticsDays={analyticsDays}
                    onPeriodChange={(days) => {
                      setAnalyticsDays(days);
                      if (selected) void loadCardAnalytics(selected, undefined, days);
                    }}
                    currentUserId={currentUserId}
                    canManageLicenses={canManageLicenses}
                    visibleTabs={tabs}
                    openTab={openTab}
                    openMemberDrawer={openMemberDrawer}
                    relativeTime={relativeTime}
                    onEditOwnCard={() => router.push(ownCardEditorHref)}
                    onExportCsv={exportAnalyticsCsv}
                  />
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
                        {availableSeats === 0 && <b className="license-reference-alert"><Icon name="plus" /> Yeni çalışan için ek lisans gerekli</b>}
                      </div>
                      <div className="license-reference-art" aria-hidden="true">
                        <div className="license-reference-product-glow" />
                        <YenomiProductVisual variant="card" compact />
                        <span><i /> NFC + QR hazır</span>
                      </div>
                    </div>
                    <p className="seat-pack-guide">
                      1–3 lisans küçük eklemeler, 5 lisans büyüyen ekipler, 10 lisans daha geniş dağıtım içindir.
                      5’li paket en çok tercih edilen seçimdir. Şu anda {usedSeats} lisans kullanılıyor.
                    </p>
                    <div id="seat-pack-grid" className="business-seat-pack-grid">
                      {seatPacks.map((pack) => (
                        <article
                          key={pack.sku}
                          className={pack.seats === 5 ? "recommended" : ""}
                        >
                          {pack.seats === 5 && <span className="seat-pack-badge">En çok tercih edilen</span>}
                          <div className="seat-pack-count">
                            <strong>+{pack.seats}</strong>
                            <span>kullanıcı</span>
                          </div>
                          <h3>
                            {pack.seats} lisans + {pack.seats} kart
                          </h3>
                          <p className="seat-pack-fit">
                            {pack.seats <= 1 ? "Tek ekleme" : pack.seats <= 3 ? "Küçük ekip" : pack.seats === 5 ? "Büyüyen ekip" : "Geniş dağıtım"}
                          </p>
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
                            <span>/ paket</span>
                            <small>KDV dahil</small>
                          </div>
                          <button
                            type="button"
                            className="ds-button ds-button--primary seat-pack-cta"
                            onClick={() => buySeatPack(pack)}
                          >
                            Paketi Seç
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
                      <span><i><Icon name="shield" /></i><b>Güvenli ve Kişiye Özel</b><small>Her kart tek çalışan için üretilir</small></span>
                      <span><i><Icon name="contact" /></i><b>NFC + Kişisel QR</b><small>Temassız ve hızlı paylaşım</small></span>
                      <span><i><Icon name="box" /></i><b>Kargo Dahil</b><small>Türkiye içi standart teslimat</small></span>
                      <span><i><Icon name="analytics" /></i><b>Panelden Kontrol</b><small>Kapasite ve kart takibi</small></span>
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
                    onBulkDepartment={changeMembersDepartment}
                    canBulkDepartment={org?.role !== "DEPARTMENT_MANAGER"}
                    canManageLicenses={canManageLicenses}
                  />
                )}

                {(currentTab === "employees" || currentTab === "cards") && drawerMember && (
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
                {currentTab === "cards" && (
                  <CardsPanel
                    members={members}
                    physicalCards={physicalCards}
                    memberCardStatuses={memberCardStatuses}
                    digitalCardsReady={digitalCardsReady}
                    cardBusy={cardBusy}
                    toggleCardStatus={toggleCardStatus}
                    openMemberDrawer={openMemberDrawer}
                    openEmployees={() => openTab("employees")}
                    initials={initials}
                  />
                )}
                {currentTab === "analytics" && (
                  <AnalyticsPanel
                    analytics={cardAnalytics}
                    analyticsDays={analyticsDays}
                    onPeriodChange={(days) => {
                      setAnalyticsDays(days);
                      if (selected) void loadCardAnalytics(selected, undefined, days);
                    }}
                    onViewOwnCard={() => router.push(ownCardEditorHref)}
                    onShareSettings={() => openTab("templates")}
                  />
                )}
                {currentTab === "leads" && canManageNetworking && (
                  <NetworkingPanel view="leads" organizationId={selected} token={token} members={members} memberCardStatuses={memberCardStatuses} />
                )}
                {currentTab === "events" && canManageNetworking && (
                  <NetworkingPanel view="events" organizationId={selected} token={token} members={members} memberCardStatuses={memberCardStatuses} />
                )}
                {currentTab === "meetings" && canManageNetworking && (
                  <NetworkingPanel view="meetings" organizationId={selected} token={token} members={members} memberCardStatuses={memberCardStatuses} />
                )}
                {currentTab === "settings" && (
                  <section className="p10-domain-panel p10-settings-hub">
                    <header><div><span>Ayarlar</span><h2>Kurumsal yönetim ayarları</h2><p>Sık değişmeyen yönetim alanlarına buradan ulaşın. Her kart bir çalışma alanına gider.</p></div></header>
                    <div className="p10-settings-grid">
                      <button type="button" onClick={() => openTab("organization")}>
                        <Icon name="building" />
                        <strong>Organizasyon</strong>
                        <span>Şirket kimliği, iletişim bilgileri, alan politikaları ve ünvanlar</span>
                        <em>Organizasyona git →</em>
                      </button>
                      <button type="button" onClick={() => openTab("roles")}>
                        <Icon name="lock" />
                        <strong>Roller & Yetkiler</strong>
                        <span>Kim hangi işlemleri yapabilir?</span>
                        <em>Rolleri gör →</em>
                      </button>
                      <button type="button" onClick={() => openTab("content")}>
                        <Icon name="link" />
                        <strong>İçerik Merkezi</strong>
                        <span>Merkezi bağlantılar ve kurumsal dosyalar</span>
                        <em>İçeriği yönet →</em>
                      </button>
                    </div>
                  </section>
                )}
                {currentTab === "roles" && <RolesPanel members={members} />}
                {currentTab === "organization" && (
                  <div className="p11-org-workspace">
                    <CompanySettingsPanel
                    fields={companyFields}
                    setFields={(value) => {
                      setCompanyFields(value);
                      setProfileDirty(true);
                      setProfileSaved(false);
                    }}
                    onSubmit={saveTemplate}
                    organizationName={orgNameDraft}
                    savedOrganizationName={org?.organizations?.name || ""}
                    onOrganizationNameChange={(value) => {
                      setOrgNameDraft(value);
                      setOrgNameSaved(false);
                      setOrgNameError(null);
                    }}
                    onSaveOrganizationName={renameOrganization}
                    canRenameOrganization={org?.role === "OWNER"}
                    organizationNameBusy={orgNameBusy}
                    organizationNameError={orgNameError}
                    organizationNameSaved={orgNameSaved}
                    profileBusy={profileBusy}
                    profileDirty={profileDirty}
                    profileSaved={profileSaved}
                    profileError={profileError}
                  />
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
                  </div>
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
