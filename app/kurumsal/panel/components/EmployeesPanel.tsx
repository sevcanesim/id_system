import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Icon } from "../../../icons";
import { EmptyState } from "../../../components/ui/States";
import { DEPARTMENT_OPTIONS, TITLE_OPTIONS, normalizeEmailField } from "../../../../lib/form-standards";
import { BULK_INVITE_CSV_TEMPLATE } from "../../../../lib/organizations/bulk-invite";
import type { MemberActionTarget, MemberCardStatus } from "../domain/types";
import {
  digitalProfileLabel,
  getPhysicalCardState,
  memberStatusLabel,
  physicalCardLabel,
  type MemberStatus,
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

type CorporateTab = "overview" | "employees" | "cards" | "roles" | "templates" | "content" | "analytics" | "licenses" | "organization" | "settings";
type SortKey = "name" | "department" | "role" | "status" | "created";
type SortDirection = "asc" | "desc";
type BulkStatus = "ACTIVE" | "SUSPENDED" | "LEFT";

const PAGE_SIZE = 25;

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
    results: Array<{ email: string; status: "created" | "error"; error?: string; emailSent?: boolean }>;
  } | null;
  onBulkInviteFile: (file: File) => void | Promise<void>;
  onSubmitBulkInvite: () => void | Promise<void>;
  onBulkStatus: (memberIds: string[], status: BulkStatus) => Promise<void>;
};

function compareText(a: string | null | undefined, b: string | null | undefined) {
  return String(a || "").localeCompare(String(b || ""), "tr", { sensitivity: "base" });
}

