import { useRef, useState, type FormEvent } from "react";
import type { JobTitleOption, TitleRequest } from "../domain/types";
import { fetchWithPanelTimeout } from "../domain/runtime";

export function useJobTitlesAndRequests(
  selectedOrganizationId: string,
  getAccessToken: () => Promise<string | null>,
  setMessage: (message: string) => void,
) {
  const [jobTitles, setJobTitles] = useState<JobTitleOption[]>([]);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [jobTitleBusy, setJobTitleBusy] = useState(false);
  const [titleRequests, setTitleRequests] = useState<TitleRequest[]>([]);
  const [titleRequestBusyId, setTitleRequestBusyId] = useState<string | null>(null);
  const jobTitlesLoadId = useRef(0);
  const titleRequestsLoadId = useRef(0);

  async function requireAccessToken() {
    const accessToken = await getAccessToken();
    if (!accessToken) setMessage("Oturum süresi dolmuş. Lütfen yeniden giriş yap.");
    return accessToken;
  }

  async function loadJobTitles(organizationId: string, accessToken?: string) {
    const loadId = ++jobTitlesLoadId.current;
    const bearer = accessToken || (await getAccessToken());
    if (!bearer || loadId !== jobTitlesLoadId.current) return;

    try {
      const response = await fetchWithPanelTimeout(
        `/api/organizations/job-titles?organizationId=${encodeURIComponent(organizationId)}`,
        { headers: { authorization: `Bearer ${bearer}` }, cache: "no-store" },
      );
      const payload = await response.json();
      if (loadId !== jobTitlesLoadId.current) return;

      if (response.ok) setJobTitles(payload.titles || []);
      else setMessage(payload.error || "Pozisyonlar yüklenemedi.");
    } catch {
      if (loadId === jobTitlesLoadId.current) setMessage("Pozisyonlar yüklenemedi.");
    }
  }

  async function loadTitleRequests(organizationId: string, accessToken?: string) {
    const loadId = ++titleRequestsLoadId.current;
    const bearer = accessToken || (await getAccessToken());
    if (!bearer || loadId !== titleRequestsLoadId.current) return;

    try {
      const response = await fetchWithPanelTimeout(
        `/api/organizations/title-requests?organizationId=${encodeURIComponent(organizationId)}`,
        { headers: { authorization: `Bearer ${bearer}` }, cache: "no-store" },
      );
      const payload = await response.json();
      if (loadId !== titleRequestsLoadId.current) return;

      if (response.ok) setTitleRequests(payload.requests || []);
      else setMessage(payload.error || "Pozisyon talepleri yüklenemedi.");
    } catch {
      if (loadId === titleRequestsLoadId.current) setMessage("Pozisyon talepleri yüklenemedi.");
    }
  }

  async function addJobTitle(event: FormEvent) {
    event.preventDefault();
    const title = newJobTitle.trim();
    if (title.length < 2 || !selectedOrganizationId) return;

    setJobTitleBusy(true);
    try {
      const accessToken = await requireAccessToken();
      if (!accessToken) return;

      const response = await fetchWithPanelTimeout("/api/organizations/job-titles", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ organizationId: selectedOrganizationId, title }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || "Pozisyon eklenemedi.");
        return;
      }

      setJobTitles((current) =>
        [...current, payload.title].sort((a, b) => a.title.localeCompare(b.title, "tr")),
      );
      setNewJobTitle("");
    } catch {
      setMessage("Pozisyon eklenemedi.");
    } finally {
      setJobTitleBusy(false);
    }
  }

  async function removeJobTitle(jobTitleId: string) {
    if (!selectedOrganizationId) return;

    setJobTitleBusy(true);
    try {
      const accessToken = await requireAccessToken();
      if (!accessToken) return;

      const response = await fetchWithPanelTimeout("/api/organizations/job-titles", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ organizationId: selectedOrganizationId, id: jobTitleId }),
      });

      if (response.ok) {
        setJobTitles((current) => current.filter((jobTitle) => jobTitle.id !== jobTitleId));
        return;
      }

      const payload = await response.json().catch(() => null);
      setMessage(payload?.error || "Pozisyon kaldırılamadı.");
    } catch {
      setMessage("Pozisyon kaldırılamadı.");
    } finally {
      setJobTitleBusy(false);
    }
  }

  async function resolveTitleRequest(requestId: string, approve: boolean) {
    setTitleRequestBusyId(requestId);
    try {
      const accessToken = await requireAccessToken();
      if (!accessToken) return;

      const response = await fetchWithPanelTimeout("/api/organizations/title-requests", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ requestId, approve }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || "Talep işlenemedi.");
        return;
      }

      setTitleRequests((current) => current.filter((request) => request.id !== requestId));
      if (approve && selectedOrganizationId) {
        await loadJobTitles(selectedOrganizationId, accessToken);
      }
    } catch {
      setMessage("Talep işlenemedi.");
    } finally {
      setTitleRequestBusyId(null);
    }
  }

  return {
    jobTitles,
    newJobTitle,
    setNewJobTitle,
    jobTitleBusy,
    titleRequests,
    titleRequestBusyId,
    loadJobTitles,
    loadTitleRequests,
    addJobTitle,
    removeJobTitle,
    resolveTitleRequest,
  };
}
