"use client";

import { useMemo, useState } from "react";
import { Icon } from "../../../icons";
import { EmptyState } from "../../../components/ui/States";
import { Button } from "../../../components/ui/DesignSystem";
import type { MemberActionTarget, MemberCardStatus, PhysicalCard } from "../domain/types";
import {
  digitalProfileLabel,
  getPhysicalCardState,
  memberStatusLabel,
  physicalCardLabel,
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
  const assignedActive = physicalCards.filter((card) => card.status === "ACTIVE" && Boolean(card.ownerUserId)).length;
  const unassignedCards = physicalCards.filter((card) => !card.ownerUserId);
  const roster = useMemo(
    () => members.filter((member) => member.status !== "LEFT"),
    [members],
  );
  const visibleRoster = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("tr");
    if (!term) return roster;
    return roster.filter((member) =>
      [member.full_name, member.email, member.title, member.department].some((value) =>
        String(value || "").toLocaleLowerCase("tr").includes(term),
      ),
    );
  }, [roster, search]);

  function cardTone(member: MemberActionTarget) {
    const cardState = memberCardStatuses.find((item) => item.memberId === member.id);
    const assignedCards = physicalCards.filter((card) => Boolean(member.user_id) && card.ownerUserId === member.user_id);
    const physicalState = cardState?.physicalCardState ?? getPhysicalCardState(assignedCards);
    return { cardState, assignedCards, physicalState };
  }

  return (
    <section className="p11-employees p11-cards" aria-labelledby="p11-cards-title">
      <header className="p11-employees-header">
        <div>
          <span>KART YÖNETİMİ</span>
          <h2 id="p11-cards-title">Fiziksel ve dijital kartlar</h2>
          <p>Ekip kart envanterini, dijital yayın durumunu ve fiziksel kart yaşam döngüsünü tek ekrandan yönetin.</p>
        </div>
        <Button type="button" variant="secondary" onClick={openEmployees}>Çalışanlara Git</Button>
      </header>

      <div className="p11-kpis">
        <article><small>Dijital kart hazır</small><strong>{digitalCardsReady}</strong><span>Yayında olan profiller</span></article>
        <article><small>Fiziksel kart</small><strong>{physicalCards.length}</strong><span>Kayıtlı donanım</span></article>
        <article><small>Aktif fiziksel kart</small><strong>{assignedActive}</strong><span>Çalışana bağlı ve açık</span></article>
        <article><small>Atama bekleyen</small><strong>{unassignedCards.length}</strong><span>Sahipsiz fiziksel kart</span></article>
      </div>

      <section className="p11-employee-card">
        <div className="p11-toolbar">
          <label className="p11-search">
            <Icon name="search" />
            <input aria-label="Kart veya çalışan ara" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ad, e-posta veya ünvan ara" />
          </label>
        </div>

        <div className="p11-table-summary">
          <div>
            <strong>{visibleRoster.length}</strong>
            <span>çalışan kart kaydı</span>
            {unassignedCards.length > 0 && <small>{unassignedCards.length} atanmamış donanım</small>}
          </div>
        </div>

        <div className="p11-table-wrap">
          <table className="p11-table">
            <thead>
              <tr>
                <th>Çalışan</th>
                <th>Dijital kart</th>
                <th>Fiziksel kart</th>
                <th>Durum</th>
                <th className="actions">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {visibleRoster.map((member) => {
                const { cardState, assignedCards, physicalState } = cardTone(member);
                return (
                  <tr key={member.id}>
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
                      <span className={`p11-status ${cardState?.digitalProfileState === "PUBLISHED" ? "success" : cardState?.digitalProfileState === "DISABLED" ? "error" : cardState?.digitalProfileState === "DRAFT" ? "warning" : "neutral"}`}>
                        {digitalProfileLabel(cardState?.digitalProfileState ?? "NONE")}
                      </span>
                    </td>
                    <td>
                      <span className={`p11-status ${physicalState === "ACTIVE" ? "success" : physicalState === "LOST" ? "warning" : physicalState === "DISABLED" ? "error" : "neutral"}`}>
                        {assignedCards.length > 1 ? `${physicalCardLabel(physicalState)} · ${assignedCards.length} kart` : physicalCardLabel(physicalState)}
                      </span>
                    </td>
                    <td><span className={`p11-status status-${member.status.toLowerCase()}`}>{memberStatusLabel(member.status)}</span></td>
                    <td className="actions">
                      <Button type="button" size="sm" onClick={() => openMemberDrawer(member, "card")}>Kartı Yönet</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p11-mobile-list">
          {visibleRoster.map((member) => {
            const { cardState, assignedCards, physicalState } = cardTone(member);
            return (
              <article key={member.id}>
                <header>
                  <span className="p11-mobile-avatar">{initials(member)}</span>
                  <div>
                    <strong>{member.full_name || member.email}</strong>
                    <small>{member.email}</small>
                  </div>
                  <span className={`p11-status status-${member.status.toLowerCase()}`}>{memberStatusLabel(member.status)}</span>
                </header>
                <div className="p11-mobile-meta">
                  <span><small>Dijital kart</small><b>{digitalProfileLabel(cardState?.digitalProfileState ?? "NONE")}</b></span>
                  <span><small>Fiziksel kart</small><b>{assignedCards.length > 1 ? `${physicalCardLabel(physicalState)} · ${assignedCards.length} kart` : physicalCardLabel(physicalState)}</b></span>
                </div>
                <footer>
                  <button type="button" onClick={() => openMemberDrawer(member, "profile")}>Detay</button>
                  <button type="button" onClick={() => openMemberDrawer(member, "card")}>Kartı Yönet</button>
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

        <section className="p11-unassigned-cards" aria-label="Fiziksel kart envanteri">
          <div className="v25-section-heading">
            <div>
              <small>DONANIM</small>
              <h3>Fiziksel kart envanteri</h3>
              <p>Donanım kayıtları çalışan kart durumundan bağımsız yönetilir; atama çalışan detayından yapılır.</p>
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
                  {card.status === "ACTIVE" ? (
                    <button type="button" disabled={cardBusy === card.id} onClick={() => void toggleCardStatus(card.id, "DISABLED")}>Pasife Al</button>
                  ) : card.status === "DISABLED" ? (
                    <button type="button" disabled={cardBusy === card.id} onClick={() => void toggleCardStatus(card.id, "ACTIVE")}>Aktifleştir</button>
                  ) : <i />}
                </article>
              ))}
            </div>
          ) : (
            <p className="p10-empty">Henüz fiziksel kart kaydı yok.</p>
          )}
        </section>
      </section>
    </section>
  );
}