export default function EmployeesPanel(props: Props) {
  const {
    org, subscription, usedSeats, availableSeats, canInvite, activeMembers, invitedMembers,
    digitalCardsReady, physicalCards, totalMembers, filteredMembers, memberCardStatuses,
    search, setSearch, departmentFilter, setDepartmentFilter, departmentOptions,
    statusFilter, setStatusFilter, showInviteForm, setShowInviteForm, setActiveTab, form,
    setForm, add, currentUserId, onEditOwnCard, initials, roleLabel, relativeTime,
    openMemberDrawer, showBulkInvite, onToggleBulkInvite, onCloseBulkInvite,
    bulkInvitePreview, bulkInviteBusy, bulkInviteResults, onBulkInviteFile,
    onSubmitBulkInvite, onBulkStatus,
  } = props;

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

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

  const selectedMembers = useMemo(
    () => filteredMembers.filter((member) => selectedIds.has(member.id)),
    [filteredMembers, selectedIds],
  );
  const selectablePageMembers = pageMembers.filter((member) => member.user_id !== currentUserId && member.role !== "OWNER");
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

  async function runBulkStatus(status: BulkStatus) {
    const ids = selectedMembers.filter((member) => member.user_id !== currentUserId && member.role !== "OWNER").map((member) => member.id);
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

  function sortBy(next: SortKey) {
    if (sortKey === next) setSortDirection((value) => value === "asc" ? "desc" : "asc");
    else { setSortKey(next); setSortDirection("asc"); }
  }

  return (
    <section className="p11-employees" aria-labelledby="p11-employees-title">
      <header className="p11-employees-header">
        <div>
          <span>EKİP YÖNETİMİ</span>
          <h2 id="p11-employees-title">Çalışanlar</h2>
          <p>Çalışan kimliğini, davet durumunu ve dijital/fiziksel kart yaşam döngüsünü tek ekrandan yönet.</p>
        </div>
        <div className="p11-org-capacity" aria-label="Organizasyon kapasitesi">
          <small>{org?.organizations?.name || "Şirket"}</small>
          <strong>{usedSeats} / {subscription?.seat_limit ?? "—"}</strong>
          <span>{availableSeats === 0 ? "Kapasite dolu" : `${availableSeats ?? "—"} lisans boş`}</span>
        </div>
      </header>

      <div className="p11-kpis">
        <article><small>Aktif çalışan</small><strong>{activeMembers}</strong><span>Şu anda erişimi açık</span></article>
        <article><small>Bekleyen davet</small><strong>{invitedMembers}</strong><span>Henüz kabul edilmedi</span></article>
        <article><small>Dijital kart hazır</small><strong>{digitalCardsReady}</strong><span>Profil oluşturuldu</span></article>
        <article><small>Aktif fiziksel kart</small><strong>{physicalCards.filter((card) => card.status === "ACTIVE" && Boolean(card.ownerUserId)).length}</strong><span>Kullanıma açık</span></article>
      </div>

      <section className="p11-employee-card">
        <div className="p11-toolbar">
          <label className="p11-search"><Icon name="search" /><input aria-label="Çalışan ara" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ad, e-posta, ünvan ara" /></label>
          <select aria-label="Departman filtresi" className="p11-filter-control" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option value="ALL">Tüm departmanlar</option>{departmentOptions.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
          <select aria-label="Durum filtresi" className="p11-filter-control" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="ALL">Tüm durumlar</option><option value="ACTIVE">Aktif</option><option value="INVITED">Davet bekliyor</option><option value="SUSPENDED">Pasif</option><option value="LEFT">Ayrıldı</option>
          </select>
          <select aria-label="Sıralama" className="p11-filter-control" value={`${sortKey}:${sortDirection}`} onChange={(event) => { const [key, direction] = event.target.value.split(":") as [SortKey, SortDirection]; setSortKey(key); setSortDirection(direction); }}>
            <option value="name:asc">Ad A–Z</option><option value="name:desc">Ad Z–A</option><option value="created:desc">En yeni</option><option value="created:asc">En eski</option><option value="department:asc">Departman</option><option value="status:asc">Durum</option>
          </select>
          <button type="button" className="p11-secondary" onClick={onToggleBulkInvite} disabled={!canInvite}><Icon name="box" /> CSV ile Davet</button>
          <button type="button" className="p11-primary" onClick={() => { if (!canInvite) { setActiveTab("licenses"); return; } setShowInviteForm((value) => !value); }}><Icon name={canInvite ? "users" : "lock"} />{canInvite ? "Çalışan Ekle" : "Lisans Gerekli"}</button>
        </div>

        {showBulkInvite && canInvite && (
          <div className="p11-invite-panel">
            <header><div><strong>CSV ile toplu davet</strong><p>E-posta ve ad soyad zorunludur. Ünvan, departman ve rol isteğe bağlıdır.</p></div><button type="button" onClick={onCloseBulkInvite} aria-label="Toplu daveti kapat"><Icon name="close" /></button></header>
            <div className="p11-invite-actions">
              <a download="yenomi-toplu-davet-sablonu.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(BULK_INVITE_CSV_TEMPLATE)}`}><Icon name="box" /> Şablon indir</a>
              <label><Icon name="box" /> CSV seç<input type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onBulkInviteFile(file); event.target.value = ""; }} /></label>
            </div>
            {bulkInvitePreview && <div className="p11-bulk-preview"><p><strong>{bulkInvitePreview.fileName}</strong> · {bulkInvitePreview.rows.length} geçerli · {bulkInvitePreview.errors.length} hatalı</p>{bulkInvitePreview.errors.length > 0 && <ul>{bulkInvitePreview.errors.slice(0, 8).map((item) => <li key={item.line}>Satır {item.line}: {item.error}</li>)}</ul>}{bulkInvitePreview.rows.length > 0 && <><div className="p11-bulk-invite-table" role="region" aria-label="Toplu davet önizlemesi" tabIndex={0}><table><thead><tr><th>Ad Soyad</th><th>E-posta</th><th>Departman</th><th>Ünvan</th><th>Rol</th></tr></thead><tbody>{bulkInvitePreview.rows.slice(0, 12).map((row) => <tr key={`${row.line}-${row.email}`}><td>{row.fullName || "—"}</td><td>{row.email}</td><td>{row.department || "—"}</td><td>{row.title || "—"}</td><td>{row.role}</td></tr>)}</tbody></table></div>{bulkInvitePreview.rows.length > 12 && <p className="p11-bulk-more">İlk 12 kayıt gösteriliyor. Toplam {bulkInvitePreview.rows.length} geçerli kayıt.</p>}<button type="button" disabled={bulkInviteBusy} onClick={() => void onSubmitBulkInvite()}>{bulkInviteBusy ? "Gönderiliyor…" : `${bulkInvitePreview.rows.length} çalışanı davet et`}</button></>}</div>}
            {bulkInviteResults && <p className="p11-bulk-result"><strong>{bulkInviteResults.created}</strong> davet oluşturuldu · <strong>{bulkInviteResults.failed}</strong> başarısız</p>}
          </div>
        )}

        {showInviteForm && canInvite && (
          <form className="p11-single-invite" onSubmit={add}>
            <header><div><strong>Yeni çalışan daveti</strong><p>Minimum bilgiyle davet oluştur; çalışan izin verilen profil alanlarını daha sonra tamamlar.</p></div><button type="button" onClick={() => setShowInviteForm(false)} aria-label="Davet formunu kapat"><Icon name="close" /></button></header>
            <div className="p11-form-grid">
              <label>Ad<input required value={form.firstName} onChange={(event) => setForm((value) => ({ ...value, firstName: event.target.value }))} /></label>
              <label>Soyad<input required value={form.lastName} onChange={(event) => setForm((value) => ({ ...value, lastName: event.target.value }))} /></label>
              <label>E-posta<input type="email" required value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} onBlur={() => setForm((value) => ({ ...value, email: normalizeEmailField(value.email) }))} /></label>
              <label>Rol<select value={form.role} onChange={(event) => setForm((value) => ({ ...value, role: event.target.value }))}><option value="EMPLOYEE">Çalışan</option>{org?.role !== "HR" && <option value="HR">İnsan Kaynakları</option>}{org?.role === "OWNER" && <option value="ADMIN">Yönetici</option>}</select></label>
              <label>Ünvan<input list="p11-title-options" value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="Seç veya yaz" /></label>
              <label>Departman<input list="p11-department-options" value={form.department} onChange={(event) => setForm((value) => ({ ...value, department: event.target.value }))} placeholder="Seç veya yaz" /></label>
              <datalist id="p11-title-options">{TITLE_OPTIONS.map((item) => <option key={item} value={item} />)}</datalist>
              <datalist id="p11-department-options">{DEPARTMENT_OPTIONS.map((item) => <option key={item} value={item} />)}</datalist>
            </div>
            <footer><span>{availableSeats === 0 ? "Yeni çalışan için ek lisans gerekli." : `${availableSeats ?? "—"} lisans boş`}</span><button type="submit" className="p11-primary" disabled={availableSeats === 0}><Icon name="mail" /> Daveti Gönder</button></footer>
          </form>
        )}

        {!canInvite && <div className="p11-capacity-warning"><span><Icon name="lock" /><b>Lisans kapasitesi dolu.</b> Yeni çalışan eklemek için kapasite artır.</span><button type="button" onClick={() => setActiveTab("licenses")}>Lisansları Yönet</button></div>}

        {selectedIds.size > 0 && (
          <div className="p11-bulk-bar" role="region" aria-label="Toplu çalışan işlemleri">
            <strong>{selectedIds.size} çalışan seçildi</strong><span>Durum değişikliği yalnız yetkin olan kayıtlar için uygulanır.</span>
            <div><button type="button" disabled={bulkBusy} onClick={() => void runBulkStatus("ACTIVE")}>Aktifleştir</button><button type="button" disabled={bulkBusy} onClick={() => void runBulkStatus("SUSPENDED")}>Pasife Al</button><button type="button" className="danger" disabled={bulkBusy} onClick={() => void runBulkStatus("LEFT")}>Şirketten Ayır</button><button type="button" disabled={bulkBusy} onClick={() => setSelectedIds(new Set())}>Seçimi Temizle</button></div>
          </div>
        )}

        <div className="p11-table-summary"><div><strong>{filteredMembers.length}</strong><span>gösterilen kayıt</span>{filteredMembers.length !== totalMembers && <small>{totalMembers} toplam</small>}</div><span>Sayfa {currentPage} / {pageCount}</span></div>

        <div className="p11-table-wrap">
          <table className="p11-table">
            <thead><tr><th className="select"><input type="checkbox" aria-label="Bu sayfadaki çalışanları seç" checked={pageAllSelected} onChange={togglePage} /></th><th><button type="button" onClick={() => sortBy("name")}>Çalışan</button></th><th><button type="button" onClick={() => sortBy("department")}>Departman</button></th><th><button type="button" onClick={() => sortBy("role")}>Rol</button></th><th>Dijital Kart</th><th>Fiziksel Kart</th><th><button type="button" onClick={() => sortBy("status")}>Durum</button></th><th><button type="button" onClick={() => sortBy("created")}>Son Güncelleme</button></th><th className="actions">İşlem</th></tr></thead>
            <tbody>
              {pageMembers.map((member) => {
                const cardState = memberCardStatuses.find((item) => item.memberId === member.id);
                const assignedCards = physicalCards.filter((card) => Boolean(member.user_id) && card.ownerUserId === member.user_id);
                const physicalState = cardState?.physicalCardState ?? getPhysicalCardState(assignedCards);
                const selectable = member.user_id !== currentUserId && member.role !== "OWNER";
                return <tr key={member.id} data-status={member.status}>
                  <td className="select"><input type="checkbox" aria-label={`${member.full_name || member.email} seç`} checked={selectedIds.has(member.id)} disabled={!selectable} onChange={() => toggleMember(member.id)} /></td>
                  <td><button className="p11-person" type="button" onClick={() => member.user_id === currentUserId ? onEditOwnCard() : openMemberDrawer(member, member.status === "INVITED" ? "invite" : "profile")}><span>{initials(member)}</span><i><strong>{member.full_name || member.email}</strong><small>{member.email}</small></i></button></td>
                  <td>{member.department || "—"}</td><td>{roleLabel(member.role)}</td>
                  <td><span className={`p11-status ${cardState?.digitalProfileState === "PUBLISHED" ? "success" : cardState?.digitalProfileState === "DISABLED" ? "error" : cardState?.digitalProfileState === "DRAFT" ? "warning" : "neutral"}`}>{digitalProfileLabel(cardState?.digitalProfileState ?? "NONE")}</span></td>
                  <td><span className={`p11-status ${physicalState === "ACTIVE" ? "success" : physicalState === "LOST" ? "warning" : physicalState === "DISABLED" ? "error" : "neutral"}`}>{physicalCardLabel(physicalState)}</span></td>
                  <td><span className={`p11-status status-${member.status.toLowerCase()}`}>{memberStatusLabel(member.status)}</span></td>
                  <td><span className="p11-relative">{relativeTime(member.created_at)}</span></td>
                  <td className="actions"><button type="button" onClick={() => member.user_id === currentUserId ? onEditOwnCard() : openMemberDrawer(member, member.status === "INVITED" ? "invite" : "profile")}>{member.user_id === currentUserId ? "Kartım" : "Detay"}</button><button type="button" onClick={() => openMemberDrawer(member, "card")}>Kart</button></td>
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
            return <article key={member.id}><header><span className="p11-mobile-avatar">{initials(member)}</span><div><strong>{member.full_name || member.email}</strong><small>{member.title || roleLabel(member.role)} · {member.department || "Departman yok"}</small></div><span className={`p11-status status-${member.status.toLowerCase()}`}>{memberStatusLabel(member.status)}</span></header><div className="p11-mobile-meta"><span><small>Dijital kart</small><b>{digitalProfileLabel(cardState?.digitalProfileState ?? "NONE")}</b></span><span><small>Fiziksel kart</small><b>{physicalCardLabel(physicalState)}</b></span></div><footer><button type="button" onClick={() => member.user_id === currentUserId ? onEditOwnCard() : openMemberDrawer(member, member.status === "INVITED" ? "invite" : "profile")}>Detay</button><button type="button" onClick={() => openMemberDrawer(member, "card")}>Kart Yönetimi</button></footer></article>;
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
