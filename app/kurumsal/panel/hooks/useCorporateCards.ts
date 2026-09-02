import { useState } from "react";
import type { CardAnalytics, PhysicalCard, MemberCardStatus } from "../domain/types";
import type { CorporatePanelTab } from "../domain/navigation";
import { fetchWithPanelTimeout } from "../domain/runtime";

/**
 * Fiziksel kart envanteri, çalışan kart durumları ve kart analitiği için
 * veri yükleme + mutasyon mantığı. `CorporatePanelClient.tsx`'ten çıkarıldı;
 * davranış birebir korunmuştur (aynı endpoint'ler, aynı hata mesajları,
 * aynı `setDataError` tab eşlemesi).
 */
export function useCorporateCards(
  selectedOrganizationId: string,
  getAccessToken: () => Promise<string | null>,
  setMessage: (message: string) => void,
  setDataError: (tab: CorporatePanelTab, error: string | null) => void,
) {
  const [physicalCards, setPhysicalCards] = useState<PhysicalCard[]>([]);
  const [memberCardStatuses, setMemberCardStatuses] = useState<MemberCardStatus[]>([]);
  const [cardAnalytics, setCardAnalytics] = useState<CardAnalytics | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState<7 | 30 | 90>(30);
  const [cardBusy, setCardBusy] = useState<string | null>(null);

  async function loadPhysicalCards(id: string, access?: string) {
    const auth = access || (await getAccessToken());
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
    const auth = access || (await getAccessToken());
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
  ) {
    const auth = access || (await getAccessToken());
    if (!auth) return;
    const params = new URLSearchParams({ organizationId: id, days: String(days) });
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
      ...(cardAnalytics.byCard || []).map((item) => ["Kart", item.name, item.count, ""]),
      ...(cardAnalytics.byDepartment || []).map((item) => ["Departman", item.department, item.count, ""]),
      ...(cardAnalytics.byCountry || []).map((item) => ["Ülke", item.country, item.count, ""]),
      ...(cardAnalytics.content?.byLink || []).map((item) => ["İçerik", item.label, item.count, item.downloads]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
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
    const access = await getAccessToken();
    if (!access || !selectedOrganizationId) return;
    setCardBusy(oldCardId);
    setMessage("");
    try {
      const response = await fetch("/api/organizations/physical-cards", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${access}` },
        body: JSON.stringify({ organizationId: selectedOrganizationId, oldCardId, newCardId }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Replacement kart bağlanamadı.");
        return;
      }
      setPhysicalCards((current) =>
        current.map((card) => (card.id === oldCardId ? { ...card, replacedByCardId: newCardId } : card)),
      );
      setMessage("Eski kart yeni fiziksel kartla kalıcı olarak eşleştirildi.");
    } finally {
      setCardBusy(null);
    }
  }

  async function toggleCardStatus(cardId: string, status: "ACTIVE" | "DISABLED") {
    const access = await getAccessToken();
    if (!access || !selectedOrganizationId) return;
    setCardBusy(cardId);
    setMessage("");
    try {
      const response = await fetch("/api/organizations/physical-cards", {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${access}` },
        body: JSON.stringify({ organizationId: selectedOrganizationId, cardId, status }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Kart durumu güncellenemedi.");
        return;
      }
      setPhysicalCards((current) => current.map((card) => (card.id === cardId ? { ...card, status } : card)));
      setMessage(status === "DISABLED" ? "Kart devre dışı bırakıldı." : "Kart yeniden etkinleştirildi.");
    } finally {
      setCardBusy(null);
    }
  }

  function resetCardsData() {
    setPhysicalCards([]);
    setMemberCardStatuses([]);
    setCardAnalytics(null);
  }

  return {
    physicalCards,
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
  };
}
