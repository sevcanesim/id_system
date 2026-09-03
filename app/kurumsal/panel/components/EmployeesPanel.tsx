import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Icon } from "../../../icons";
import { EmptyState } from "../../../components/ui/States";
import { DEPARTMENT_OPTIONS, TITLE_OPTIONS, normalizeEmailField } from "../../../../lib/form-standards";
import { BULK_INVITE_CSV_TEMPLATE, isBulkInviteMailFailed } from "../../../../lib/organizations/bulk-invite";
import type { MemberActionTarget, MemberCardStatus } from "../domain/types";
import {
  digitalProfileLabel,
  getPhysicalCardState,
  memberStatusLabel,
  physicalCardLabel,
  type PhysicalCardStatus,
} from "../../../../lib/organizations/lifecycle";

export type EmployeeListMember = MemberActionTarget;

type PhysicalCard = {
  id: string;
  cardCodeMasked: string;
  status: PhysicalCardStatus;
  ownerUserId: string | null;
  activatedAt: string | null;
  lostAt: string | null;
  disabledAt: string | null;
  replacedByCardId: string | null;
};

type Subscription = {
  seat_limit: number;
  status: string;
  expires_at: string | null;
  business_plans: { name: string; code: string } | null;
};

type Org = {
  organization_id: string;
  role: string;
  department?: string | null;
  organizations: { id: string; name: string; slug: string; status: string } | null;
  organization_subscriptions?: Subscription[];
};

type InviteForm = {
  email: string;
  firstName: string;
  lastName: string;
  title: string;
  department: string;
  role: string;
};

type CorporateTab = "overview" | "employees" | "cards" | "roles" | "templates" | "content" | "analytics" | "organization" | "settings" | "leads" | "events" | "meetings";
type SortKey = "name" | "department" | "role" | "status" | "created";
type SortDirection = "asc" | "desc";
type BulkStatus = "ACTIVE" | "SUSPENDED" | "LEFT";

type RenewalState = {
  daysRemaining: number;
  label: string;
  urgent: boolean;
};

const PAGE_SIZE = 25;
const DAY_MS = 86400000;

type Props = {
  org: Org | null | undefined;
  subscription?: Subscription;
  usedSeats: number;
  availableSeats: number | null;
  canInvite: boolean;
  activeMembers: number;
  invitedMembers: number;
  digitalCardsReady: number;
  physicalCards: PhysicalCard[];
  totalMembers: number;
  filteredMembers: EmployeeListMember[];
  memberCardStatuses: MemberCardStatus[];
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  departmentFilter: string;
  setDepartmentFilter: Dispatch<SetStateAction<string>>;
  departmentOptions: string[];
  statusFilter: string;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  showInviteForm: boolean;
  setShowInviteForm: Dispatch<SetStateAction<boolean>>;
  setActiveTab: (tab: CorporateTab) => void;
  form: InviteForm;
  setForm: Dispatch<SetStateAction<InviteForm>>;
  add: (event: FormEvent) => void | Promise<void>;
  currentUserId: string;
  onEditOwnCard: () => void;
  initials: (member: EmployeeListMember) => string;
  roleLabel: (role: string) => string;
  relativeTime: (value: string) => string;
  openMemberDrawer: (member: EmployeeListMember, tab?: "profile" | "card" | "invite" | "lifecycle") => void;
  showBulkInvite: boolean;
  onToggleBulkInvite: () => void;
  onCloseBulkInvite: () => void;
  bulkInvitePreview: {
    fileName: string;
    rows: Array<{ line: number; email: string; fullName: string; title: string; department: string; role: string }>;
    errors: Array<{ line: number; error: string }>;
  } | null;
  bulkInviteBusy: boolean;
  bulkInviteResults: {
    created: number;
    failed: number;
    failedRowsCsvUrl?: string;
    auditHealthy?: boolean;
    results: Array<{ email: string; status: "created" | "error"; error?: string; emailSent?: boolean; memberId?: string }>;
  } | null;
  onBulkInviteFile: (file: File) => void | Promise<void>;
  onSubmitBulkInvite: () => void | Promise<void>;
  onBulkStatus: (memberIds: string[], status: BulkStatus) => Promise<void>;
  onBulkDepartment: (memberIds: string[], department: string) => Promise<void>;
  canBulkDepartment: boolean;
  canManageLicenses: boolean;
};

