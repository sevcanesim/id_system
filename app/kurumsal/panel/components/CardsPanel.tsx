"use client";

import { useMemo, useState } from "react";
import { Icon } from "../../../icons";
import { EmptyState } from "../../../components/ui/States";
import { Button } from "../../../components/ui/DesignSystem";
import type { MemberActionTarget, MemberCardStatus, PhysicalCard } from "../domain/types";
import {
  currentLifecycleCards,
  digitalProfileLabel,
  getPhysicalCardState,
  memberStatusLabel,
  physicalCardLabel,
  physicalInventoryCounts,
} from "../../../../lib/organizations/lifecycle";

type Props = {
  members: MemberActionTarget[];
  physicalCards: PhysicalCard[];
  memberCardStatuses: MemberCardStatus[];
  digitalCardsReady: number;
  cardBusy: string | null;
  toggleCardStatus: (cardId: string, status: "ACTIVE" | "DISABLED") => void | Promise<void>;
  openMemberDrawer: (member: MemberActionTarget, tab?: "profile" | "card" | "invite" | "lifecycle") => void;
  openEmployees: () => void;
  initials: (member: MemberActionTarget) => string;
};

type CardAttention = {
  rank: number;
  label: string;
  description: string;
};

export default function CardsPanel({
  members,
  physicalCards,
  memberCardStatuses,
  digitalCardsReady,
  cardBusy,
  toggleCardStatus,
  openMemberDrawer,
  openEmployees,
  initials,
}: Props) {
  const [search, setSearch] = useState("");
  const [assigningCard, setAssigningCard] = useState<PhysicalCard | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const inventory = physicalInventoryCounts(physicalCards);
  const unassignedCards = physicalCards.filter((card) => !card.ownerUserId);
  const inventoryBreakdown = [
    `${inventory.active} aktif`,
    `${inventory.awaitingAssignment} atama bekliyor`,
    inventory.disabled > 0 ? `${inventory.disabled} devre dışı` : null,
    inventory.lost > 0 ? `${inventory.lost} kayıp` : null,
  ].filter(Boolean).join(" · ");
  const roster = useMemo(
    () => members.filter((member) => member.status !== "LEFT"),
    [members],
  );

  function cardTone(member: MemberActionTarget) {
    const cardState = memberCardStatuses.find((item) => item.memberId === member.id);
    const assignedCards = physicalCards.filter((card) => Boolean(member.user_id) && card.ownerUserId === member.user_id);
    const currentCards = currentLifecycleCards(assignedCards);
    const physicalState = cardState?.physicalCardState ?? getPhysicalCardState(assignedCards);
    return { cardState, assignedCards, currentCards, physicalState };
  }

  const eligibleMembers = useMemo(
    () =>
      roster.filter((member) => {
        const { physicalState } = cardTone(member);
        return physicalState === "UNASSIGNED";
      }),
    [roster, memberCardStatuses, physicalCards],
  );

  function attentionFor(member: MemberActionTarget): CardAttention {
    const { cardState, physicalState } = cardTone(member);
    const digitalState = cardState?.digitalProfileState ?? "NONE";

    if (physicalState === "LOST") {
      return { rank: 0, label: "Kayıp kart", description: "Fiziksel kart kayıp olarak işaretli. Yeni kart sürecini başlatın." };
    }
    if (physicalState === "DISABLED") {
      return { rank: 1, label: "Kart devre dışı", description: "Fiziksel kart kullanıma kapalı. Durumu kontrol edin." };
    }
    if (digitalState === "NONE" || digitalState === "DRAFT") {
      return { rank: 2, label: "Dijital kart eksik", description: "Profil kurulumu tamamlanmadan kart paylaşımı hazır değildir." };
    }
    if (physicalState === "UNASSIGNED") {
      return { rank: 3, label: "Fiziksel kart atanmadı", description: "Çalışana fiziksel kart eşleştirmesi yapılması gerekiyor." };
    }
    if (member.status === "SUSPENDED") {
      return { rank: 4, label: "Çalışan pasif", description: "Kart durumu çalışan erişimiyle birlikte kontrol edilmeli." };
    }
    return { rank: 9, label: "Hazır", description: "Kart kurulumu tamamlandı." };
  }

  const visibleRoster = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr");
    const filtered = !term ? roster : roster.filter((member) =>
      [member.full_name, member.email, member.title, member.department].some((value) =>
        String(value || "").toLocaleLowerCase("tr").includes(term),
      ),
    );

    return [...filtered].sort((a, b) => {
      const rankDiff = attentionFor(a).rank - attentionFor(b).rank;
      if (rankDiff !== 0) return rankDiff;
      return String(a.full_name || a.email).localeCompare(String(b.full_name || b.email), "tr", { sensitivity: "base" });
    });
  }, [roster, search, memberCardStatuses, physicalCards]);

  const attentionCount = useMemo(
    () => roster.filter((member) => attentionFor(member).rank < 9).length,
    [roster, memberCardStatuses, physicalCards],
  );

  return (
    <section className="p11-employees p11-cards action-first-cards" aria-labelledby="p11-cards-title">
      <header className="p11-employees-header action-first-header">
        <div>
          <span>KART YÖNETİMİ</span>
          <h2 id="p11-cards-title">Kartlar</h2>
          <p>Önce işlem gerektiren kartları tamamlayın; hazır kayıtlar altta kalır.</p>
        </div>
        <Button type="button" variant="secondary" onClick={openEmployees}>Çalışanlara Git</Button>
      </header>

      <section className={`action-first-summary${attentionCount > 0 ? " has-attention" : " is-clear"}`} aria-label="Kart işlem özeti">
        <div>
          <span>{attentionCount > 0 ? "İŞLEM GEREKEN" : "KART DURUMU"}</span>
          <strong>{attentionCount > 0 ? `${attentionCount} kayıt kontrol bekliyor` : "Tüm kart kayıtları güncel"}</strong>
          <p>{attentionCount > 0 ? "Kayıp, devre dışı, eksik dijital profil ve atanmamış fiziksel kartlar listenin başında." : "Şu anda kart operasyonunda bekleyen kritik bir işlem bulunmuyor."}</p>
        </div>
        <div className="action-first-summary__stats" aria-label="Kart özeti">
          <span><small>Çalışan</small><b>{roster.length}</b></span>
          <span><small>Dijital hazır</small><b>{digitalCardsReady}</b></span>
          <span><small>Atanmamış</small><b>{unassignedCards.length}</b></span>
        </div>
      </section>

      <section className="p11-employee-card action-first-surface">
        <div className="p11-toolbar action-first-toolbar">
          <label className="p11-search">
            <Icon name="search" />
            <input aria-label="Kart veya çalışan ara" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ad, e-posta veya ünvan ara" />
          </label>
          <span className="action-first-inventory-note">{inventoryBreakdown}</span>
        </div>

        <div className="p11-table-summary action-first-table-summary">
          <div>
            <strong>{visibleRoster.length}</strong>
            <span>çalışan kart kaydı</span>
            {attentionCount > 0 && <small>İşlem gerekenler otomatik olarak üstte.</small>}
          </div>
        </div>

        <div className="p11-table-wrap">
          <table className="p11-table action-first-table">
            <thead>
              <tr>
                <th>Çalışan</th>
                <th>Öncelik</th>
                <th>Dijital kart</th>
                <th>Fiziksel kart</th>
                <th className="actions">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {visibleRoster.map((member) => {
                const { cardState, currentCards, physicalState } = cardTone(member);
                const attention = attentionFor(member);
                return (
                  <tr key={member.id} className={attention.rank < 9 ? "needs-attention" : "is-ready"}>
                    <td>
                      <button className="p11-person" type="button" aria-label={`${member.full_name || member.email} kartını yönet`} onClick={() => openMemberDrawer(member, "card")}>
                        <span>{initials(member)}</span>
                        <i>
                          <strong>{member.full_name || member.email}</strong>
                          <small>{member.email}</small>
                        </i>
                      </button>
                    </td>
                    <td>
                      <div className={`action-first-priority${attention.rank < 9 ? " needs-attention" : " is-ready"}`}>
                        <strong>{attention.label}</strong>
                        <small>{attention.description}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`p11-status ${cardState?.digitalProfileState === "PUBLISHED" ? "success" : cardState?.digitalProfileState === "DISABLED" ? "error" : cardState?.digitalProfileState === "DRAFT" ? "warning" : "neutral"}`}>
                        {digitalProfileLabel(cardState?.digitalProfileState ?? "NONE")}
                      </span>
                    </td>
                    <td>
                      <span className={`p11-status ${physicalState === "ACTIVE" ? "success" : physicalState === "LOST" ? "warning" : physicalState === "DISABLED" ? "error" : "neutral"}`}>
                        {currentCards.length > 1 ? `${physicalCardLabel(physicalState)} · ${currentCards.length} kart` : physicalCardLabel(physicalState)}
                      </span>
                    </td>
                    <td className="actions">
                      <Button type="button" size="sm" onClick={() => openMemberDrawer(member, "card")}>{attention.rank < 9 ? "Tamamla" : "Kartı Yönet"}</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p11-mobile-list action-first-mobile-list">
          {visibleRoster.map((member) => {
            const { cardState, currentCards, physicalState } = cardTone(member);
            const attention = attentionFor(member);
            return (
              <article key={member.id} className={attention.rank < 9 ? "needs-attention" : "is-ready"}>
                <header>
                  <span className="p11-mobile-avatar">{initials(member)}</span>
                  <div>
                    <strong>{member.full_name || member.email}</strong>
                    <small>{member.email}</small>
                  </div>
                  <span className={`p11-status status-${member.status.toLowerCase()}`}>{memberStatusLabel(member.status)}</span>
                </header>
                <div className="action-first-mobile-priority">
                  <strong>{attention.label}</strong>
                  <span>{attention.description}</span>
                </div>
                <div className="p11-mobile-meta">
                  <span><small>Dijital kart</small><b>{digitalProfileLabel(cardState?.digitalProfileState ?? "NONE")}</b></span>
                  <span><small>Fiziksel kart</small><b>{currentCards.length > 1 ? `${physicalCardLabel(physicalState)} · ${currentCards.length} kart` : physicalCardLabel(physicalState)}</b></span>
                </div>
                <footer>
                  <button type="button" onClick={() => openMemberDrawer(member, "profile")}>Detay</button>
                  <button type="button" onClick={() => openMemberDrawer(member, "card")}>{attention.rank < 9 ? "Tamamla" : "Kartı Yönet"}</button>
                </footer>
              </article>
            );
          })}
        </div>

        {visibleRoster.length === 0 && (
          <EmptyState
            compact
            icon="contact"
            title={roster.length === 0 ? "Henüz kart envanteri yok" : "Kayıt bulunamadı"}
            description={roster.length === 0 ? "Çalışan eklendiğinde dijital ve fiziksel kart durumu burada görünür." : "Aramayı değiştirerek yeniden deneyin."}
            action={roster.length === 0 ? { label: "Çalışanlara Git", onClick: openEmployees } : { label: "Aramayı Temizle", onClick: () => setSearch("") }}
          />
        )}

        <section className="p11-unassigned-cards action-first-hardware" aria-label="Fiziksel kart envanteri">
          <div className="v25-section-heading">
            <div>
              <small>DONANIM</small>
              <h3>Fiziksel kart envanteri</h3>
              <p>Donanım kayıtları çalışan kart durumundan bağımsızdır. Atama çalışan detayından yapılır.</p>
            </div>
          </div>
          {physicalCards.length ? (
            <div className="p10-card-list">
              {physicalCards.map((card) => (
                <article key={card.id}>
                  <div>
                    <strong>{card.ownerName || "Atanmamış kart"}</strong>
                    <small>{card.cardCodeMasked} · {card.ownerUserId ? "Çalışana atanmış" : "Atama bekliyor"}</small>
                  </div>
                  <span data-status={card.status}>{physicalCardLabel(card.status)}</span>
                  <div className="p11-card-hardware-action">
                    {card.status === "ACTIVE" ? (
                      <Button type="button" variant="secondary" disabled={cardBusy === card.id} onClick={() => void toggleCardStatus(card.id, "DISABLED")}>Pasife Al</Button>
                    ) : card.status === "DISABLED" ? (
                      <Button type="button" variant="primary" disabled={cardBusy === card.id} onClick={() => void toggleCardStatus(card.id, "ACTIVE")}>Aktifleştir</Button>
                    ) : !card.ownerUserId && card.status === "UNASSIGNED" ? (
                      <Button
                        type="button"
                        variant="primary"
                        disabled={cardBusy === card.id}
                        onClick={() => {
                          setSelectedMemberId("");
                          setAssigningCard(card);
                        }}
                      >
                        Çalışana Ata
                      </Button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="p10-empty">Henüz fiziksel kart kaydı yok.</p>
          )}
        </section>
      </section>

      {assigningCard && (
        <div
          className="v25-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-assign-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAssigningCard(null);
          }}
        >
          <div className="v25-dialog-card">
            <header className="v25-dialog-header">
              <small>FİZİKSEL KART ATAMASI</small>
              <h3 id="card-assign-dialog-title">Fiziksel Kart Ataması</h3>
              <p>Seçili kart: <strong>{assigningCard.cardCodeMasked}</strong></p>
            </header>
            {eligibleMembers.length > 0 ? (
              <div className="v25-dialog-body">
                <label className="ds-field" htmlFor="target-employee-select">
                  <span className="ds-label">Çalışan</span>
                  <select
                    id="target-employee-select"
                    className="ds-input"
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                  >
                    <option value="">Çalışan seçin</option>
                    {eligibleMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name || member.email} ({member.department || "Departman yok"})
                      </option>
                    ))}
                  </select>
                </label>
                <p className="v25-dialog-help">
                  Çalışan seçildikten sonra kart yönetimi ekranından atama işlemi tamamlanır.
                </p>
                <div className="v25-dialog-actions">
                  <Button type="button" variant="secondary" onClick={() => setAssigningCard(null)}>
                    Vazgeç
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!selectedMemberId}
                    onClick={() => {
                      const chosen = eligibleMembers.find((m) => m.id === selectedMemberId);
                      if (chosen) {
                        setAssigningCard(null);
                        openMemberDrawer(chosen, "card");
                      }
                    }}
                  >
                    Kartı Yönet
                  </Button>
                </div>
              </div>
            ) : (
              <div className="v25-dialog-body">
                <EmptyState
                  compact
                  icon="contact"
                  title="Atanabilir çalışan bulunamadı"
                  description="Önce uygun bir çalışan oluşturun veya mevcut kart atamalarını kontrol edin."
                />
                <div className="v25-dialog-actions">
                  <Button type="button" variant="secondary" onClick={() => setAssigningCard(null)}>
                    Vazgeç
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      setAssigningCard(null);
                      openEmployees();
                    }}
                  >
                    Çalışanları Gör
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
