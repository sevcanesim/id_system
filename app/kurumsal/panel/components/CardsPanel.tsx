"use client";

import { useMemo, useState } from "react";
import { Icon } from "../../../icons";
import { EmptyState } from "../../../components/ui/States";
import { Button } from "../../../components/ui/DesignSystem";
import type { MemberActionTarget, MemberCardStatus, PhysicalCard } from "../domain/types";
import { physicalCardLabel, physicalInventoryCounts } from "../../../../lib/organizations/lifecycle";

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

function formatCardDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function cardTone(status: PhysicalCard["status"]) {
  if (status === "ACTIVE") return "success";
  if (status === "LOST") return "warning";
  if (status === "DISABLED") return "error";
  return "neutral";
}

export default function CardsPanel({
  members,
  physicalCards,
  cardBusy,
  toggleCardStatus,
  openMemberDrawer,
  openEmployees,
}: Props) {
  const [search, setSearch] = useState("");
  const [assigningCard, setAssigningCard] = useState<PhysicalCard | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const inventory = physicalInventoryCounts(physicalCards);
  const roster = useMemo(() => members.filter((member) => member.status !== "LEFT"), [members]);

  const eligibleMembers = useMemo(
    () => roster.filter((member) => {
      if (!member.user_id) return false;
      return !physicalCards.some((card) => card.ownerUserId === member.user_id && card.status !== "DISABLED");
    }),
    [roster, physicalCards],
  );

  const visibleCards = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr");
    if (!term) return physicalCards;
    return physicalCards.filter((card) =>
      [card.cardCodeMasked, card.ownerName, physicalCardLabel(card.status)].some((value) =>
        String(value || "").toLocaleLowerCase("tr").includes(term),
      ),
    );
  }, [physicalCards, search]);

  const attentionCount = inventory.awaitingAssignment + inventory.disabled + inventory.lost;

  const memberForCard = (card: PhysicalCard) =>
    card.ownerUserId ? roster.find((member) => member.user_id === card.ownerUserId) || null : null;

  return (
    <section className="p11-employees p11-cards card-inventory-page" aria-labelledby="p11-cards-title">
      <header className="p11-employees-header action-first-header">
        <div>
          <span>KART YÖNETİMİ</span>
          <h2 id="p11-cards-title">Kartlar</h2>
          <p>Fiziksel kart envanterini, atamaları ve kart yaşam döngüsünü tek yerden yönetin.</p>
        </div>
        <Button type="button" variant="secondary" onClick={openEmployees}>Çalışanlara Git</Button>
      </header>

      <section className={`action-first-summary${attentionCount > 0 ? " has-attention" : " is-clear"}`} aria-label="Fiziksel kart özeti">
        <div>
          <span>{attentionCount > 0 ? "İŞLEM GEREKEN" : "ENVANTER DURUMU"}</span>
          <strong>{attentionCount > 0 ? `${attentionCount} fiziksel kart işlem bekliyor` : "Fiziksel kart envanteri güncel"}</strong>
          <p>{attentionCount > 0 ? "Atama bekleyen, devre dışı veya kayıp kartları aşağıdaki envanterden tamamlayın." : "Şu anda fiziksel kart operasyonunda bekleyen kritik bir işlem bulunmuyor."}</p>
        </div>
        <div className="action-first-summary__stats card-inventory-stats" aria-label="Kart envanteri özeti">
          <span><small>Toplam kart</small><b>{physicalCards.length}</b></span>
          <span><small>Aktif</small><b>{inventory.active}</b></span>
          <span><small>Atama bekliyor</small><b>{inventory.awaitingAssignment}</b></span>
          <span><small>Devre dışı / kayıp</small><b>{inventory.disabled + inventory.lost}</b></span>
        </div>
      </section>

      <section className="p11-employee-card action-first-surface card-inventory-surface" aria-label="Fiziksel kart envanteri">
        <div className="p11-toolbar action-first-toolbar card-inventory-toolbar">
          <label className="p11-search">
            <Icon name="search" />
            <input
              aria-label="Kart ara"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Kart ID, çalışan veya durum ara"
            />
          </label>
          <span className="action-first-inventory-note">{visibleCards.length} / {physicalCards.length} kart</span>
        </div>

        <div className="p11-table-wrap card-inventory-table-wrap">
          <table className="p11-table card-inventory-table">
            <thead>
              <tr>
                <th>Kart ID</th>
                <th>Durum</th>
                <th>Atanan çalışan</th>
                <th>Aktivasyon</th>
                <th className="actions">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {visibleCards.map((card) => {
                const member = memberForCard(card);
                return (
                  <tr key={card.id}>
                    <td>
                      <div className="card-inventory-id">
                        <strong>{card.cardCodeMasked}</strong>
                        <small>{card.ownerUserId ? "Atanmış fiziksel kart" : "Boş fiziksel kart"}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`p11-status ${cardTone(card.status)}`}>{physicalCardLabel(card.status)}</span>
                    </td>
                    <td>
                      {card.ownerName ? (
                        member ? (
                          <button type="button" className="card-inventory-owner" onClick={() => openMemberDrawer(member, "card")}>{card.ownerName}</button>
                        ) : (
                          <span>{card.ownerName}</span>
                        )
                      ) : (
                        <span className="card-inventory-empty">Atanmamış</span>
                      )}
                    </td>
                    <td>{formatCardDate(card.activatedAt)}</td>
                    <td className="actions">
                      {card.status === "ACTIVE" ? (
                        <Button type="button" size="sm" variant="secondary" disabled={cardBusy === card.id} onClick={() => void toggleCardStatus(card.id, "DISABLED")}>Pasife Al</Button>
                      ) : card.status === "DISABLED" ? (
                        <Button type="button" size="sm" variant="primary" disabled={cardBusy === card.id} onClick={() => void toggleCardStatus(card.id, "ACTIVE")}>Aktifleştir</Button>
                      ) : !card.ownerUserId && card.status === "UNASSIGNED" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          disabled={cardBusy === card.id}
                          onClick={() => {
                            setSelectedMemberId("");
                            setAssigningCard(card);
                          }}
                        >
                          Çalışana Ata
                        </Button>
                      ) : member ? (
                        <Button type="button" size="sm" variant="secondary" onClick={() => openMemberDrawer(member, "card")}>Kartı Yönet</Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p11-mobile-list card-inventory-mobile-list">
          {visibleCards.map((card) => {
            const member = memberForCard(card);
            return (
              <article key={card.id}>
                <header>
                  <div>
                    <strong>{card.cardCodeMasked}</strong>
                    <small>{card.ownerName || "Atanmamış kart"}</small>
                  </div>
                  <span className={`p11-status ${cardTone(card.status)}`}>{physicalCardLabel(card.status)}</span>
                </header>
                <div className="p11-mobile-meta">
                  <span><small>Atanan çalışan</small><b>{card.ownerName || "—"}</b></span>
                  <span><small>Aktivasyon</small><b>{formatCardDate(card.activatedAt)}</b></span>
                </div>
                <footer>
                  {card.status === "ACTIVE" ? (
                    <button type="button" disabled={cardBusy === card.id} onClick={() => void toggleCardStatus(card.id, "DISABLED")}>Pasife Al</button>
                  ) : card.status === "DISABLED" ? (
                    <button type="button" disabled={cardBusy === card.id} onClick={() => void toggleCardStatus(card.id, "ACTIVE")}>Aktifleştir</button>
                  ) : !card.ownerUserId && card.status === "UNASSIGNED" ? (
                    <button type="button" onClick={() => { setSelectedMemberId(""); setAssigningCard(card); }}>Çalışana Ata</button>
                  ) : member ? (
                    <button type="button" onClick={() => openMemberDrawer(member, "card")}>Kartı Yönet</button>
                  ) : null}
                </footer>
              </article>
            );
          })}
        </div>

        {visibleCards.length === 0 && (
          <EmptyState
            compact
            icon="contact"
            title={physicalCards.length === 0 ? "Henüz fiziksel kart yok" : "Kart bulunamadı"}
            description={physicalCards.length === 0 ? "Fiziksel kart kayıtları oluşturulduğunda envanter burada görünür." : "Kart ID, çalışan adı veya durum ile yeniden arayın."}
            action={physicalCards.length === 0 ? { label: "Çalışanlara Git", onClick: openEmployees } : { label: "Aramayı Temizle", onClick: () => setSearch("") }}
          />
        )}
      </section>

      {assigningCard && (
        <div
          className="v25-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-assign-dialog-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) setAssigningCard(null);
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
                    onChange={(event) => setSelectedMemberId(event.target.value)}
                  >
                    <option value="">Çalışan seçin</option>
                    {eligibleMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name || member.email} ({member.department || "Departman yok"})
                      </option>
                    ))}
                  </select>
                </label>
                <p className="v25-dialog-help">Çalışanı seçin; kart atama işlemi çalışan kart yönetiminde tamamlanır.</p>
                <div className="v25-dialog-actions">
                  <Button type="button" variant="secondary" onClick={() => setAssigningCard(null)}>Vazgeç</Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={!selectedMemberId}
                    onClick={() => {
                      const chosen = eligibleMembers.find((member) => member.id === selectedMemberId);
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
                  <Button type="button" variant="secondary" onClick={() => setAssigningCard(null)}>Vazgeç</Button>
                  <Button type="button" variant="primary" onClick={() => { setAssigningCard(null); openEmployees(); }}>Çalışanları Gör</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
