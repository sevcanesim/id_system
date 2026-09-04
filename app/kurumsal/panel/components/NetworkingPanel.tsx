"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FOLLOW_UP_SCENARIOS } from "../../../../lib/commerce/packages";
import { EmptyState, LoadingState } from "../../../components/ui/States";
import { StatusBadge } from "../../../components/ui/DesignSystem";
import { Icon } from "../../../icons";
import { LEAD_STATUSES } from "../../../../lib/networking/catalog";
import { eventAttributionPath } from "../../../../lib/public-card/urls";
import type { Member, MemberCardStatus } from "../domain/types";

type View = "leads" | "events" | "meetings";

type Lead = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  company: string | null;
  position?: string | null;
  city: string;
  country: string;
  source: string;
  status: string;
  score: number;
  scoreLabel: string;
  interests: string[];
  created_at: string;
  counterpart?: {
    public_id?: string | null;
    slug?: string | null;
  } | null;
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

const STATUS_LABELS: Record<string, string> = {
  NEW: "Yeni",
  CONTACTED: "İletişime geçildi",
  QUALIFIED: "Nitelikli",
  MEETING_REQUESTED: "Görüşme bekliyor",
  MEETING_SCHEDULED: "Görüşme planlandı",
  WON: "Kazanıldı",
  CLOSED: "Kapandı",
};

function leadStatusTone(status: string): "info" | "warning" | "success" | "neutral" {
  if (status === "NEW") return "info";
  if (status === "CONTACTED" || status === "MEETING_REQUESTED") return "warning";
  if (status === "QUALIFIED" || status === "WON" || status === "MEETING_SCHEDULED") return "success";
  return "neutral";
}

const TIMELINE_LABELS: Record<string, string> = {
  QR_SCAN: "QR ile geldi",
  NFC_TAP: "NFC ile geldi",
  CONTACT_SHARED: "İletişim bilgilerini paylaştı",
  YENOMI_HANDSHAKE: "Yenomi ID ile kart takası yapıldı",
  LEAD_CREATED: "Bağlantı oluşturuldu",
  FOLLOWUP_SENT: "E-posta gönderildi",
  MEETING_ACCEPTED: "Görüşme kabul edildi",
  MEETING_ALTERNATIVE: "Alternatif görüşme önerildi",
  MEETING_DECLINED: "Görüşme reddedildi",
  MEETING_COMPLETED: "Görüşme tamamlandı",
};

function cleanPhone(value?: string | null) {
  return (value || "").replace(/[^\d]/g, "");
}

function sourceLabel(source: string) {
  const value = source.toUpperCase();
  if (value.includes("QR")) return "Yenomi ID · QR";
  if (value.includes("NFC")) return "Yenomi ID · NFC";
  return "Yenomi ID kartı";
}

function relativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function NetworkingPanel({
  view,
  organizationId,
  token,
  members = [],
  memberCardStatuses = [],
  variant = "organization",
}: {
  view: View;
  organizationId?: string;
  token: () => Promise<string | null>;
  members?: Member[];
  memberCardStatuses?: MemberCardStatus[];
  variant?: "organization" | "individual";
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventLinks, setEventLinks] = useState<EventLink[]>([]);
  const [timeline, setTimeline] = useState<Timeline[]>([]);
  const [credits, setCredits] = useState(0);
  const [creditLimit, setCreditLimit] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [eventForm, setEventForm] = useState({ name: "", location: "", booth: "", profileId: "" });

  async function load() {
    const access = await token();
    if (!access || (variant === "organization" && !organizationId)) {
      setLoaded(true);
      return;
    }
    try {
      const path = variant === "individual"
        ? "/api/networking/inbox"
        : `/api/organizations/networking?organizationId=${encodeURIComponent(organizationId || "")}`;
      const response = await fetch(path, {
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
      setCreditLimit(payload.mailCredits?.mail_credit_limit ?? 0);
      setMessage("");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    setLoaded(false);
    void load();
  }, [organizationId, view, variant]);

  async function post(body: Record<string, unknown>) {
    const access = await token();
    if (!access) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(variant === "individual" ? "/api/networking/inbox" : "/api/organizations/networking", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${access}` },
        body: JSON.stringify(variant === "individual" ? body : { organizationId, ...body }),
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
      <header className="p11-employees-header p11-networking-header">
        <div>
          <span>NETWORKING</span>
          <h2 id="p11-networking-title">{view === "leads" ? variant === "individual" ? "Kartından gelen bağlantılar" : "Leadler" : view === "events" ? "Etkinlikler" : "Görüşmeler"}</h2>
          <p>
            {view === "leads"
              ? variant === "individual"
                ? "Bir kişi kartındaki formdan iletişim bilgisini paylaştığında burada görünür. Durumunu güncelleyebilir, hazır bir mesaj seçip Network Mail ile takip edebilirsin."
                : "Kartınız üzerinden iletişim bilgilerini paylaşan kişileri burada takip edin ve sonraki adımı siz yönetin."
              : view === "events"
                ? "Etkinliklerinizi ve kartlarınıza bağlı etkinlik QR’lerini yönetin."
                : "Networking bağlantılarınız için planlanan görüşmeleri yönetin."}
          </p>
        </div>
        <div className="p11-org-capacity p11-mail-credits">
          <small>{variant === "individual" ? "Takip e-postası" : "Network Mail"}</small>
          <strong>{credits} / {creditLimit}</strong>
          <span>Kalan kredi</span>
        </div>
      </header>
      {loaded && view === "leads" && variant === "individual" && (
        <p className="p11-networking-message" role="note">
          <strong>Network Mail nasıl çalışır?</strong> Her gönderim 1 kredi kullanır; gönderen Yenomi ID olur ve yanıtlar doğrulanmış e-posta adresine gelir. Göndermeden önce kişiye uygun hazır mesajı seçebilirsin.
        </p>
      )}
      {message && <p className="p11-networking-message" role="status">{message}</p>}
      {loaded && view === "leads" && credits < 1 && (
        <p className="p11-networking-message" role="status">
          {variant === "individual"
            ? "E-posta göndermek için Network Mail kredisi gerekir."
            : "Network Mail bakiyesi yok. Yeni kredi şirket lisansından tanımlanır."}
        </p>
      )}
      {!loaded && <LoadingState label={view === "leads" ? "Leadler yükleniyor" : view === "events" ? "Etkinlikler yükleniyor" : "Görüşmeler yükleniyor"} />}

      {loaded && view === "leads" && (
        leads.length === 0 ? (
          <EmptyState compact icon="users" title="Henüz bağlantı yok" description={variant === "individual" ? "Kartını paylaştığında iletişim bilgilerini bırakan kişiler burada görünür. Her yeni bağlantı için takip e-postasını buradan yönetebilirsin." : "Kartınız üzerinden bilgilerini paylaşan kişiler burada görünür."} action={variant === "individual" ? { href: "/kartim", label: "Kartımı aç" } : { href: "/kurumsal/panel/etkinlikler", label: "Etkinlikleri aç" }} />
        ) : (
          <div className="p11-networking-list p11-networking-inbox">
            {leads.map((lead) => {
              const eventsForLead = timeline.filter((item) => item.lead_id === lead.id);
              const phone = cleanPhone(lead.phone);
              const counterpartHref = lead.counterpart?.public_id ? `/p/${lead.counterpart.public_id}` : null;
              return (
                <article className="p11-networking-lead" key={lead.id}>
                  <div className="p11-networking-lead__top">
                    <div className="p11-networking-lead__identity">
                      <span className="p11-networking-lead__avatar" aria-hidden="true">{lead.full_name.trim().charAt(0).toUpperCase()}</span>
                      <div>
                        <strong>{lead.full_name}</strong>
                        <span>{[lead.position, lead.company].filter(Boolean).join(" · ") || "Profesyonel bilgi paylaşılmadı"}</span>
                        <small>{sourceLabel(lead.source)} · {relativeDate(lead.created_at)}</small>
                      </div>
                    </div>
                    <StatusBadge tone={leadStatusTone(lead.status)} className="p11-networking-lead__status">
                      <Icon name={lead.status === "NEW" ? "sparkles" : lead.status === "WON" || lead.status === "QUALIFIED" ? "check" : "mail"} />
                      {STATUS_LABELS[lead.status] || lead.status}
                    </StatusBadge>
                  </div>

                  <div className="p11-networking-lead__contact">
                    <a href={`mailto:${lead.email}`}><Icon name="mail" />{lead.email}</a>
                    {lead.phone && <a href={`tel:${lead.phone}`}><Icon name="phone" />{lead.phone}</a>}
                  </div>

                  {eventsForLead.length > 0 && (
                    <div className="p11-networking-lead__timeline" aria-label="Bağlantı geçmişi">
                      {eventsForLead.slice(-3).map((item) => (
                        <StatusBadge key={`${item.kind}-${item.created_at}`} tone="neutral">
                          {TIMELINE_LABELS[item.kind] || "Bağlantı güncellendi"}
                        </StatusBadge>
                      ))}
                    </div>
                  )}

                  <div className="p11-networking-lead__footer">
                    <label className="p11-networking-field">
                      <span>Durum</span>
                      <select aria-label="Lead durumu" value={lead.status} onChange={(event) => void post({ action: "update_lead", leadId: lead.id, status: event.target.value })}>
                        {LEAD_STATUSES.map((status) => <option key={status} value={status}>{STATUS_LABELS[status] || status}</option>)}
                      </select>
                    </label>
                    <label className="p11-networking-field p11-networking-field--grow">
                      <span>E-posta</span>
                      <select
                        aria-label="Follow-up senaryosu"
                        value={templates[lead.id] || "EVENT_MET"}
                        onChange={(event) => setTemplates((current) => ({ ...current, [lead.id]: event.target.value }))}
                      >
                        {FOLLOW_UP_SCENARIOS.map((scenario) => <option key={scenario.code} value={scenario.code}>{scenario.label}</option>)}
                      </select>
                    </label>
                    <div className="p11-networking-quick-actions">
                      <button className="p11-networking-action p11-networking-action--primary" type="button" disabled={busy || credits < 1} onClick={() => void post({ action: "send_followup", leadId: lead.id, template: templates[lead.id] || "EVENT_MET" })}><Icon name="mail" />E-posta Gönder</button>
                      {phone && (
                        <a className="p11-networking-action" href={`https://wa.me/${phone}?text=${encodeURIComponent(`Merhaba ${lead.full_name}, bugün tanıştığımıza memnun oldum. İletişimde kalmak istedim.`)}`} target="_blank" rel="noreferrer"><Icon name="external" />WhatsApp</a>
                      )}
                      {counterpartHref && <a className="p11-networking-action" href={counterpartHref}><Icon name="id" />Dijital kartı aç</a>}
                      <a className="p11-networking-action" href="/kurumsal/panel/gorusmeler"><Icon name="clock" />Görüşmeler</a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )
      )}

      {loaded && view === "meetings" && (
        meetings.length === 0 ? (
          <EmptyState compact icon="contact" title="Planlanmış görüşme yok" description="Networking bağlantılarından oluşturulan görüşmeler burada görünür." action={{ href: "/kurumsal/panel/leadler", label: "Leadlere git" }} />
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

      {loaded && view === "events" && (
        <>
          <form className="p11-networking-form" onSubmit={createEvent}>
            <p className="p11-networking-form-kicker">Yeni etkinlik</p>
            <label>Etkinlik adı<input required value={eventForm.name} onChange={(event) => setEventForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <div className="p11-networking-form-row">
              <label>Lokasyon<input value={eventForm.location} onChange={(event) => setEventForm((current) => ({ ...current, location: event.target.value }))} /></label>
              <label>Stand<input value={eventForm.booth} onChange={(event) => setEventForm((current) => ({ ...current, booth: event.target.value }))} /></label>
            </div>
            <button type="submit" className="ds-button ds-button--primary" disabled={busy}>Etkinlik Oluştur</button>
          </form>
          {events.length === 0 ? (
            <p className="p11-networking-form-hint">Kayıt sonrası kişiye özel etkinlik QR’si üretilir.</p>
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
