"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { writeSessionCookie } from "../../components/AuthSessionBridge";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import { getBrowserSession } from "../../../lib/auth/get-browser-session";
import { Icon } from "../../icons";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/States";
import IDSidebar from "./IDSidebar";
import {
  ROLE_LABELS,
} from "../../../lib/organizations/role-matrix";
import { type CardBranding } from "../../CardTemplate";
import { countMembersWithoutPhysicalAssignment, getSeatBreakdown } from "../../../lib/organizations/lifecycle";
import { clearLegacyCart, setCartOwner } from "../../../lib/cart";
import { parseBulkInviteCsv, BULK_INVITE_MAX_ROWS } from "../../../lib/organizations/bulk-invite";
import JobTitlesPanel from "./components/JobTitlesPanel";
import CorporateLinksPanel from "./components/CorporateLinksPanel";
import TemplatesPanel from "./components/TemplatesPanel";
import CompanySettingsPanel from "./components/CompanySettingsPanel";
import OrganizationStructurePanel from "./components/OrganizationStructurePanel";
import RolesPanel from "./components/RolesPanel";
import EmployeesPanel from "./components/EmployeesPanel";
import EmployeeDrawer from "./components/EmployeeDrawer";
import CardsPanel from "./components/CardsPanel";
import AnalyticsPanel from "./components/AnalyticsPanel";
import AuditPanel from "./components/AuditPanel";
import IntegrationsPanel from "./components/IntegrationsPanel";
import OverviewPanel from "./components/OverviewPanel";
import NetworkingPanel from "./components/NetworkingPanel";
import type {
  BulkInvitePreview,
  BulkInviteResults,
  Member,
  MemberActionTarget,
  Org,
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
import { fetchWithPanelTimeout } from "./domain/runtime";
import { useCorporatePanelLazyData } from "./hooks/useCorporatePanelLazyData";
import { useJobTitlesAndRequests } from "./hooks/useJobTitlesAndRequests";
import { useCorporateLinks } from "./hooks/useCorporateLinks";
import { useCorporateCards } from "./hooks/useCorporateCards";
import { getIdentityInitials } from "../../../lib/organizations/identity";
import { normalizeOrganizationRole, type OrganizationRole } from "../../../lib/organizations/permissions";
import { Alert } from "../../components/ui/DesignSystem";
import { useNotice, type NoticeTone } from "../../components/ui/NotificationCenter";

type OperationalAttention = {
  tone: "warning" | "critical";
  icon: Parameters<typeof Icon>[0]["name"];
  title: string;
  description: string;
  action: string;
  tab: CorporatePanelTab;
};

function messageNoticeTone(message: string): NoticeTone {
  const normalized = message.toLocaleLowerCase("tr-TR");
  if (/(kaydedilemedi|başlatılamadı|güncellenemedi|giriş yapmalısın|tamamlanamadı|yüklenemedi|başarısız)/.test(normalized)) return "error";
  if (/(ancak|uyarı|bekleniyor|kontrol)/.test(normalized)) return "warning";
  return "success";
}

export default function CompanyPanel({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { notify } = useNotice();
  const previouslyNotifiedMessage = useRef("");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [selected, setSelected] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [organizationSeatUsage, setOrganizationSeatUsage] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingSlow, setLoadingSlow] = useState(false);
  const [dataErrors, setDataErrors] = useState<Partial<Record<CorporatePanelTab, string>>>({});

  useEffect(() => {
    if (!message) {
      previouslyNotifiedMessage.current = "";
      return;
    }
    if (previouslyNotifiedMessage.current === message) return;
    previouslyNotifiedMessage.current = message;
    notify({ tone: messageNoticeTone(message), title: "Kurumsal panel", message });
  }, [message, notify]);

  const setDataError = (tab: CorporatePanelTab, error: string | null) => {
    setDataErrors((current) => {
      const next = { ...current };
      if (error) next[tab] = error;
      else delete next[tab];
      return next;
    });
  };
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [template, setTemplate] = useState({
    name: "Kurumsal Standart",
    primaryColor: "#17121f",
    logoUrl: "",
  });
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
    const requestedRole = normalizeOrganizationRole(searchParams.get("role"));
    const bulkInviteRequested = searchParams.get("bulkInvite") === "1";
    if (routed) setActiveTab(routed);
    else if (isCorporatePanelTab(requested)) setActiveTab(requested);
    setRoleFilter(routed === "employees" && requestedRole ? requestedRole : "ALL");
    setShowBulkInvite(routed === "employees" && bulkInviteRequested);
    window.sessionStorage.setItem("yenomi-active-portal", "business");
  }, [pathname, searchParams]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState<OrganizationRole | "ALL">("ALL");
  const [viewedProfile, setViewedProfile] = useState<ViewedMemberProfile | null>(null);
  const [viewLoading, setViewLoading] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
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
    const { accessToken, userId } = await getBrowserSession();
    if (userId) setCurrentUserId(userId);
    return accessToken;
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

  const {
    physicalCards,
    productionSummary,
    memberCardStatuses,
    cardAnalytics,
    analyticsDays,
    setAnalyticsDays,
    cardBusy,
    loadPhysicalCards,
    loadMemberCardStatuses,
    loadCardAnalytics,
    exportAnalyticsCsv,
    linkReplacementCard,
    toggleCardStatus,
    resetCardsData,
  } = useCorporateCards(selected, token, setMessage, setDataError);

  async function loadMembers(id: string, access?: string) {
    const auth = access || (await token());
    if (!auth) return;
    const response = await fetchWithPanelTimeout(
      `/api/organizations/members?organizationId=${id}`,
      { headers: { authorization: `Bearer ${auth}` }, cache: "no-store" },
    );
    const membersPayload = await response.json();
    if (response.ok) {
      setMembers(membersPayload.members || []);
      if (typeof membersPayload.seatUsage?.used === "number") setOrganizationSeatUsage(membersPayload.seatUsage.used);
      setDataError("employees", null);
    } else {
      const detail = membersPayload.error || "Çalışanlar yüklenemedi.";
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
    const templatesPayload = await response.json();
    if (response.ok) {
      setTemplates(templatesPayload.templates || []);
      setDataError("templates", null);
      const current =
        templatesPayload.templates?.find((item: Template) => item.is_default) ||
        templatesPayload.templates?.[0];
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
      setDataError("templates", templatesPayload.error || "Kurumsal şablonlar yüklenemedi.");
    }
  }

  const { loadDataForTab } = useCorporatePanelLazyData({
    members: loadMembers,
    templates: loadTemplates,
    physicalCards: loadPhysicalCards,
    memberCardStatuses: loadMemberCardStatuses,
    analytics: (id, access) => loadCardAnalytics(id, access),
    jobTitles: loadJobTitles,
    titleRequests: loadTitleRequests,
    corporateLinks: loadCorporateLinks,
  });

  function selectOrganization(id: string) {
    setSelected(id);
    setViewedProfile(null);
    setMembers([]);
    setOrganizationSeatUsage(null);
    setTemplates([]);
    resetCardsData();
    setLoading(true);
    setLoadingSlow(false);
    setDataErrors({});
    void (async () => {
      try {
        const access = await token();
        if (!access) return;
        await loadDataForTab(currentTab, id, access, true);
      } finally {
        setLoading(false);
      }
    })();
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
      const memberProfilePayload = await response.json();
      if (!response.ok) {
        setMessage(memberProfilePayload.error || "Kart görüntülenemedi.");
        return;
      }
      setViewedProfile({
        memberId: member.id,
        memberName: member.full_name || member.email,
        memberStatus: member.status,
        profiles: memberProfilePayload.profiles || [],
        physicalCards: memberProfilePayload.physicalCards || [],
        identityChanges: memberProfilePayload.identityChanges || [],
      });
    } finally {
      setViewLoading(null);
    }
  }

  const loadingLabel = CORPORATE_PANEL_TAB_META[activeTab].loadingLabel;

  async function reloadPanelData() {
    setLoading(true);
    setLoadingSlow(false);
    setDataErrors({});
    setMessage("");
    try {
      const access = await token();
      if (!access) {
        setMessage("Kurumsal panel için giriş yapmalısın.");
        setLoading(false);
        return;
      }
      const response = await fetchWithPanelTimeout("/api/organizations/mine?management=true", {
        headers: { authorization: `Bearer ${access}` },
        cache: "no-store",
      });
      const organizationsPayload = await response.json();
      if (!response.ok) {
        if (response.status === 403) {
          router.replace("/kartim");
          return;
        }
        if (response.status === 401) {
          router.replace("/giris?portal=business&next=%2Fkurumsal%2Fpanel");
          return;
        }
        setLoading(false);
        return;
      }
      const nextOrgs = organizationsPayload.organizations || [];
      setOrgs(nextOrgs);
      const preferredOrgId = searchParams.get("organizationId");
      const matchedOrg = preferredOrgId ? (nextOrgs.find((item: Org) => item.organization_id === preferredOrgId) || nextOrgs[0]) : nextOrgs[0];
      const id = matchedOrg?.organization_id || "";
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
      await loadDataForTab(currentTab, id, access, true);
    } catch {
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
          setLoading(false);
          return;
        }
        const response = await fetchWithPanelTimeout("/api/organizations/mine?management=true", {
          headers: { authorization: `Bearer ${access}` },
          cache: "no-store",
        });
        const organizationsPayload = await response.json();
        if (!response.ok) {
          // Yönetim paneli yalnız OWNER / ADMIN / HR içindir.
          // EMPLOYEE'yi boş-şirket ekranında bırakmak yerine Kartım'a götür.
          if (response.status === 403) {
            redirecting = true;
            router.replace("/kurumsal/panel/kartim");
            return;
          }
          if (response.status === 401) {
            redirecting = true;
            router.replace("/giris?portal=business&next=%2Fkurumsal%2Fpanel");
            return;
          }
          setMessage("");
          setLoading(false);
          return;
        }
        const nextOrgs = organizationsPayload.organizations || [];
        setOrgs(nextOrgs);
        const preferredOrgId = searchParams.get("organizationId");
        const matchedOrg = preferredOrgId ? (nextOrgs.find((item: Org) => item.organization_id === preferredOrgId) || nextOrgs[0]) : nextOrgs[0];
        const id = matchedOrg?.organization_id || "";
        setSelected(id);
        if (id) {
          // Organizasyon bulunduğu anda panel shell'i açılır. Her veri bloğu
          // kendi sonucunu gösterebilir; aggregate timeout yalnızca uyarıdır.
          setLoading(false);
          await loadDataForTab(currentTab, id, access);
        } else {
          setLoading(false);
        }
      } catch {
        setMessage("");
      } finally {
        if (!redirecting) setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selected || loading) return;
    let cancelled = false;
    void token().then(async (access) => {
      if (!access || cancelled) return;
      await loadDataForTab(currentTab, selected, access);
    });
    return () => { cancelled = true; };
  }, [currentTab, selected, loading]);

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
    const newMemberPayload = await response.json();
    if (!response.ok) {
      setMessage(newMemberPayload.error || "Çalışan eklenemedi.");
      return;
    }
    setMembers((current) => [...current, newMemberPayload.member]);
    setForm({
      email: "",
      firstName: "",
      lastName: "",
      title: "",
      department: "",
      role: "EMPLOYEE",
    });
    setMessage(
      newMemberPayload.emailSent === false
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
            line: row.line,
            email: row.email,
            fullName: row.fullName,
            title: row.title,
            department: row.department,
            role: row.role,
          })),
        }),
      });
      const bulkInvitePayload = await response.json();
      if (!response.ok) {
        setMessage(bulkInvitePayload.error || "Toplu davet işlenemedi.");
        return;
      }
      setBulkInviteResults(bulkInvitePayload);
      if (bulkInvitePayload.created > 0) await loadMembers(selected, access || undefined);
      setMessage(`Toplu davet tamamlandı: ${bulkInvitePayload.created} başarılı, ${bulkInvitePayload.failed} başarısız.`);
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
    const launchFields = { ...companyFields, templateVariant: "ESSENTIAL" };
    setCompanyFields(launchFields);
    const existingDefault = templates.find((item) => item.is_default);
    // Aktif/varsayılan şablon zaten kayıtlıysa YERİNDE güncelle (PATCH) —
    // her kaydetmede yeni satır biriktirmemek için. Hiç şablon yoksa (ilk
    // kurulum) POST ile oluşturup anında varsayılan yap.
    const response = existingDefault
      ? await fetch("/api/organizations/templates", {
          method: "PATCH",
          headers: { "content-type": "application/json", authorization: `Bearer ${access}` },
          body: JSON.stringify({ templateId: existingDefault.id, ...template, fields: launchFields }),
        })
      : await fetch("/api/organizations/templates", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${access}` },
          body: JSON.stringify({ organizationId: selected, ...template, fields: launchFields, isDefault: true }),
        });
    const templatePayload = await response.json();
    if (response.ok) {
      setTemplates((current) => {
        const next = current.filter((item) => item.id !== templatePayload.template.id);
        return [templatePayload.template, ...next].sort((a, b) => Number(b.is_default) - Number(a.is_default));
      });
      setProfileDirty(false);
      setProfileSaved(true);
      setMessage("Varsayılan kurumsal şablon güncellendi.");
    } else {
      setProfileError(templatePayload.error || "Şablon kaydedilemedi.");
      setMessage(templatePayload.error || "Şablon kaydedilemedi.");
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
    setMessage("");
    const response = await fetch(path, {
      method,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({ organizationId: selected, memberId, ...body }),
    });
    const mutationPayload = await response.json();
    if (!response.ok) {
      setMessage(mutationPayload.error || "İşlem tamamlanamadı.");
      return null;
    }
    if (mutationPayload.warning) setMessage(mutationPayload.warning);
    return mutationPayload;
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
  const canManageLicenses = org?.role === "OWNER" || org?.role === "ADMIN";
  const canInvite = availableSeats == null || availableSeats > 0;
  const unassignedPhysicalCards = useMemo(
    () => countMembersWithoutPhysicalAssignment(members, physicalCards),
    [members, physicalCards],
  );
  const incompleteProfiles = Math.max(0, activeMembers - digitalCardsReady);
  const operationalAttention: OperationalAttention | null = !org || loading
    ? null
    : unassignedPhysicalCards > 0
      ? {
          tone: "warning",
          icon: "contact",
          title: `${unassignedPhysicalCards} fiziksel kart atama bekliyor`,
          description: "Kartları ilgili çalışanlarla eşleştirerek dağıtım sürecini tamamlayın.",
          action: "Kart atamalarına git",
          tab: "cards",
        }
      : availableSeats === 0
        ? {
            tone: "critical",
            icon: "alert",
            title: "Kart kapasitesi dolu",
            description: "Yeni çalışan eklemek için önce kullanılabilir kart kapasitesi açılması gerekiyor.",
            action: canManageLicenses ? "Kapasiteyi artır" : "Ekibi görüntüle",
            tab: canManageLicenses ? "cards" : "employees",
          }
        : invitedMembers > 0
          ? {
              tone: "warning",
              icon: "mail",
              title: `${invitedMembers} çalışan davetini bekliyor`,
              description: "Bekleyen davetleri kontrol ederek ekip kurulumunu tamamlayın.",
              action: "Davetleri görüntüle",
              tab: "employees",
            }
          : incompleteProfiles > 0
            ? {
                tone: "warning",
                icon: "contact",
                title: `${incompleteProfiles} çalışan kartını tamamlamadı`,
                description: "Eksik profil alanlarını tamamlayarak dijital kartları yayına hazır hale getirin.",
                action: "Çalışanları görüntüle",
                tab: "employees",
              }
            : null;
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
        const matchesRole =
          roleFilter === "ALL" || normalizeOrganizationRole(member.role) === roleFilter;
        return (
          matchesText &&
          matchesDepartment &&
          matchesRole &&
          (statusFilter === "ALL" || member.status === statusFilter)
        );
      }),
    [members, search, statusFilter, departmentFilter, roleFilter],
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
      const memberIdentityPayload = await response.json();
      if (!response.ok) {
        setMessage(memberIdentityPayload.error || "Çalışan bilgileri güncellenemedi.");
        return;
      }
      setMembers((current) =>
        current.map((member) =>
          member.id === drawerMember.id
            ? { ...member, ...memberIdentityPayload.member }
            : member,
        ),
      );
      setMessage(
        memberIdentityPayload.inviteRenewed
          ? memberIdentityPayload.emailSent === false
            ? "Bilgiler güncellendi. Yeni davet oluşturuldu ancak e-posta gönderilemedi."
            : "Bilgiler güncellendi ve yeni e-posta adresine davet gönderildi."
          : "Çalışan bilgileri güncellendi.",
      );
    } finally {
      setMemberEditBusy(false);
    }
  }

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
    audit: "/kurumsal/panel/denetim",
    integrations: "/kurumsal/panel/entegrasyonlar",
    analytics: "/kurumsal/panel/istatistikler",
    leads: "/kurumsal/panel/leadler",
    events: "/kurumsal/panel/etkinlikler",
    meetings: "/kurumsal/panel/gorusmeler",
    organization: "/kurumsal/panel/organizasyon",
    settings: "/kurumsal/panel/ayarlar",
  };
  const tabMeta: Record<CorporatePanelTab, { title: string; description: string; icon: Parameters<typeof Icon>[0]["name"] }> = {
    overview: { title: "Genel Bakış", description: "Şirket sağlığını, kart kapasitesini ve kart operasyonlarını tek ekrandan izle.", icon: "building" },
    employees: { title: "Çalışanlar", description: "Ekibini, davetleri ve kart yaşam döngüsünü buradan yönet.", icon: "users" },
    cards: { title: "Kartlar", description: "Fiziksel ve dijital kart durumlarını tek yerde yönet.", icon: "id" },
    roles: { title: "Roller & Yetkiler", description: "Kurumsal yetki sınırlarını ve rol dağılımını kontrol et.", icon: "lock" },
    templates: { title: "Marka & Şablon", description: "Kurumsal kart görünümünü ve marka standartlarını merkezi olarak yönet.", icon: "id" },
    content: { title: "İçerik", description: "Merkezi bağlantıları ve kurumsal dosyaları çalışan kartlarına dağıt.", icon: "link" },
    audit: { title: "Güvenlik & Denetim", description: "Kurumsal yönetim işlemlerini zaman damgalı ve değiştirilemez kayıtlarla izle.", icon: "shield" },
    integrations: { title: "Entegrasyonlar", description: "Karttan doğan lead ve görüşmeleri CRM’inize güvenli biçimde aktarın.", icon: "link" },
    analytics: { title: "İstatistikler", description: "Kart görüntülenmelerini ve içerik etkileşimlerini gerçek verilerle izle.", icon: "analytics" },
    leads: { title: "Leadler", description: "Karttan düşen networking lead’lerini, mail ve görüşme takibini yönet.", icon: "mail" },
    events: { title: "Etkinlik kampanyaları", description: "Fuar ve saha temaslarını ekibe, QR kullanımına ve gelen lead’lere göre izleyin.", icon: "clock" },
    meetings: { title: "Görüşmeler", description: "Online ve yüz yüze görüşme taleplerini kabul et, alternatif öner veya reddet.", icon: "headset" },
    organization: { title: "Organizasyon", description: "Şirket kimliği, alan politikaları ve ünvan standardını yönet.", icon: "building" },
    settings: { title: "Ayarlar", description: "Sık değişmeyen kurumsal yönetim alanlarına ulaş.", icon: "adjustments" },
  };
  const pageOwnsTitle = true;
  const openTab = (tab: CorporatePanelTab) => {
    const allowed = !org || corporateSidebarItems(org.role).some((item) => item.key === tab);
    if (!allowed) {
      const fallback = "overview";
      setActiveTab(fallback);
      setMobileNavOpen(false);
      router.replace(tabRoutes[fallback]);
      return;
    }
    setActiveTab(tab);
    setMobileNavOpen(false);
    router.push(tabRoutes[tab]);
  };
  const openRoleMembers = (role: OrganizationRole) => {
    setSearch("");
    setDepartmentFilter("ALL");
    setStatusFilter("ALL");
    setRoleFilter(role);
    setShowInviteForm(false);
    setMobileNavOpen(false);
    setActiveTab("employees");
    router.push(`${tabRoutes.employees}?role=${role}`);
  };
  const openInviteFromRoles = () => {
    setRoleFilter("ALL");
    setShowInviteForm(true);
    setMobileNavOpen(false);
    setActiveTab("employees");
    router.push(tabRoutes.employees);
  };

  useEffect(() => {
    if (!org) return;
    const allowed = corporateSidebarItems(org.role);
    if (allowed.length === 0) return;
    if (allowed.some((item) => item.key === currentTab)) return;
    const fallback = "overview";
    setActiveTab(fallback);
    router.replace(tabRoutes[fallback]);
  }, [currentTab, org, router]);
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
  const templatePreviewMember =
    members.find((member) => member.status === "ACTIVE") || members[0];
  const templatePreviewBranding: CardBranding = {
    logoUrl: template.logoUrl || null,
    primaryColor: template.primaryColor || null,
    companyName: org?.organizations?.name || "Şirketiniz",
    variant: "ESSENTIAL",
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
        <IDSidebar
          role={org?.role}
          ownCardHref={ownCardEditorHref}
          user={sidebarUser ? {
            full_name: sidebarUser.full_name,
            email: sidebarUser.email,
            role: sidebarUser.role,
          } : null}
          subscription={subscription ? {
            name: subscription.business_plans?.name,
            usedSeats,
            seatLimit: subscription.seat_limit,
          } : null}
          canManageLicenses={canManageLicenses}
          onManageLicenses={() => openTab("cards")}
          onSignOut={signOut}
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          loading={loading || sidebarPermissionsLoading}
        />
        <section className="enterprise-dashboard-main">
          <div className="enterprise-mobile-commandbar">
            <button type="button" className="enterprise-mobile-menu-button" aria-label={mobileNavOpen ? "Menüyü kapat" : "Menüyü aç"} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((value) => !value)}>
              <Icon name={mobileNavOpen ? "close" : "menu"} />
              <span>Menü</span>
            </button>
            <div className="enterprise-mobile-current">
              <small>Yenomi ID · Kurumsal</small>
              <strong>{pathname.startsWith("/kurumsal/panel/kartim") ? "Kartım" : tabMeta[currentTab]?.title || "Kurumsal Panel"}</strong>
            </div>
            <button type="button" className="enterprise-mobile-account-button" aria-label="Hesap ve lisans bilgileri" onClick={() => setMobileNavOpen(true)}>
              <span>{(sidebarUser?.full_name || sidebarUser?.email || "Y").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
            </button>
          </div>
          {pathname.startsWith("/kurumsal/panel/kartim") ? (
            children
          ) : (
            <>
              <header className={`enterprise-topbar${pageOwnsTitle ? " enterprise-topbar--chrome" : ""}`}>
            <div className={pageOwnsTitle ? "sr-only" : undefined}>
              <h1>{tabMeta[currentTab].title}</h1>
              <p>{tabMeta[currentTab].description}</p>
            </div>
            <div className="enterprise-topbar-actions">
              {canManageLicenses && <button
                type="button"
                className="enterprise-quick-link"
                onClick={() => openTab("cards")}
              >
                Kartlar
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
                    {loading ? "—" : usedSeats} / {subscription?.seat_limit ?? "—"} kart
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
                    <ErrorState
                      title="Kurumsal veriler yüklenemedi"
                      description={visibleError}
                      onRetry={() => void reloadPanelData()}
                    />
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
                    canInvite={canInvite}
                    visibleTabs={tabs}
                    openTab={openTab}
                    onInvite={openInviteFromRoles}
                    openMemberDrawer={openMemberDrawer}
                    relativeTime={relativeTime}
                    onEditOwnCard={() => router.push(ownCardEditorHref)}
                    onExportCsv={exportAnalyticsCsv}
                  />
                )}
                {currentTab !== "overview" && operationalAttention && (
                  <section className={`enterprise-global-attention is-${operationalAttention.tone}`} role="status" aria-labelledby="enterprise-global-attention-title">
                    <span className="enterprise-global-attention__icon"><Icon name={operationalAttention.icon} /></span>
                    <div>
                      <strong id="enterprise-global-attention-title">{operationalAttention.title}</strong>
                      <p>{operationalAttention.description}</p>
                    </div>
                    <button type="button" onClick={() => openTab(operationalAttention.tab)}>{operationalAttention.action}<span aria-hidden="true">→</span></button>
                  </section>
                )}
                {message && <Alert tone={messageNoticeTone(message)} className="business-message">{message}</Alert>}

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
                    roleFilter={roleFilter}
                    setRoleFilter={setRoleFilter}
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
                    canBulkDepartment
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
                    template={template}
                    setTemplate={setTemplate}
                    previewBranding={templatePreviewBranding}
                    previewData={templatePreviewData}
                    activeTemplateName={templates.find((item) => item.is_default)?.name ?? null}
                    onSubmit={saveTemplate}
                  />
                )}
                {currentTab === "cards" && (
                  <CardsPanel
                    members={members}
                    physicalCards={physicalCards}
                    productionSummary={productionSummary}
                    memberCardStatuses={memberCardStatuses}
                    digitalCardsReady={digitalCardsReady}
                    capacityTerms={org?.organization_capacity_terms || []}
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
                {currentTab === "roles" && (
                  <RolesPanel
                    members={members}
                    canInvite={canInvite}
                    onInvite={openInviteFromRoles}
                    onRoleSelect={openRoleMembers}
                  />
                )}
                {currentTab === "organization" && (
                  <div className="p11-org-workspace">
                    <OrganizationStructurePanel
                      members={members}
                      onFilterDepartment={(dept) => {
                        setDepartmentFilter(dept);
                        openTab("employees");
                      }}
                    />
                    <CompanySettingsPanel
                    fields={companyFields}
                    setFields={(value) => {
                      setCompanyFields(value);
                      setProfileDirty(true);
                      setProfileSaved(false);
                    }}
                    onSubmit={saveTemplate}
                    legalProfile={org?.organizations || null}
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
                {currentTab === "audit" && selected && (
                  <AuditPanel organizationId={selected} token={token} />
                )}
                {currentTab === "integrations" && selected && (
                  <IntegrationsPanel organizationId={selected} token={token} />
                )}
              </>
            )}
          </section>
        </>
      )}
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
