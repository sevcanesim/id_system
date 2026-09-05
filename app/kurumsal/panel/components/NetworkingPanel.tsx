"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
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
  event_id?: string | null;
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
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

type EventLink = {
  id: string;
  event_id: string;
  profile_id: string;
  public_id: string;
  created_at?: string;
};

type Timeline = { lead_id: string; kind: string; created_at: string };
type EmailDraft = { subject: string; message: string };

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

function sourceLabel(source: string) {
  const value = source.toUpperCase();
  if (value.includes("EVENT")) return "Etkinlik · QR";
  if (value.includes("QR")) return "Yenomi ID · QR";
  if (value.includes("NFC")) return "Yenomi ID · NFC";
  return "Yenomi ID kartı";
}

function relativeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function eventDateRange(startsAt: string | null, endsAt: string | null) {
  const format = (value: string) => new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
  if (startsAt && endsAt) return `${format(startsAt)} – ${format(endsAt)}`;
  if (startsAt) return `${format(startsAt)} itibarıyla`;
  if (endsAt) return `${format(endsAt)} tarihine kadar`;
  return null;
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
  const [eventLeadCounts, setEventLeadCounts] = useState<Record<string, number>>({});
  const [eventQrImages, setEventQrImages] = useState<Record<string, string>>({});
  const [timeline, setTimeline] = useState<Timeline[]>([]);
  const [credits, setCredits] = useState(0);
  const [creditLimit, setCreditLimit] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, EmailDraft>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [eventForm, setEventForm] = useState({ name: "", location: "", booth: "", startsAt: "", endsAt: "" });
  const [eventProfileIds, setEventProfileIds] = useState<Record<string, string>>({});

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
      setEventLeadCounts(payload.eventLeadCounts || {});
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

  useEffect(() => {
    let cancelled = false;
    const origin = window.location.origin;
    void Promise.all(eventLinks.map(async (link) => [
      link.id,
      await QRCode.toDataURL(`${origin}${eventAttributionPath(link.public_id)}`, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: "M",
      }),
    ] as const)).then((images) => {
      if (!cancelled) setEventQrImages(Object.fromEntries(images));
    }).catch(() => {
      if (!cancelled) setEventQrImages({});
    });
    return () => { cancelled = true; };
  }, [eventLinks]);

  async function post(body: Record<string, unknown>) {
    const access = await token();
    if (!access) return false;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(variant === "individual" ? "/api/networking/inbox" : "/api/organizations/networking", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${access}` },
        body: JSON.stringify(variant === "individual" ? body : { organizationId, ...body }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error || "İşlem tamamlanamadı.");
        return false;
      }
      await load();
      return true;
    } finally {
      setBusy(false);
    }
  }

  function updateDraft(leadId: string, patch: Partial<EmailDraft>) {
    setDrafts((current) => ({
      ...current,
      [leadId]: { subject: current[leadId]?.subject || "", message: current[leadId]?.message || "", ...patch },
    }));
  }

  function validDraft(leadId: string) {
    const draft = drafts[leadId];
    return Boolean(draft && draft.subject.trim().length >= 2 && draft.message.trim().length >= 2);
  }

  async function sendCustomEmail(leadId: string) {
    const draft = drafts[leadId];
    if (!draft || draft.subject.trim().length < 2 || draft.message.trim().length < 2) {
      setMessage("Göndermeden önce e-posta konusu ve mesajını yazın.");
      return;
    }
    const sent = await post({ action: "send_followup", leadId, subject: draft.subject, message: draft.message });
    if (sent) {
      setDrafts((current) => ({ ...current, [leadId]: { subject: "", message: "" } }));
      setMessage("E-posta Network Mail ile gönderildi. 1 kredi kullanıldı.");
    }
  }

  async function createEvent(event: FormEvent) {
    event.preventDefault();
    const created = await post({
      action: "create_event",
      name: eventForm.name,
      location: eventForm.location,
      booth: eventForm.booth,
      startsAt: eventForm.startsAt || undefined,
      endsAt: eventForm.endsAt || undefined,
    });
    if (created) setEventForm({ name: "", location: "", booth: "", startsAt: "", endsAt: "" });
  }

  async function addProfileToEvent(eventId: string) {
    const profileId = eventProfileIds[eventId];
    if (!profileId) return;
    const created = await post({ action: "create_event_link", eventId, profileId });
    if (created) setEventProfileIds((current) => ({ ...current, [eventId]: "" }));
  }

  async function copyEventLink(publicId: string) {
    const url = `${window.location.origin}${eventAttributionPath(publicId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Etkinlik QR bağlantısı kopyalandı.");
    } catch {
      setMessage("Bağlantı kopyalanamadı. QR sayfasını açıp adres çubuğundan kopyalayın.");
    }
  }

  const cardOptions = useMemo(
    () => memberCardStatuses.filter((item) => item.profileId).map((item) => ({
      profileId: item.profileId as string,
      label: members.find((member) => member.id === item.memberId)?.full_name || item.slug || item.profileId,
    })),
    [memberCardStatuses, members],
  );

  const eventNameById = useMemo(() => new Map(events.map((event) => [event.id, event.name])), [events]);

  const leadName = (leadId: string) => leads.find((lead) => lead.id === leadId)?.full_name || "Lead";

  return (
    <section className="p11-employees p11-networking" aria-labelledby="p11-networking-title">
      <header className="p11-employees-header p11-networking-header">
        <div>
          <span>NETWORKING</span>
          <h2 id="p11-networking-title">{view === "leads" ? variant === "individual" ? "Kartından gelen bağlantılar" : "Leadler" : view === "events" ? "Etkinlik kampanyaları" : "Görüşmeler"}</h2>
          <p>
            {view === "leads"
              ? variant === "individual"
                ? "Bir kişi kartındaki formdan iletişim bilgisini paylaştığında burada görünür. Durumunu güncelleyebilir, kendi e-posta taslağını hazırlayıp Network Mail ile takip edebilirsin."
                : "Kartınız üzerinden iletişim bilgilerini paylaşan kişileri burada takip edin ve sonraki adımı siz yönetin."
              : view === "events"
                ? "Fuar, konferans ve saha buluşmalarında oluşan lead’leri kaynaklarıyla birlikte izlemek için etkinlik kampanyaları oluşturun."
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
          <strong>Network Mail ile gönder.</strong> Konu ve mesajını sen yaz; kaydedilen alıcı e-postası görünmeden güvenle kullanılır ve her gönderimde 1 kredi düşer.
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
              const counterpartHref = lead.counterpart?.public_id ? `/p/${lead.counterpart.public_id}` : null;
              return (
                <article className="p11-networking-lead" key={lead.id}>
                  <div className="p11-networking-lead__top">
                    <div className="p11-networking-lead__identity">
                      <span className="p11-networking-lead__avatar" aria-hidden="true">{lead.full_name.trim().charAt(0).toUpperCase()}</span>
                      <div>
                        <strong>{lead.full_name}</strong>
                        <span>{[lead.position, lead.company].filter(Boolean).join(" · ") || "Profesyonel bilgi paylaşılmadı"}</span>
                        <small>{sourceLabel(lead.source)}{lead.event_id ? ` · ${eventNameById.get(lead.event_id) || "Etkinlik"}` : ""} · {relativeDate(lead.created_at)}</small>
                      </div>
                    </div>
                    <StatusBadge tone={leadStatusTone(lead.status)} className="p11-networking-lead__status">
                      <Icon name={lead.status === "NEW" ? "sparkles" : lead.status === "WON" || lead.status === "QUALIFIED" ? "check" : "mail"} />
                      {STATUS_LABELS[lead.status] || lead.status}
                    </StatusBadge>
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
                    <div className="p11-networking-compose">
                      <div className="p11-networking-compose__heading">
                        <span>E-posta taslağı</span>
                        <small>Alıcı e-posta bilgisi kaydedildi</small>
                      </div>
                      <label className="p11-networking-field">
                        <span>Konu</span>
                        <input
                          aria-label="E-posta konusu"
                          maxLength={180}
                          placeholder="E-postanın konusu"
                          value={drafts[lead.id]?.subject || ""}
                          onChange={(event) => updateDraft(lead.id, { subject: event.target.value })}
                        />
                      </label>
                      <label className="p11-networking-field">
                        <span>Mesaj</span>
                        <textarea
                          aria-label="E-posta mesajı"
                          maxLength={4000}
                          placeholder={`Merhaba ${lead.full_name},`}
                          value={drafts[lead.id]?.message || ""}
                          onChange={(event) => updateDraft(lead.id, { message: event.target.value })}
                        />
                      </label>
                    </div>
                    <div className="p11-networking-quick-actions">
                      <button className="p11-networking-action p11-networking-action--primary" type="button" disabled={busy || credits < 1 || !validDraft(lead.id)} onClick={() => void sendCustomEmail(lead.id)}><Icon name="mail" />Network Mail ile gönder</button>
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
          <aside className="p11-event-campaign-intro" aria-label="Etkinlik kampanyası amacı">
            <Icon name="analytics" />
            <div>
              <strong>Etkinlikte hangi temasların lead’e dönüştüğünü görün.</strong>
              <p>Bu kampanyaya eklenen çalışan kartlarının QR’ı okutulduğunda, bırakılan iletişim bilgisi Leadler’de etkinlik adı ve kart sahibiyle birlikte kaydedilir.</p>
            </div>
          </aside>
          <form className="p11-networking-form" onSubmit={createEvent}>
            <p className="p11-networking-form-kicker">Yeni etkinlik kampanyası</p>
            <p className="p11-networking-form-copy">Fuar, konferans veya saha buluşması için ayrı bir kaynak oluşturun. Sonraki adımda katılan çalışanların kartlarını bu kampanyaya bağlayacaksınız.</p>
            <label>Etkinlik adı<input required placeholder="Örn. Web Summit 2026" value={eventForm.name} onChange={(event) => setEventForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <div className="p11-networking-form-row">
              <label>Lokasyon<input value={eventForm.location} onChange={(event) => setEventForm((current) => ({ ...current, location: event.target.value }))} /></label>
              <label>Stand<input value={eventForm.booth} onChange={(event) => setEventForm((current) => ({ ...current, booth: event.target.value }))} /></label>
            </div>
            <div className="p11-networking-form-row">
              <label>Başlangıç <input type="datetime-local" value={eventForm.startsAt} onChange={(event) => setEventForm((current) => ({ ...current, startsAt: event.target.value }))} /></label>
              <label>Bitiş <input type="datetime-local" value={eventForm.endsAt} onChange={(event) => setEventForm((current) => ({ ...current, endsAt: event.target.value }))} /></label>
            </div>
            <button type="submit" className="ds-button ds-button--primary" disabled={busy}>Kampanyayı oluştur</button>
          </form>
          {events.length === 0 ? (
            <p className="p11-networking-form-hint">Kampanya oluşturduktan sonra etkinlikteki çalışan kartlarını ekleyin. Her QR taraması bu etkinliğe kaynak olarak yazılır.</p>
          ) : events.map((eventRow) => {
            const linksForEvent = eventLinks.filter((link) => link.event_id === eventRow.id);
            const linkedProfileIds = new Set(linksForEvent.map((link) => link.profile_id));
            const availableCards = cardOptions.filter((option) => !linkedProfileIds.has(option.profileId));
            const dateRange = eventDateRange(eventRow.starts_at, eventRow.ends_at);
            const leadCount = eventLeadCounts[eventRow.id] || 0;
            return (
              <article className="p11-networking-event p11-event-campaign" key={eventRow.id}>
                <header className="p11-event-campaign__header">
                  <div>
                    <p className="p11-networking-form-kicker">Etkinlik kampanyası</p>
                    <strong>{eventRow.name}</strong>
                    <span>{[eventRow.location, eventRow.booth, dateRange].filter(Boolean).join(" · ") || "Tarih ve lokasyon henüz belirtilmedi"}</span>
                  </div>
                  <StatusBadge tone={linksForEvent.length ? "success" : "warning"}>
                    <Icon name={linksForEvent.length ? "check" : "alert"} />
                    {linksForEvent.length ? "QR dağıtıma hazır" : "Ekip kartı bekliyor"}
                  </StatusBadge>
                </header>

                <dl className="p11-event-campaign__metrics">
                  <div><dt>Bağlı kart</dt><dd>{linksForEvent.length}</dd></div>
                  <div><dt>Etkinlik leadi</dt><dd>{leadCount}</dd></div>
                  <div><dt>Kaynak</dt><dd>QR taraması</dd></div>
                </dl>

                <form className="p11-event-campaign__assign" onSubmit={(submitEvent) => { submitEvent.preventDefault(); void addProfileToEvent(eventRow.id); }}>
                  <div>
                    <strong>Katılan ekip kartlarını bağla</strong>
                    <span>Bu QR ile açılan kartta iletişim bilgisini bırakan kişiler otomatik olarak <b>{eventRow.name}</b> kaynağıyla Leadler’e düşer.</span>
                  </div>
                  <label>
                    <span>Çalışan kartı</span>
                    <select required value={eventProfileIds[eventRow.id] || ""} onChange={(changeEvent) => setEventProfileIds((current) => ({ ...current, [eventRow.id]: changeEvent.target.value }))} disabled={availableCards.length === 0}>
                      <option value="">{availableCards.length ? "Kart seçin" : "Eklenebilecek kart yok"}</option>
                      {availableCards.map((option) => <option key={option.profileId} value={option.profileId}>{option.label}</option>)}
                    </select>
                  </label>
                  <button type="submit" disabled={busy || !eventProfileIds[eventRow.id] || availableCards.length === 0}><Icon name="qr" />Kartı kampanyaya ekle</button>
                </form>

                {linksForEvent.length === 0 ? (
                  <p className="p11-event-campaign__empty">Henüz kart bağlı değil. Etkinlikte QR’ı gösterecek çalışanları ekleyin.</p>
                ) : (
                  <div className="p11-event-campaign__links" aria-label="Etkinlikte kullanılacak kart QR kodları">
                    {linksForEvent.map((link) => {
                      const cardName = cardOptions.find((option) => option.profileId === link.profile_id)?.label || "Çalışan kartı";
                      const eventPath = eventAttributionPath(link.public_id);
                      return (
                        <section className="p11-event-qr" key={link.id}>
                          {eventQrImages[link.id] ? <img src={eventQrImages[link.id]} alt={`${cardName} için ${eventRow.name} QR kodu`} /> : <div className="p11-event-qr__loading"><Icon name="qr" /></div>}
                          <div>
                            <strong>{cardName}</strong>
                            <span>Etkinlik QR’ı hazır · taramalar bu kampanyaya bağlanır.</span>
                            <div className="p11-event-qr__actions">
                              <a href={eventPath} target="_blank" rel="noreferrer"><Icon name="external" />QR sayfasını aç</a>
                              <button type="button" onClick={() => void copyEventLink(link.public_id)}><Icon name="copy" />Bağlantıyı kopyala</button>
                            </div>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
                <a className="p11-event-campaign__leads" href="/kurumsal/panel/leadler"><Icon name="analytics" />Bu etkinliğin leadlerini Leadler’de takip et</a>
              </article>
            );
          })}
        </>
      )}
    </section>
  );
}
