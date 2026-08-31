"use client";

import { useCallback, useState } from "react";
import { track } from "../../lib/analytics";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { setProfilePublished } from "../../lib/repositories/profiles";

type PhysicalCardState = {
  id: string;
  status: "ACTIVE" | "LOST" | "DISABLED";
};

type UseProfileCardActionsOptions = {
  profileId: string | null;
  slug: string;
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
  slug,
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
    anchor.download = `${slug || "yenomi-id"}-qr.png`;
    anchor.click();
    return true;
  }, [qrDataUrl, slug]);

  const togglePublished = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !profileId || !slug) return false;
    setBusy(true);
    onMessage?.("");
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        onMessage?.("Bu işlem için giriş yapmalısın.");
        return false;
      }
      const nextStatus = !isPublished;
      const { error } = await setProfilePublished(supabase, authData.user.id, profileId, nextStatus);
      if (error) {
        onMessage?.(error);
        return false;
      }
      onPublishedChange?.(nextStatus);
      onMessage?.(nextStatus ? "Kartvizitin yeniden yayınlandı." : "Kartvizitin yayından kaldırıldı.");
      if (nextStatus) track("profile_publish", { slug });
      return true;
    } finally {
      setBusy(false);
    }
  }, [isPublished, onMessage, onPublishedChange, profileId, slug]);

  const toggleLostMode = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !profileId || !physicalCard) return false;
    const nextStatus = cardStatus === "LOST" ? "ACTIVE" : "LOST";
    if (
      nextStatus === "LOST"
      && !window.confirm("Kartı kayıp moduna almak fiziksel kart üzerinden profil erişimini durduracaktır. Dijital profil bağlantınız çalışmaya devam eder. Devam etmek istiyor musunuz?")
    ) return false;

    setBusy(true);
    onMessage?.("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        onMessage?.("Oturum doğrulanamadı.");
        return false;
      }
      const response = await fetch("/api/cards", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
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