function isBulkSelectable(member: EmployeeListMember, currentUserId: string) {
  return member.user_id !== currentUserId && member.role !== "OWNER";
}

function compareText(a: string | null | undefined, b: string | null | undefined) {
  return String(a || "").localeCompare(String(b || ""), "tr", { sensitivity: "base" });
}

function getRenewalState(expiresAt: string | null | undefined): RenewalState | null {
  if (!expiresAt) return null;
  const expiresAtMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresAtMs)) return null;
  const daysRemaining = Math.ceil((expiresAtMs - Date.now()) / DAY_MS);
  if (daysRemaining < 0) return { daysRemaining, label: "Yıllık kart sistemi yenileme tarihi geçti", urgent: true };
  if (daysRemaining === 0) return { daysRemaining, label: "Yıllık kart sistemi bugün yenileniyor", urgent: true };
  return {
    daysRemaining,
    label: `Yıllık kart sistemi yenilemesine ${daysRemaining} gün kaldı`,
    urgent: daysRemaining <= 30,
  };
}

export default function EmployeesPanel(props: Props) {
  const {
    org, subscription, usedSeats, availableSeats, canInvite, activeMembers, invitedMembers,
    digitalCardsReady, physicalCards, totalMembers, filteredMembers, memberCardStatuses,
    search, setSearch, departmentFilter, setDepartmentFilter, departmentOptions,
    statusFilter, setStatusFilter, showInviteForm, setShowInviteForm, form,
    setForm, add, currentUserId, onEditOwnCard, initials, roleLabel, relativeTime,
    openMemberDrawer, showBulkInvite, onToggleBulkInvite, onCloseBulkInvite,
    bulkInvitePreview, bulkInviteBusy, bulkInviteResults, onBulkInviteFile,
    onSubmitBulkInvite, onBulkStatus, onBulkDepartment, canBulkDepartment, canManageLicenses,
  } = props;

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDepartment, setBulkDepartment] = useState("");
  const [pendingInviteEmail, setPendingInviteEmail] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const seatLimit = subscription?.seat_limit ?? "—";
  const renewalState = getRenewalState(subscription?.expires_at);
  const bulkMailFailed = bulkInviteResults?.results.filter(isBulkInviteMailFailed) ?? [];
  const suspendedSeats = Math.max(0, usedSeats - activeMembers - invitedMembers);
  const showP0Capacity = availableSeats === 0;
  const showP0Pending = invitedMembers > 0;
  const showP0Suspended = suspendedSeats > 0;
  const showRenewalAttention = renewalState?.urgent ?? false;
  const hasP0Attention = showP0Capacity || showP0Pending || showP0Suspended || showRenewalAttention;
  const hasActiveFilters = departmentFilter !== "ALL" || statusFilter !== "ALL" || sortKey !== "name" || sortDirection !== "asc";
  const bulkDepartmentChoices = useMemo(() => {
    const fromMembers = departmentOptions.filter((department) => department !== "Belirtilmemiş");
    return Array.from(new Set([...DEPARTMENT_OPTIONS, ...fromMembers])).sort((a, b) => compareText(a, b));
  }, [departmentOptions]);

  const sortedMembers = useMemo(() => {
    const next = [...filteredMembers];
    next.sort((a, b) => {
      const result = sortKey === "name" ? compareText(a.full_name || a.email, b.full_name || b.email)
        : sortKey === "department" ? compareText(a.department, b.department)
          : sortKey === "role" ? compareText(roleLabel(a.role), roleLabel(b.role))
            : sortKey === "status" ? compareText(memberStatusLabel(a.status), memberStatusLabel(b.status))
              : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDirection === "asc" ? result : -result;
    });
    return next;
  }, [filteredMembers, roleLabel, sortDirection, sortKey]);

  const pageCount = Math.max(1, Math.ceil(sortedMembers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageMembers = sortedMembers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, departmentFilter, statusFilter, sortKey, sortDirection]);
  useEffect(() => {
    setSelectedIds((current) => new Set([...current].filter((id) => filteredMembers.some((member) => member.id === id))));
  }, [filteredMembers]);
  useEffect(() => {
    if (!pendingInviteEmail) return;
    const member = filteredMembers.find((item) =>
      item.status === "INVITED"
      && item.email.trim().toLocaleLowerCase("tr") === pendingInviteEmail.trim().toLocaleLowerCase("tr"),
    );
    if (!member) return;
    openMemberDrawer(member, "invite");
    setPendingInviteEmail(null);
  }, [pendingInviteEmail, filteredMembers, openMemberDrawer]);

  const selectedMembers = useMemo(
    () => filteredMembers.filter((member) => selectedIds.has(member.id)),
    [filteredMembers, selectedIds],
  );
  const selectablePageMembers = pageMembers.filter((member) => isBulkSelectable(member, currentUserId));
  const pageAllSelected = selectablePageMembers.length > 0 && selectablePageMembers.every((member) => selectedIds.has(member.id));

  function toggleMember(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelectedIds((current) => {
      const next = new Set(current);
      selectablePageMembers.forEach((member) => pageAllSelected ? next.delete(member.id) : next.add(member.id));
      return next;
    });
  }

  function selectedBulkIds() {
    return selectedMembers.filter((member) => isBulkSelectable(member, currentUserId)).map((member) => member.id);
  }

  async function runBulkStatus(status: BulkStatus) {
    const ids = selectedBulkIds();
    if (!ids.length) return;
    const action = status === "ACTIVE" ? "aktif hale getirmek" : status === "SUSPENDED" ? "pasife almak" : "şirketten ayırmak";
    if (!window.confirm(`${ids.length} çalışanı ${action} istediğine emin misin?`)) return;
    setBulkBusy(true);
    try {
      await onBulkStatus(ids, status);
      setSelectedIds(new Set());
    } finally {
      setBulkBusy(false);
    }
  }

  async function runBulkDepartment() {
    const ids = selectedBulkIds();
    const department = bulkDepartment.trim();
    if (!ids.length || !department) return;
    if (!window.confirm(`${ids.length} çalışanın departmanını “${department}” olarak güncellemek istediğine emin misin?`)) return;
    setBulkBusy(true);
    try {
      await onBulkDepartment(ids, department);
      setSelectedIds(new Set());
      setBulkDepartment("");
    } finally {
      setBulkBusy(false);
    }
  }

  function openProfile(member: EmployeeListMember) {
    if (member.user_id === currentUserId) onEditOwnCard();
    else openMemberDrawer(member, member.status === "INVITED" ? "invite" : "profile");
  }

  function openFailedBulkInvite(email: string, memberId?: string) {
    const member = filteredMembers.find((item) => {
      if (item.status !== "INVITED") return false;
      if (memberId && item.id === memberId) return true;
      return item.email.trim().toLocaleLowerCase("tr") === email.trim().toLocaleLowerCase("tr");
    });
    if (member) {
      openMemberDrawer(member, "invite");
      return;
    }
    setSearch(email);
    setStatusFilter("INVITED");
    setPendingInviteEmail(email);
  }

  function sortBy(next: SortKey) {
    if (sortKey === next) setSortDirection((value) => value === "asc" ? "desc" : "asc");
    else { setSortKey(next); setSortDirection("asc"); }
  }

  function sortState(column: SortKey): "ascending" | "descending" | "none" {
    if (sortKey !== column) return "none";
    return sortDirection === "asc" ? "ascending" : "descending";
  }

  function sortHeader(column: SortKey, label: string) {
    const state = sortState(column);
    return (
      <th aria-sort={state}>
        <button type="button" className="p11-sort" onClick={() => sortBy(column)}>
          {label}
          <span className="p11-sort-indicator" aria-hidden="true">{state === "none" ? "" : state === "ascending" ? "↑" : "↓"}</span>
        </button>
      </th>
    );
  }

  return (
    <section className="p11-employees" aria-labelledby="p11-employees-title">
      <header className="p11-employees-header">
        <div>
          <span>EKİP YÖNETİMİ</span>
          <h2 id="p11-employees-title">Çalışanlar</h2>
          <p>Çalışan kimliğini, davet durumunu ve dijital/fiziksel kart yaşam döngüsünü tek ekrandan yönet.</p>
        </div>
        <div className="p11-org-capacity" aria-label="Organizasyon kapasitesi ve yenileme durumu">
          <small>{org?.organizations?.name || "Şirket"}</small>
          <strong>{usedSeats} / {seatLimit}</strong>
          <span>{availableSeats === 0 ? "Kapasite dolu" : `${availableSeats ?? "—"} kart boş`}</span>
          {renewalState && (
            <small className={`p11-renewal-status${renewalState.urgent ? " is-urgent" : ""}`}>
              <Icon name="clock" /> {renewalState.label}
            </small>
          )}
          {suspendedSeats > 0 && (
            <small className="p11-seat-policy">
              {suspendedSeats} pasif çalışan kart kapasitesini kullanmaya devam eder. Kapasiteyi boşaltmak için çalışanı şirketten ayırın.
            </small>
          )}
        </div>
      </header>

      {hasP0Attention && (
        <section className="p11-operational-attention" aria-label="Operasyonel dikkat bildirimleri">
          {showP0Capacity && (
            <article key="p0-capacity" className="p11-attention-item p11-attention-item--urgent">
              <div className="p11-attention-content">
                <Icon name="box" />
                <div>
                  <strong>Kart kapasitesi doldu</strong>
                  <p>Yeni çalışan eklemek için kart kapasitesini artırın veya kullanılmayan bir kart hakkını boşaltın.</p>
                </div>
              </div>
              {canManageLicenses && (
                <a className="p11-attention-cta" href="/kurumsal#kapasite">
                  Kapasiteyi artır
                </a>
              )}
            </article>
          )}
          {showP0Pending && (
            <article key="p0-pending" className="p11-attention-item p11-attention-item--warning">
              <div className="p11-attention-content">
                <Icon name="mail" />
                <div>
                  <strong>{invitedMembers} davet yanıt bekliyor</strong>
                </div>
              </div>
              <button type="button" className="p11-attention-cta" onClick={() => setStatusFilter("INVITED")}>
                Bekleyen Davetleri Göster
              </button>
            </article>
          )}
          {showP0Suspended && (
            <article key="p0-suspended" className="p11-attention-item p11-attention-item--info">
              <div className="p11-attention-content">
                <Icon name="users" />
                <div>
                  <strong>{suspendedSeats} pasif çalışan lisans kullanıyor</strong>
                  <p>Pasif çalışanlar lisans tüketmeye devam eder. Lisansı boşaltmak için çalışanı şirketten ayırın.</p>
                </div>
              </div>
              <button type="button" className="p11-attention-cta" onClick={() => setStatusFilter("SUSPENDED")}>
                Pasif Çalışanları Göster
              </button>
            </article>
          )}
          {showRenewalAttention && renewalState && (
            <article key="p0-renewal" className="p11-attention-item p11-attention-item--warning">
              <div className="p11-attention-content">
                <Icon name="clock" />
                <div>
                  <strong>{renewalState.label}</strong>
                  <p>Yıllık kullanım süresi yaklaşırken kart erişiminin kesintisiz devam etmesi için yenileme bilgisini kontrol edin.</p>
                </div>
              </div>
              {canManageLicenses && (
                <a className="p11-attention-cta" href="/kurumsal#kapasite">
                  Yıllık planları gör
                </a>
              )}
            </article>
          )}
        </section>
      )}

      <div className="p11-kpis">
        <article><small>Aktif çalışan</small><strong>{activeMembers}</strong><span>Şu anda erişimi açık</span></article>
        <article><small>Bekleyen davet</small><strong>{invitedMembers}</strong><span>Henüz kabul edilmedi</span></article>
        <article><small>Dijital kart hazır</small><strong>{digitalCardsReady}</strong><span>Profil oluşturuldu</span></article>
        <article><small>Aktif fiziksel kart</small><strong>{physicalCards.filter((card) => card.status === "ACTIVE" && Boolean(card.ownerUserId)).length}</strong><span>Kullanıma açık</span></article>
      </div>

      <section className="p11-employee-card">
        <div className="p11-toolbar">
          <div className="p11-toolbar-main">
            <label className="p11-search"><Icon name="search" /><input aria-label="Çalışan ara" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ad, e-posta, ünvan ara" /></label>
            <div className="p11-toolbar-actions-main">
              <button
                type="button"
                className="p11-mobile-filter-toggle"
                aria-expanded={mobileFiltersOpen}
                aria-label="Filtreler ve ek işlemler"
                onClick={() => setMobileFiltersOpen((value) => !value)}
              >
                <Icon name="adjustments" />
                <span>Filtreler</span>
                {hasActiveFilters && <span className="p11-filter-active-dot" aria-hidden="true" />}
              </button>
              {canInvite && (
                <button type="button" className="p11-primary p11-primary-mobile-sticky" onClick={() => setShowInviteForm((value) => !value)}><Icon name="users" /> Çalışan Ekle</button>
              )}
            </div>
          </div>

          <div className={`p11-toolbar-secondary${mobileFiltersOpen ? " is-open" : ""}`}>
            <select aria-label="Departman filtresi" className="p11-filter-control" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
              <option value="ALL">Tüm departmanlar</option>{departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
            </select>
            <select aria-label="Durum filtresi" className="p11-filter-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">Tüm durumlar</option><option value="ACTIVE">Aktif</option><option value="INVITED">Davet bekliyor</option><option value="SUSPENDED">Pasif</option><option value="LEFT">Ayrıldı</option>
            </select>
            <select aria-label="Sıralama" className="p11-filter-control" value={`${sortKey}:${sortDirection}`} onChange={(event) => { const [key, direction] = event.target.value.split(":") as [SortKey, SortDirection]; setSortKey(key); setSortDirection(direction); }}>
              <option value="name:asc">Ad A–Z</option><option value="name:desc">Ad Z–A</option><option value="created:desc">En yeni</option><option value="created:asc">En eski</option><option value="department:asc">Departman</option><option value="status:asc">Durum</option>
            </select>
            {canInvite && (
              <button type="button" className="p11-secondary" onClick={onToggleBulkInvite}><Icon name="box" /> CSV ile Davet</button>
            )}
          </div>
        </div>

        {showBulkInvite && canInvite && (
          <div className="p11-invite-panel">
            <header><div><strong>CSV ile toplu davet</strong><p>E-posta ve ad soyad zorunludur. Ünvan, departman ve rol isteğe bağlıdır.</p></div><button type="button" onClick={onCloseBulkInvite} aria-label="Toplu daveti kapat"><Icon name="close" /></button></header>
            <div className="p11-invite-actions">
              <a download="yenomi-toplu-davet-sablonu.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(BULK_INVITE_CSV_TEMPLATE)}`}><Icon name="box" /> Şablon indir</a>
              <label><Icon name="box" /> CSV seç<input type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onBulkInviteFile(file); event.target.value = ""; }} /></label>
            </div>
            {bulkInvitePreview && <div className="p11-bulk-preview"><p><strong>{bulkInvitePreview.fileName}</strong> · {bulkInvitePreview.rows.length} geçerli · {bulkInvitePreview.errors.length} hatalı</p>{bulkInvitePreview.errors.length > 0 && <ul>{bulkInvitePreview.errors.slice(0, 8).map((item) => <li key={item.line}>Satır {item.line}: {item.error}</li>)}</ul>}{bulkInvitePreview.rows.length > 0 && <><div className="p11-bulk-invite-table" role="region" aria-label="Toplu davet önizlemesi" tabIndex={0}><table><thead><tr><th>Ad Soyad</th><th>E-posta</th><th>Departman</th><th>Ünvan</th><th>Rol</th></tr></thead><tbody>{bulkInvitePreview.rows.slice(0, 12).map((row) => <tr key={`${row.line}-${row.email}`}><td>{row.fullName || "—"}</td><td>{row.email}</td><td>{row.department || "—"}</td><td>{row.title || "—"}</td><td>{row.role}</td></tr>)}</tbody></table></div>{bulkInvitePreview.rows.length > 12 && <p className="p11-bulk-more">İlk 12 kayıt gösteriliyor. Toplam {bulkInvitePreview.rows.length} geçerli kayıt.</p>}<button type="button" disabled={bulkInviteBusy} onClick={() => void onSubmitBulkInvite()}>{bulkInviteBusy ? "Gönderiliyor…" : `${bulkInvitePreview.rows.length} çalışanı davet et`}</button></>}</div>}
            {bulkInviteResults && (
              <div className="p11-bulk-result">
                <p>
                  <strong>{bulkInviteResults.created}</strong> davet oluşturuldu · <strong>{bulkInviteResults.failed}</strong> başarısız
                  {bulkMailFailed.length > 0 ? ` · ${bulkMailFailed.length} e-posta gönderilemedi` : ""}
                </p>
                {bulkInviteResults.failedRowsCsvUrl && (bulkInviteResults.failed > 0 || bulkMailFailed.length > 0) && (
                  <a className="p11-secondary" href={bulkInviteResults.failedRowsCsvUrl}>Başarısız kayıtları CSV indir</a>
                )}
                {bulkInviteResults.auditHealthy === false && (
                  <p role="alert">Davetler işlendi ancak audit kayıtlarının bir kısmı doğrulanamadı. Operasyon ekibinin incelemesi gerekiyor.</p>
                )}
                {bulkMailFailed.length > 0 && (
                  <ul className="p11-bulk-mail-failed">
                    {bulkMailFailed.map((row) => (
                      <li key={row.email}>
                        <span>{row.email} — davet kaydı oluştu ama e-posta gitmedi. Lisans rezerve.</span>
                        <button type="button" className="p11-secondary" onClick={() => openFailedBulkInvite(row.email, row.memberId)}>Yeniden gönder</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {showInviteForm && canInvite && (
          <form className="p11-single-invite" onSubmit={add}>
            <header><div><strong>Yeni çalışan daveti</strong><p>Minimum bilgiyle davet oluştur; çalışan izin verilen profil alanlarını daha sonra tamamlar.</p></div><button type="button" onClick={() => setShowInviteForm(false)} aria-label="Davet formunu kapat"><Icon name="close" /></button></header>
            <div className="p11-form-grid">
              <label>Ad<input required value={form.firstName} onChange={(event) => setForm((value) => ({ ...value, firstName: event.target.value }))} /></label>
              <label>Soyad<input required value={form.lastName} onChange={(event) => setForm((value) => ({ ...value, lastName: event.target.value }))} /></label>
              <label>E-posta<input type="email" required value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} onBlur={() => setForm((value) => ({ ...value, email: normalizeEmailField(value.email) }))} /></label>
              <label>Rol<select value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value }))}><option value="EMPLOYEE">{roleLabel("EMPLOYEE")}</option>{org?.role !== "HR" && <option value="HR">{roleLabel("HR")}</option>}{org?.role === "OWNER" && <option value="ADMIN">{roleLabel("ADMIN")}</option>}</select></label>
              <label>Ünvan<input list="p11-title-options" value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="Seç veya yaz" /></label>
              <label>Departman<input list="p11-department-options" value={form.department} onChange={(event) => setForm((value) => ({ ...value, department: event.target.value }))} placeholder="Seç veya yaz" /></label>
              <datalist id="p11-title-options">{TITLE_OPTIONS.map((item) => <option key={item} value={item} />)}</datalist>
              <datalist id="p11-department-options">{DEPARTMENT_OPTIONS.map((item) => <option key={item} value={item} />)}</datalist>
            </div>
            <footer><span>{availableSeats === 0 ? "Yeni çalışan için ek lisans gerekli." : `${availableSeats ?? "—"} kart boş`}</span><button type="submit" className="p11-primary" disabled={availableSeats === 0}><Icon name="mail" /> Daveti Gönder</button></footer>
          </form>
        )}

        {selectedIds.size > 0 && (
          <div className="p11-bulk-bar" role="region" aria-label="Toplu çalışan işlemleri">
            <div className="p11-bulk-bar-copy">
              <strong>{selectedIds.size} çalışan seçildi</strong>
              <span>Toplu işlem yalnız yetkin olan kayıtlar için uygulanır.</span>
            </div>
            <div className="p11-bulk-bar-actions">
              <button type="button" disabled={bulkBusy} onClick={() => void runBulkStatus("ACTIVE")}>Aktifleştir</button>
              <button type="button" disabled={bulkBusy} onClick={() => void runBulkStatus("SUSPENDED")}>Pasife Al</button>
              {canBulkDepartment && (
                <label className="p11-bulk-department">
                  <span className="sr-only">Toplu departman</span>
                  <select aria-label="Toplu departman" value={bulkDepartment} disabled={bulkBusy} onChange={(event) => setBulkDepartment(event.target.value)}>
                    <option value="">Departman seç</option>
                    {bulkDepartmentChoices.map((department) => <option key={department} value={department}>{department}</option>)}
                  </select>
                  <button type="button" disabled={bulkBusy || !bulkDepartment} onClick={() => void runBulkDepartment()}>Departmanı Uygula</button>
                </label>
              )}
              <button type="button" className="danger" disabled={bulkBusy} onClick={() => void runBulkStatus("LEFT")}>Şirketten Ayır</button>
              <button type="button" disabled={bulkBusy} onClick={() => setSelectedIds(new Set())}>Seçimi Temizle</button>
            </div>
          </div>
        )}

        <div className="p11-table-summary"><div><strong>{filteredMembers.length}</strong><span>gösterilen kayıt</span>{filteredMembers.length !== totalMembers && <small>{totalMembers} toplam</small>}</div><span>Sayfa {currentPage} / {pageCount}</span></div>

        <div className="p11-table-wrap">
          <table className="p11-table">
            <thead><tr><th className="select"><input type="checkbox" aria-label="Bu sayfadaki çalışanları seç" checked={pageAllSelected} onChange={togglePage} /></th>{sortHeader("name", "Çalışan")}{sortHeader("department", "Departman")}{sortHeader("role", "Rol")}<th>Dijital Kart</th><th>Fiziksel Kart</th>{sortHeader("status", "Durum")}{sortHeader("created", "Eklenme")}<th className="actions">İşlem</th></tr></thead>
            <tbody>
              {pageMembers.map((member) => {
                const cardState = memberCardStatuses.find((item) => item.memberId === member.id);
                const assignedCards = physicalCards.filter((card) => Boolean(member.user_id) && card.ownerUserId === member.user_id);
                const physicalState = cardState?.physicalCardState ?? getPhysicalCardState(assignedCards);
                const selectable = isBulkSelectable(member, currentUserId);
                return <tr key={member.id} data-status={member.status}>
                  <td className="select"><input type="checkbox" aria-label={`${member.full_name || member.email} seç`} checked={selectedIds.has(member.id)} disabled={!selectable} onChange={() => toggleMember(member.id)} /></td>
                  <td><button className="p11-person" type="button" aria-label={`${member.full_name || member.email} detayını aç`} onClick={() => openProfile(member)}><span>{initials(member)}</span><i><strong>{member.full_name || member.email}</strong><small>{member.email}</small></i></button></td>
                  <td>{member.department || "—"}</td><td>{roleLabel(member.role)}</td>
                  <td><span className={`p11-status ${cardState?.digitalProfileState === "PUBLISHED" ? "success" : cardState?.digitalProfileState === "DISABLED" ? "error" : cardState?.digitalProfileState === "DRAFT" ? "warning" : "neutral"}`}>{digitalProfileLabel(cardState?.digitalProfileState ?? "NONE")}</span></td>
                  <td><span className={`p11-status ${physicalState === "ACTIVE" ? "success" : physicalState === "LOST" ? "warning" : physicalState === "DISABLED" ? "error" : "neutral"}`}>{physicalCardLabel(physicalState)}</span></td>
                  <td><span className={`p11-status status-${member.status.toLowerCase()}`}>{memberStatusLabel(member.status)}</span></td>
                  <td><span className="p11-relative">{relativeTime(member.created_at)}</span></td>
                  <td className="actions">
                    <button type="button" onClick={() => openProfile(member)}>Detay</button>
                    <button type="button" onClick={() => openMemberDrawer(member, "card")}>Kartı Yönet</button>
                    {member.status === "SUSPENDED" && (
                      <button type="button" disabled={bulkBusy} onClick={() => {
                        setSelectedIds(new Set([member.id]));
                        void runBulkStatus("LEFT");
                      }}>Lisansı Boşa Çıkar</button>
                    )}
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>

        <div className="p11-mobile-list">
          {pageMembers.map((member) => {
            const cardState = memberCardStatuses.find((item) => item.memberId === member.id);
            const assignedCards = physicalCards.filter((card) => Boolean(member.user_id) && card.ownerUserId === member.user_id);
            const physicalState = cardState?.physicalCardState ?? getPhysicalCardState(assignedCards);
            const selectable = isBulkSelectable(member, currentUserId);
            return <article key={member.id}>
              <header>
                <label className="p11-mobile-select">
                  <input type="checkbox" aria-label={`${member.full_name || member.email} seç`} checked={selectedIds.has(member.id)} disabled={!selectable} onChange={() => toggleMember(member.id)} />
                </label>
                <span className="p11-mobile-avatar">{initials(member)}</span>
                <div>
                  <strong>{member.full_name || member.email}</strong>
                  <small>{member.title || roleLabel(member.role)} · {member.department || "Departman yok"}</small>
                </div>
                <span className={`p11-status status-${member.status.toLowerCase()}`}>{memberStatusLabel(member.status)}</span>
              </header>
              <div className="p11-mobile-meta">
                <span><small>Dijital kart</small><b>{digitalProfileLabel(cardState?.digitalProfileState ?? "NONE")}</b></span>
                <span><small>Fiziksel kart</small><b>{physicalCardLabel(physicalState)}</b></span>
              </div>
              <footer>
                <button type="button" onClick={() => openProfile(member)}>Detay</button>
                <button type="button" onClick={() => openMemberDrawer(member, "card")}>Kartı Yönet</button>
              </footer>
            </article>;
          })}
        </div>

        {filteredMembers.length === 0 && (
          <EmptyState
            compact
            icon="search"
            title="Çalışan bulunamadı"
            description="Arama veya filtreleri değiştirerek yeniden deneyebilirsin."
            action={{ label: "Filtreleri Temizle", onClick: () => { setSearch(""); setDepartmentFilter("ALL"); setStatusFilter("ALL"); } }}
          />
        )}

        {pageCount > 1 && <nav className="p11-pagination" aria-label="Çalışan sayfaları"><button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Önceki</button><span>{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sortedMembers.length)} / {sortedMembers.length}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Sonraki</button></nav>}
      </section>
    </section>
  );
}
