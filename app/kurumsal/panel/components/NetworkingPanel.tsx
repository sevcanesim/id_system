"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FOLLOW_UP_SCENARIOS } from "../../../../lib/commerce/packages";
import { EmptyState } from "../../../components/ui/States";
import { LEAD_STATUSES } from "../../../../lib/networking/catalog";
import { eventAttributionPath } from "../../../../lib/public-card/urls";
import type { Member, MemberCardStatus } from "../domain/types";

type View = "leads" | "events" | "meetings";

type Lead = {
  id: string;
  full_name: string;
  email: string;
  company: string | null;
  city: string;
  country: string;
  source: string;
  status: string;
  score: number;
  scoreLabel: string;
  interests: string[];
  created_at: string;
};

type Meeting = {
  id: string;
  lead_id: string;
  meeting_type: "ONLINE" | "IN_PERSON";
  preferred_at: string | null;
  timezone: string | null;
  planning_required: boolean;
  status: string;
  message: string | null;
};

type EventRow = {
  id: string;
  public_id: string;
  name: string;
  location: string | null;
  booth: string | null;
};

type EventLink = {
  id: string;
  event_id: string;
  profile_id: string;
  public_id: string;
};

type Timeline = { lead_id: string; kind: string; created_at: string };

export default function NetworkingPanel({
  view,
  organizationId,
  token,
  members,
  memberCardStatuses,
}: {
  view: View;
  organizationId: string;
  token: () => Promise<string | null>;
  members: Member[];
  memberCardStatuses: MemberCardStatus[];
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventLinks, setEventLinks] = useState<EventLink[]>([]);
  const [timeline, setTimeline] = useState<Timeline[]>([]);
  const [credits, setCredits] = useState(0);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [eventForm, setEventForm] = useState({ name: "", location: "", booth: "", profileId: "" });

  async function load() {
    const access = await token();
    if (!access || !organizationId) return;
    const response = await fetch(`/api/organizations/networking?organizationId=${encodeURIComponent(organizationId)}`, {
      headers: { authorization: `Bearer ${access}` },
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || "Networking verisi yüklenemedi.");
      return;
    }
    setLeads(payload.leads || []);
    setMeetings(payload.meetings || []);
    setEvents(payload.events || []);
    setEventLinks(payload.eventLinks || []);
    setTimeline(payload.timeline || []);
    setCredits(payload.mailCredits?.mail_credits_remaining ?? 0);
    setMessage("");
  }

  useEffect(() => { void load(); }, [organizationId, view]);

  async function post(body: Record<string, unknown>) {
    const access = await token();
    if (!access) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/organizations/networking", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${access}` },
        body: JSON.stringify({ organizationId, ...body }),
      });
      const payload = await response.json();
      if (!response.ok) setMessage(payload.error || "İşlem tamamlanamadı.");
      else await load();
    } finally {
      setBusy(false);
    }
  }

  async function createEvent(event: FormEvent) {
    event.preventDefault();
    await post({ action: "create_event", name: eventForm.name, location: eventForm.location, booth: eventForm.booth });
    setEventForm((current) => ({ ...current, name: "", location: "", booth: "" }));
  }

  const cardOptions = useMemo(
    () => memberCardStatuses.filter((item) => item.profileId).map((item) => ({
      profileId: item.profileId as string,
      label: members.find((member) => member.id === item.memberId)?.full_name || item.slug || item.profileId,
    })),
    [memberCardStatuses, members],
  );

  const leadName = (leadId: string) => leads.find((lead) => lead.id === leadId)?.full_name || "Lead";

  return (
    <section className="p11-employees p11-networking" aria-labelledby="p11-networking-title">
      <header className="p11-employees-header">
        <div>
          <span>NETWORKING</span>
          <h2 id="p11-networking-title">{view === "leads" ? "Leadler" : view === "events" ? "Etkinlikler" : "Görüşmeler"}</h2>
          <p>
            {view === "leads"
              ? "Karttan paylaşılan iletişim. Network Mail kişisel follow-up’tır: 1 alıcı = 1 kredi. Toplu Campaign Mail bu bakiyeden düşmez."
              : view === "events"
                ? "Etkinlik QR’si kişi URL’sini değiştirmez. /e/{id} aynı dijital kartı açar."
                : "Yüz yüze talepler lokasyon ve ekip uygunluğuna göre planlanır. GPS kullanılmaz."}
          </p>
        </div>
        <b>Network Mail: {credits}</b>
      </header>
      {message && <p className="p11-networking-message" role="status">{message}</p>}

      {view === "leads" && (
        leads.length === 0 ? (
          <EmptyState compact icon="users" title="Henüz networking lead’i yok" description="QR veya NFC ile açılan kartın sonundaki paylaş / görüşme talebi buraya düşer. /kurumsal satış formu bu listeye yazılmaz." />
        ) : (
          <div className="p11-networking-list">
            {leads.map((lead) => {
              const eventsForLead = timeline.filter((item) => item.lead_id === lead.id);
              return (
                <article key={lead.id}>
                  <div>
                    <strong>{lead.full_name}</strong>
                    <span>{[lead.company, lead.city, lead.country].filter(Boolean).join(" · ")}</span>
                    <small>{lead.source} · {lead.scoreLabel} · {lead.score}</small>
                  </div>
                  <p>{lead.email}</p>
                  {lead.interests.length > 0 && <p>{lead.interests.join(", ")}</p>}
                  <ol>
                    {eventsForLead.map((item) => <li key={`${item.kind}-${item.created_at}`}>{item.kind}</li>)}
                  </ol>
                  <div className="p11-networking-actions">
                    <select aria-label="Lead durumu" value={lead.status} onChange={(event) => void post({ action: "update_lead", leadId: lead.id, status: event.target.value })}>
                      {LEAD_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <select
                      aria-label="Follow-up senaryosu"
                      value={templates[lead.id] || "EVENT_MET"}
                      onChange={(event) => setTemplates((current) => ({ ...current, [lead.id]: event.target.value }))}
                    >
                      {FOLLOW_UP_SCENARIOS.map((scenario) => <option key={scenario.code} value={scenario.code}>{scenario.label}</option>)}
                    </select>
                    <button type="button" disabled={busy} onClick={() => void post({ action: "send_followup", leadId: lead.id, template: templates[lead.id] || "EVENT_MET" })}>Mail Gönder</button>
                  </div>
                </article>
              );
            })}
          </div>
        )
      )}

      {view === "meetings" && (
        meetings.length === 0 ? (
          <EmptyState compact icon="contact" title="Görüşme talebi yok" description="Karttaki Görüşme Talep Et formu buraya düşer." />
        ) : (
          <div className="p11-networking-list">
            {meetings.map((meeting) => (
              <article key={meeting.id}>
                <div>
                  <strong>{leadName(meeting.lead_id)}</strong>
                  <span>{meeting.meeting_type === "IN_PERSON" ? "Yüz yüze" : "Online"}{meeting.planning_required ? " · planlama gerekli" : ""}</span>
                  <small>{meeting.preferred_at ? new Date(meeting.preferred_at).toLocaleString("tr-TR") : "Tarih yok"} {meeting.timezone || ""}</small>
                </div>
                {meeting.message && <p>{meeting.message}</p>}
                <div className="p11-networking-actions">
                  <button type="button" disabled={busy} onClick={() => void post({ action: "update_meeting", meetingId: meeting.id, status: "ACCEPTED" })}>Kabul Et</button>
                  <button type="button" disabled={busy} onClick={() => void post({ action: "update_meeting", meetingId: meeting.id, status: "ALTERNATIVE" })}>Alternatif Öner</button>
                  <button type="button" disabled={busy} onClick={() => void post({ action: "update_meeting", meetingId: meeting.id, status: "DECLINED" })}>Reddet</button>
                </div>
              </article>
            ))}
          </div>
        )
      )}

      {view === "events" && (
        <>
          <form className="p11-networking-form" onSubmit={createEvent}>
            <label>Etkinlik adı<input required value={eventForm.name} onChange={(event) => setEventForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <label>Lokasyon<input value={eventForm.location} onChange={(event) => setEventForm((current) => ({ ...current, location: event.target.value }))} /></label>
            <label>Stand<input value={eventForm.booth} onChange={(event) => setEventForm((current) => ({ ...current, booth: event.target.value }))} /></label>
            <button type="submit" disabled={busy}>Etkinlik Oluştur</button>
          </form>
          {events.length === 0 ? (
            <EmptyState compact icon="analytics" title="Etkinlik yok" description="Kişiye özel etkinlik QR’si oluşturmak için önce etkinliği kaydedin." />
          ) : events.map((eventRow) => (
            <article className="p11-networking-event" key={eventRow.id}>
              <div>
                <strong>{eventRow.name}</strong>
                <span>{[eventRow.location, eventRow.booth].filter(Boolean).join(" · ") || "Lokasyon yok"}</span>
              </div>
              <form onSubmit={(submitEvent) => { submitEvent.preventDefault(); if (eventForm.profileId) void post({ action: "create_event_link", eventId: eventRow.id, profileId: eventForm.profileId }); }}>
                <label>Kart QR’si
                  <select required value={eventForm.profileId} onChange={(changeEvent) => setEventForm((current) => ({ ...current, profileId: changeEvent.target.value }))}>
                    <option value="">Çalışan kartı seçin</option>
                    {cardOptions.map((option) => <option key={option.profileId} value={option.profileId}>{option.label}</option>)}
                  </select>
                </label>
                <button type="submit" disabled={busy || !eventForm.profileId}>Etkinlik QR’si üret</button>
              </form>
              <ul>
                {eventLinks.filter((link) => link.event_id === eventRow.id).map((link) => (
                  <li key={link.id}><code>{eventAttributionPath(link.public_id)}</code></li>
                ))}
              </ul>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
