// No "use client" directive here: this hook is only ever imported by
// CorporatePanelClient.tsx, which is already a client boundary. Adding a
// second directive here would grow the repo's explicit-client-boundary
// count without adding a real module boundary (see verify:faz9:freeze).
import { useState, type FormEvent } from "react";
import type { JobTitleOption, TitleRequest } from "../domain/types";

// Extracted from CorporatePanelClient (Faz 10 decomposition, batch 1).
// Owns the "job titles" + "title change requests" domain: state, loads and
// mutations. Behavior is unchanged from the inline implementation it
// replaces — only the ownership boundary moved.
export function useJobTitlesAndRequests(
  selected: string,
  token: () => Promise<string | null>,
  setMessage: (message: string) => void,
) {
  const [jobTitles, setJobTitles] = useState<JobTitleOption[]>([]);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [jobTitleBusy, setJobTitleBusy] = useState(false);
  const [titleRequests, setTitleRequests] = useState<TitleRequest[]>([]);
  const [titleRequestBusyId, setTitleRequestBusyId] = useState<string | null>(
    null,
  );

  async function loadJobTitles(id: string, access?: string) {
    const bearer = access || (await token());
    if (!bearer) return;
    const response = await fetch(
      `/api/organizations/job-titles?organizationId=${id}`,
      { headers: { authorization: `Bearer ${bearer}` } },
    );
    const data = await response.json();
    if (response.ok) setJobTitles(data.titles || []);
  }

  async function loadTitleRequests(id: string, access?: string) {
    const bearer = access || (await token());
    if (!bearer) return;
    const response = await fetch(
      `/api/organizations/title-requests?organizationId=${id}`,
      { headers: { authorization: `Bearer ${bearer}` } },
    );
    const data = await response.json();
    if (response.ok) setTitleRequests(data.requests || []);
  }

  async function addJobTitle(event: FormEvent) {
    event.preventDefault();
    const title = newJobTitle.trim();
    if (title.length < 2 || !selected) return;
    setJobTitleBusy(true);
    const access = await token();
    const response = await fetch("/api/organizations/job-titles", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({ organizationId: selected, title }),
    });
    const data = await response.json();
    if (response.ok) {
      setJobTitles((current) =>
        [...current, data.title].sort((a, b) =>
          a.title.localeCompare(b.title, "tr"),
        ),
      );
      setNewJobTitle("");
    } else setMessage(data.error || "Pozisyon eklenemedi.");
    setJobTitleBusy(false);
  }

  async function removeJobTitle(id: string) {
    if (!selected) return;
    const access = await token();
    const response = await fetch("/api/organizations/job-titles", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({ organizationId: selected, id }),
    });
    if (response.ok)
      setJobTitles((current) => current.filter((item) => item.id !== id));
  }

  async function resolveTitleRequest(requestId: string, approve: boolean) {
    setTitleRequestBusyId(requestId);
    const access = await token();
    const response = await fetch("/api/organizations/title-requests", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({ requestId, approve }),
    });
    const data = await response.json();
    if (response.ok) {
      setTitleRequests((current) =>
        current.filter((item) => item.id !== requestId),
      );
      if (approve && selected)
        await loadJobTitles(selected, access || undefined);
    } else setMessage(data.error || "Talep işlenemedi.");
    setTitleRequestBusyId(null);
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
