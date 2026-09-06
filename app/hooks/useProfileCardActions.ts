"use client";

import { useCallback, useState } from "react";
import { track } from "../../lib/analytics";

type PhysicalCardState = {
  id: string;
  status: "ACTIVE" | "LOST" | "DISABLED";
};

type UseProfileCardActionsOptions = {
  profileId: string | null;
  /** Immutable opaque id used by QR/NFC and the canonical public URL. */
  publicId: string;
  publicUrl: string;
  qrDataUrl?: string;
  shareTitle?: string;
  isPublished: boolean;
  cardStatus?: "ACTIVE" | "LOST";
  physicalCard?: PhysicalCardState | null;
  onPublishedChange?: (published: boolean) => void;
  onCardStatusChange?: (status: "ACTIVE" | "LOST") => void;
  onMessage?: (message: string) => void;
};

export function useProfileCardActions({
  profileId,
  publicId,
  publicUrl,
  qrDataUrl = "",
  shareTitle = "Yenomi ID",
  isPublished,
  cardStatus = "ACTIVE",
  physicalCard,
  onPublishedChange,
  onCardStatusChange,
  onMessage,
}: UseProfileCardActionsOptions) {
  const [busy, setBusy] = useState(false);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      onMessage?.("Kartvizit bağlantısı kopyalandı.");
      return true;
    } catch {
      onMessage?.("Bağlantı kopyalanamadı.");
      return false;
    }
  }, [onMessage, publicUrl]);

  const shareLink = useCallback(async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: shareTitle, url: publicUrl });
        return true;
      } catch {
        // Native share cancellation falls back to clipboard.
      }
    }
    return copyLink();
  }, [copyLink, publicUrl, shareTitle]);

  const downloadQr = useCallback(() => {
    if (!qrDataUrl) return false;
    const anchor = document.createElement("a");
    anchor.href = qrDataUrl;
    anchor.download = `${publicId || "yenomi-id"}-qr.png`;
    anchor.click();
    return true;
  }, [publicId, qrDataUrl]);

  const togglePublished = useCallback(async () => {
    if (!profileId || !publicId) return false;
    setBusy(true);
    onMessage?.("");
    try {
      const nextStatus = !isPublished;
      const response = await fetch("/api/profiles/publication", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ profileId, isPublished: nextStatus }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        onMessage?.(payload?.error || "Kart durumu güncellenemedi.");
        return false;
      }
      onPublishedChange?.(nextStatus);
      onMessage?.(nextStatus ? "Kartvizitin yeniden yayınlandı." : "Kartvizitin yayından kaldırıldı.");
      if (nextStatus) track("profile_publish", { publicId });
      return true;
    } finally {
      setBusy(false);
    }
  }, [isPublished, onMessage, onPublishedChange, profileId, publicId]);

  const toggleLostMode = useCallback(async () => {
    if (!profileId || !physicalCard) return false;
    const nextStatus = cardStatus === "LOST" ? "ACTIVE" : "LOST";
    if (
      nextStatus === "LOST"
      && !window.confirm("Kartı kayıp moduna almak fiziksel kart üzerinden profil erişimini durduracaktır. Dijital profil bağlantınız çalışmaya devam eder. Devam etmek istiyor musunuz?")
    ) return false;

    setBusy(true);
    onMessage?.("");
    try {
      const response = await fetch("/api/cards", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({ cardId: physicalCard.id, status: nextStatus }),
      });
      if (!response.ok) {
        const payload = await response.json() as { error?: string };
        onMessage?.(payload.error || "Kart durumu güncellenemedi.");
        return false;
      }
      onCardStatusChange?.(nextStatus);
      onMessage?.(
        nextStatus === "LOST"
          ? "Fiziksel kart kayıp moduna alındı. Dijital profilin çalışmaya devam eder."
          : "Fiziksel kart yeniden aktif edildi.",
      );
      return true;
    } finally {
      setBusy(false);
    }
  }, [cardStatus, onCardStatusChange, onMessage, physicalCard, profileId]);

  return {
    busy,
    copyLink,
    shareLink,
    downloadQr,
    togglePublished,
    toggleLostMode,
  };
}
