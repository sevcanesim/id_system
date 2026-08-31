import { useEffect, useRef, useState } from "react";
import type { CorporateLink, LinkVersion } from "../domain/types";
import { createPanelRequestScope, fetchWithPanelTimeout } from "../domain/runtime";

export function useCorporateLinks(
  selectedOrganizationId: string,
  getAccessToken: () => Promise<string | null>,
  setMessage: (message: string) => void,
) {
  const [corporateLinks, setCorporateLinks] = useState<CorporateLink[]>([]);
  const [linkVersions, setLinkVersions] = useState<LinkVersion[]>([]);
  const [linkUrlDraft, setLinkUrlDraft] = useState<Record<string, string>>({});
  const [linkScheduleDraft, setLinkScheduleDraft] = useState<Record<string, string>>({});
  const [linkBusyKind, setLinkBusyKind] = useState<string | null>(null);
  const linksRequestScope = useRef(createPanelRequestScope());

  useEffect(() => () => linksRequestScope.current.cancel(), []);

  function scheduledPublishAt(kind: string) {
    const value = linkScheduleDraft[kind];
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  async function loadCorporateLinks(organizationId: string, accessToken?: string) {
    const request = linksRequestScope.current.begin();
    const bearer = accessToken || (await getAccessToken());
    if (!bearer || !request.isCurrent()) return;

    try {
      const response = await fetchWithPanelTimeout(
        `/api/organizations/links?organizationId=${encodeURIComponent(organizationId)}`,
        {
          headers: { authorization: `Bearer ${bearer}` },
          cache: "no-store",
          signal: request.signal,
        },
      );
      const payload = await response.json();
      if (!request.isCurrent()) return;

      if (response.ok) {
        setCorporateLinks(payload.links || []);
        setLinkVersions(payload.versions || []);
      } else {
        setMessage(payload.error || "Kurumsal içerikler yüklenemedi.");
      }
    } catch (error) {
      if (request.isCurrent() && !(error instanceof DOMException && error.name === "AbortError")) {
        setMessage("Kurumsal içerikler yüklenemedi.");
      }
    }
  }

  async function saveCorporateLinkUrl(kind: string) {
    const url = (linkUrlDraft[kind] || "").trim();
    if (!url || !selectedOrganizationId) return;

    setLinkBusyKind(kind);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setMessage("Oturum süresi dolmuş. Lütfen yeniden giriş yap.");
        return;
      }

      const response = await fetchWithPanelTimeout("/api/organizations/links", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          organizationId: selectedOrganizationId,
          kind,
          url,
          publishAt: scheduledPublishAt(kind),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || "Bağlantı kaydedilemedi.");
        return;
      }

      await loadCorporateLinks(selectedOrganizationId, accessToken);
      setLinkUrlDraft((current) => ({ ...current, [kind]: "" }));
    } catch {
      setMessage("Bağlantı kaydedilemedi.");
    } finally {
      setLinkBusyKind(null);
    }
  }

  async function uploadCorporateLinkFile(kind: string, file: File) {
    if (!selectedOrganizationId) return;
    if (file.type !== "application/pdf") {
      setMessage("Yalnızca PDF dosyası yüklenebilir.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage("PDF en fazla 20 MB olabilir.");
      return;
    }

    setLinkBusyKind(kind);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setMessage("Oturum süresi dolmuş. Lütfen yeniden giriş yap.");
        return;
      }

      const formData = new FormData();
      formData.append("organizationId", selectedOrganizationId);
      formData.append("kind", kind);
      formData.append("file", file);
      const publishAt = scheduledPublishAt(kind);
      if (publishAt) formData.append("publishAt", publishAt);

      const response = await fetchWithPanelTimeout("/api/organizations/links/upload", {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      const payload = await response.json();
      if (response.ok) await loadCorporateLinks(selectedOrganizationId, accessToken);
      else setMessage(payload.error || "PDF yüklenemedi.");
    } catch {
      setMessage("PDF yüklenemedi.");
    } finally {
      setLinkBusyKind(null);
    }
  }

  async function removeCorporateLink(kind: string) {
    if (!selectedOrganizationId) return;
    setLinkBusyKind(kind);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setMessage("Oturum süresi dolmuş. Lütfen yeniden giriş yap.");
        return;
      }

      const response = await fetchWithPanelTimeout("/api/organizations/links", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ organizationId: selectedOrganizationId, kind }),
      });
      if (response.ok) {
        await loadCorporateLinks(selectedOrganizationId, accessToken);
        setMessage("Kurumsal bağlantı kaldırıldı.");
      } else {
        const payload = await response.json().catch(() => null);
        setMessage(payload?.error || "Bağlantı kaldırılamadı.");
      }
    } catch {
      setMessage("Bağlantı kaldırılamadı.");
    } finally {
      setLinkBusyKind(null);
    }
  }

  async function toggleCorporateLinkPublication(kind: string, isPublished: boolean) {
    if (!selectedOrganizationId) return;
    setLinkBusyKind(kind);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setMessage("Oturum süresi dolmuş. Lütfen yeniden giriş yap.");
        return;
      }

      const response = await fetchWithPanelTimeout("/api/organizations/links", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          organizationId: selectedOrganizationId,
          kind,
          isPublished,
          publishAt: isPublished ? scheduledPublishAt(kind) : null,
        }),
      });
      const payload = await response.json();
      if (response.ok) {
        await loadCorporateLinks(selectedOrganizationId, accessToken);
        setMessage(isPublished ? "Kurumsal içerik yayınlandı." : "Kurumsal içerik taslağa alındı.");
      } else {
        setMessage(payload.error || "Yayın durumu güncellenemedi.");
      }
    } catch {
      setMessage("Yayın durumu güncellenemedi.");
    } finally {
      setLinkBusyKind(null);
    }
  }

  async function rollbackCorporateLink(versionId: string, kind: string) {
    if (!selectedOrganizationId) return;
    setLinkBusyKind(kind);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setMessage("Oturum süresi dolmuş. Lütfen yeniden giriş yap.");
        return;
      }

      const response = await fetchWithPanelTimeout("/api/organizations/links", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: "ROLLBACK",
          organizationId: selectedOrganizationId,
          versionId,
        }),
      });
      const payload = await response.json();
      if (response.ok) {
        await loadCorporateLinks(selectedOrganizationId, accessToken);
        setMessage("Kurumsal içerik seçilen sürüme geri alındı.");
      } else {
        setMessage(payload.error || "Sürüm geri alınamadı.");
      }
    } catch {
      setMessage("Sürüm geri alınamadı.");
    } finally {
      setLinkBusyKind(null);
    }
  }

  return {
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
  };
}