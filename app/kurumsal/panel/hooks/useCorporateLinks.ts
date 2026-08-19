// No "use client" directive here: this hook is only ever imported by
// CorporatePanelClient.tsx, which is already a client boundary. Adding a
// second directive here would grow the repo's explicit-client-boundary
// count without adding a real module boundary (see verify:faz9:freeze).
import { useState } from "react";
import type { CorporateLink, LinkVersion } from "../domain/types";

// Extracted from CorporatePanelClient (Faz 10 decomposition, batch 1).
// Owns the "corporate links / content" domain: state, loads and mutations
// (save, upload, remove, publish toggle, version rollback). Behavior is
// unchanged from the inline implementation it replaces — only the
// ownership boundary moved.
export function useCorporateLinks(
  selected: string,
  token: () => Promise<string | null>,
  setMessage: (message: string) => void,
) {
  const [corporateLinks, setCorporateLinks] = useState<CorporateLink[]>([]);
  const [linkVersions, setLinkVersions] = useState<LinkVersion[]>([]);
  const [linkUrlDraft, setLinkUrlDraft] = useState<Record<string, string>>(
    {},
  );
  const [linkScheduleDraft, setLinkScheduleDraft] = useState<
    Record<string, string>
  >({});
  const [linkBusyKind, setLinkBusyKind] = useState<string | null>(null);

  async function loadCorporateLinks(id: string, access?: string) {
    const bearer = access || (await token());
    if (!bearer) return;
    const response = await fetch(
      `/api/organizations/links?organizationId=${id}`,
      { headers: { authorization: `Bearer ${bearer}` } },
    );
    const data = await response.json();
    if (response.ok) {
      setCorporateLinks(data.links || []);
      setLinkVersions(data.versions || []);
    }
  }

  async function saveCorporateLinkUrl(kind: string) {
    const url = (linkUrlDraft[kind] || "").trim();
    if (!url || !selected) return;
    setLinkBusyKind(kind);
    const access = await token();
    const response = await fetch("/api/organizations/links", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({
        organizationId: selected,
        kind,
        url,
        publishAt: linkScheduleDraft[kind]
          ? new Date(linkScheduleDraft[kind]).toISOString()
          : null,
      }),
    });
    const data = await response.json();
    if (response.ok) {
      await loadCorporateLinks(selected, access || undefined);
      setLinkUrlDraft((current) => ({ ...current, [kind]: "" }));
    } else setMessage(data.error || "Bağlantı kaydedilemedi.");
    setLinkBusyKind(null);
  }

  async function uploadCorporateLinkFile(kind: string, file: File) {
    if (!selected) return;
    if (file.type !== "application/pdf") {
      setMessage("Yalnızca PDF dosyası yüklenebilir.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage("PDF en fazla 20 MB olabilir.");
      return;
    }
    setLinkBusyKind(kind);
    const access = await token();
    const form = new FormData();
    form.append("organizationId", selected);
    form.append("kind", kind);
    form.append("file", file);
    if (linkScheduleDraft[kind])
      form.append(
        "publishAt",
        new Date(linkScheduleDraft[kind]).toISOString(),
      );
    const response = await fetch("/api/organizations/links/upload", {
      method: "POST",
      headers: { authorization: `Bearer ${access}` },
      body: form,
    });
    const data = await response.json();
    if (response.ok) await loadCorporateLinks(selected, access || undefined);
    else setMessage(data.error || "PDF yüklenemedi.");
    setLinkBusyKind(null);
  }

  async function removeCorporateLink(kind: string) {
    if (!selected) return;
    setLinkBusyKind(kind);
    const access = await token();
    const response = await fetch("/api/organizations/links", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({ organizationId: selected, kind }),
    });
    if (response.ok) {
      await loadCorporateLinks(selected, access || undefined);
      setMessage("Kurumsal bağlantı kaldırıldı.");
    } else {
      const data = await response.json().catch(() => null);
      setMessage(data?.error || "Bağlantı kaldırılamadı.");
    }
    setLinkBusyKind(null);
  }

  async function toggleCorporateLinkPublication(
    kind: string,
    isPublished: boolean,
  ) {
    if (!selected) return;
    setLinkBusyKind(kind);
    const access = await token();
    const response = await fetch("/api/organizations/links", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({
        organizationId: selected,
        kind,
        isPublished,
        publishAt:
          isPublished && linkScheduleDraft[kind]
            ? new Date(linkScheduleDraft[kind]).toISOString()
            : null,
      }),
    });
    const data = await response.json();
    if (response.ok) {
      await loadCorporateLinks(selected, access || undefined);
      setMessage(
        isPublished
          ? "Kurumsal içerik yayınlandı."
          : "Kurumsal içerik taslağa alındı.",
      );
    } else setMessage(data.error || "Yayın durumu güncellenemedi.");
    setLinkBusyKind(null);
  }

  async function rollbackCorporateLink(versionId: string, kind: string) {
    if (!selected) return;
    setLinkBusyKind(kind);
    const access = await token();
    const response = await fetch("/api/organizations/links", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({
        action: "ROLLBACK",
        organizationId: selected,
        versionId,
      }),
    });
    const data = await response.json();
    if (response.ok) {
      await loadCorporateLinks(selected, access || undefined);
      setMessage("Kurumsal içerik seçilen sürüme geri alındı.");
    } else setMessage(data.error || "Sürüm geri alınamadı.");
    setLinkBusyKind(null);
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
