"use client";

import { useEffect, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Icon } from "../../../icons";
import { EmptyState, LoadingState } from "../../../components/ui/States";
import { Button, StatusBadge } from "../../../components/ui/DesignSystem";
import { Drawer, Tabs } from "../../../components/ui/Interactive";
import CardTemplate, { type CardBranding } from "../../../CardTemplate";
import { DEPARTMENT_OPTIONS, TITLE_OPTIONS, normalizeEmailField } from "../../../../lib/form-standards";
import type { MemberActionTarget, MemberCardStatus, MemberProfile } from "../domain/types";
import { memberStatusLabel, physicalCardLabel } from "../../../../lib/organizations/lifecycle";
import type { MemberStatus, PhysicalCardStatus } from "../../../../lib/organizations/lifecycle";
import { isOrganizationRole } from "../../../../lib/organizations/permissions";

export type DrawerMember = MemberActionTarget;

type PhysicalCard = {
  id: string;
  cardCodeMasked: string;
  status: PhysicalCardStatus;
  ownerUserId: string | null;
  activatedAt: string | null;
  lostAt: string | null;
  disabledAt: string | null;
  replacedByCardId: string | null;
};

type ViewedProfile = {
  memberId: string;
  memberName: string;
  memberStatus: string;
  profiles: MemberProfile[];
  physicalCards: Array<{ id: string; status: string; hasProfile: boolean }>;
  identityChanges: Array<{
    id: string;
    field: "name" | "email";
    old_value: string | null;
    new_value: string | null;
    changed_at: string;
  }>;
};

type CorporateLink = {
  id: string | null;
  kind: string;
  label: string;
  subtitle: string;
  configured: boolean;
  linkType: string | null;
  url: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  publishAt: string | null;
};

type Template = {
  id: string;
  name: string;
  primary_color: string | null;
  logo_url: string | null;
  is_default: boolean;
  fields?: Record<string, string | boolean>;
};

type Org = {
  organization_id: string;
  role: string;
  department?: string | null;
  organizations: { id: string; name: string; slug: string; status: string } | null;
};

type MemberEditDraft = {
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  department: string;
  role: string;
};

function physicalCardTone(status: PhysicalCardStatus) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "LOST") return "warning" as const;
  if (status === "DISABLED") return "error" as const;
  return "neutral" as const;
}

type Props = {
  drawerMember: DrawerMember;
  drawerTab: "profile" | "card" | "invite" | "lifecycle";
  setDrawerTab: Dispatch<SetStateAction<"profile" | "card" | "invite" | "lifecycle">>;
  setDrawerMemberId: Dispatch<SetStateAction<string | null>>;
  memberEdit: MemberEditDraft;
  setMemberEdit: Dispatch<SetStateAction<MemberEditDraft>>;
  memberEditBusy: boolean;
  saveMemberIdentity: (event: FormEvent) => void | Promise<void>;
  org: Org | null | undefined;
  physicalCards: PhysicalCard[];
  memberCardStatuses: MemberCardStatus[];
  cardBusy: string | null;
  viewLoading: string | null;
  viewedProfile: ViewedProfile | null;
  setViewedProfile: Dispatch<SetStateAction<ViewedProfile | null>>;
  viewMemberProfile: (member: DrawerMember) => void | Promise<void>;
  corporateLinks: CorporateLink[];
  templates: Template[];
  changeStatus: (memberId: string, status: MemberStatus) => void | Promise<void>;
  inviteAction: (memberId: string, action: "RESEND" | "REVOKE") => void | Promise<void>;
  linkReplacementCard: (oldCardId: string, newCardId: string) => void | Promise<void>;
  toggleCardStatus: (cardId: string, status: "ACTIVE" | "DISABLED") => void | Promise<void>;
  initials: (member: DrawerMember) => string;
  roleLabel: (role: string) => string;
};

function templateVariant(fields: Record<string, string | boolean>): CardBranding["variant"] {
  // Variants remain available in the codebase, but the launch surface has one
  // approved corporate template so previews match the public card experience.
  void fields;
  return "ESSENTIAL";
}

export default function EmployeeDrawer({
  drawerMember,
  drawerTab,
  setDrawerTab,
  setDrawerMemberId,
  memberEdit,
  setMemberEdit,
  memberEditBusy,
  saveMemberIdentity,
  org,
  physicalCards,
  memberCardStatuses,
  cardBusy,
  viewLoading,
  viewedProfile,
  setViewedProfile,
  viewMemberProfile,
  corporateLinks,
  templates,
  changeStatus,
  inviteAction,
  linkReplacementCard,
  toggleCardStatus,
  initials,
  roleLabel,
}: Props) {
  const memberPublicId = `YI-M-${drawerMember.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const cardState = memberCardStatuses.find((cardStatus) => cardStatus.memberId === drawerMember.id);
  const assignedCards = physicalCards.filter(
    (physicalCard) => Boolean(drawerMember.user_id) && physicalCard.ownerUserId === drawerMember.user_id,
  );
  const lifecycle = [
    {
      label: "Çalışan kaydı",
      done: true,
      detail: new Date(drawerMember.created_at).toLocaleDateString("tr-TR"),
    },
    {
      label: "Davet kabulü",
      done: drawerMember.status !== "INVITED",
      detail: drawerMember.status === "INVITED" ? "Bekleniyor" : "Tamamlandı",
    },
    {
      label: "Dijital profil",
      done: Boolean(cardState?.hasDigitalCard),
      detail: cardState?.hasDigitalCard ? (cardState.published ? "Yayında" : "Taslak hazır") : "Oluşturulmadı",
    },
    {
      label: "Fiziksel NFC kart",
      done: assignedCards.length > 0,
      detail: assignedCards.length ? `${assignedCards[0].cardCodeMasked} · ${assignedCards[0].status}` : "Atanmadı",
    },
    {
      label: "Aktif kullanım",
      done: drawerMember.status === "ACTIVE",
      detail:
        drawerMember.status === "ACTIVE"
          ? "Aktif"
          : drawerMember.status === "SUSPENDED"
            ? "Pasif"
            : drawerMember.status === "LEFT"
              ? "İşten ayrıldı"
              : "Davet bekliyor",
    },
  ];

  useEffect(() => {
    void viewMemberProfile(drawerMember);
  }, [drawerMember.id]);

  function closeDrawer() {
    setDrawerMemberId(null);
    setViewedProfile(null);
  }

  const previewReady = viewedProfile?.memberId === drawerMember.id && viewedProfile.profiles.length > 0;
  const previewTitle =
    viewLoading === drawerMember.id ? "Kart önizlemesi" : previewReady ? "Kart hazır" : "Kart henüz oluşturulmadı";
  const roleSummary = drawerMember.role === "OWNER" ? "Şirket Sahibi" : roleLabel(drawerMember.role);
  const statusSummary = memberStatusLabel(drawerMember.status);
  const digitalCardSummary = cardState?.published ? "Dijital profil yayında" : cardState?.hasDigitalCard ? "Dijital profil taslak" : "Dijital profil oluşturulmadı";
  const physicalCardSummary = assignedCards.length
    ? `NFC kart ${physicalCardLabel(assignedCards[0].status).toLocaleLowerCase("tr-TR")}`
    : "NFC kart atanmamış";

  return (
    <Drawer open title="Çalışan Detay" className="v25-employee-drawer" onClose={closeDrawer}>
      <div className="v25-drawer-identity">
        <span className="ds-avatar ds-avatar--lg" aria-hidden="true">{initials(drawerMember)}</span>
        <div>
          <strong>{drawerMember.full_name || drawerMember.email}</strong>
          <small>{drawerMember.email}</small>
          <span>
            {roleSummary} · {statusSummary}
            {` · ${digitalCardSummary} · ${physicalCardSummary}`}
          </span>
          {(drawerMember.title || drawerMember.department) && (
            <span>
              {drawerMember.title || ""}
              {drawerMember.title && drawerMember.department ? " · " : ""}
              {drawerMember.department || ""}
            </span>
          )}
        </div>
      </div>

      <section className="v25-status-summary" aria-label="Kart ve erişim özeti">
        <header><small>KART VE ERİŞİM ÖZETİ</small></header>
        <dl>
          <div className={cardState?.published ? "is-active" : ""}><dt>Dijital profil</dt><dd>{cardState?.published ? "Yayında" : cardState?.hasDigitalCard ? "Taslak hazır" : "Oluşturulmadı"}</dd></div>
          <div className={assignedCards.length ? "is-active" : ""}><dt>Fiziksel NFC kart</dt><dd>{assignedCards.length ? physicalCardLabel(assignedCards[0].status) : "Atanmamış"}</dd></div>
          <div className={drawerMember.status === "ACTIVE" ? "is-active" : ""}><dt>Hesap erişimi</dt><dd>{statusSummary}</dd></div>
        </dl>
      </section>

      <div className="v25-drawer-workspace">
        <div className="v25-drawer-main">
          <p className="v25-drawer-manage-label">Çalışanı yönet</p>
          <Tabs
            label="Çalışan detay alanları"
            active={drawerTab}
            onChange={(id) => {
              if (id === "profile") setDrawerTab("profile");
              else if (id === "card") setDrawerTab("card");
              else if (id === "invite") setDrawerTab("invite");
              else setDrawerTab("lifecycle");
            }}
            items={[
              { id: "profile", label: "Profil" },
              { id: "card", label: "Kart" },
              { id: "invite", label: "Davet" },
              { id: "lifecycle", label: "Erişim & Durum" },
            ]}
          />

          {drawerTab === "profile" && (
            <form className="v25-employee-form" onSubmit={saveMemberIdentity}>
              <div className="v25-section-heading">
                <div>
                  <small>ŞİRKET TARAFINDAN YÖNETİLİR <Icon name="lock" /></small>
                  <h3>Kurumsal kimlik</h3>
                  <p>Bu alanlar İK/yönetici tarafından merkezi olarak yönetilir ve kurumsal karta yansır.</p>
                </div>
              </div>
              <div className="ds-form-grid">
                <label className="ds-field">
                  <span className="ds-label">Ad</span>
                  <input className="ds-input" required value={memberEdit.firstName} onChange={(event) => setMemberEdit((value) => ({ ...value, firstName: event.target.value }))} />
                </label>
                <label className="ds-field">
                  <span className="ds-label">Soyad</span>
                  <input className="ds-input" required value={memberEdit.lastName} onChange={(event) => setMemberEdit((value) => ({ ...value, lastName: event.target.value }))} />
                </label>
                <label className="ds-field corporate-lead-full">
                  <span className="ds-label">Kurumsal e-posta</span>
                  <input
                    className="ds-input"
                    required
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={254}
                    value={memberEdit.email}
                    onChange={(event) => setMemberEdit((value) => ({ ...value, email: event.target.value }))}
                    onBlur={() => setMemberEdit((value) => ({ ...value, email: normalizeEmailField(value.email) }))}
                  />
                  <small className="ds-help">Aktif kullanıcının giriş e-postası değişmez; bu alan kurumsal iletişim adresidir.</small>
                </label>
                <label className="ds-field">
                  <span className="ds-label">Ünvan</span>
                  <input className="ds-input" list="corporate-title-options" value={memberEdit.title} placeholder="Seç veya yaz" onChange={(event) => setMemberEdit((value) => ({ ...value, title: event.target.value }))} />
                </label>
                <label className="ds-field">
                  <span className="ds-label">Departman</span>
                  <input className="ds-input" list="corporate-department-options" value={memberEdit.department} placeholder="Seç veya yaz" onChange={(event) => setMemberEdit((value) => ({ ...value, department: event.target.value }))} />
                </label>
                <div className="ds-field corporate-lead-full v25-readonly-role">
                  <span className="ds-label">Sistem rolü</span>
                  <div className="ds-input v25-readonly-role-value" aria-readonly="true">{roleLabel(drawerMember.role)}</div>
                  <small className="ds-help">Rol değişiklikleri yetki matrisi üzerinden ayrı olarak yönetilir.</small>
                </div>
              </div>
              <datalist id="corporate-title-options">{TITLE_OPTIONS.map((option) => <option key={option} value={option} />)}</datalist>
              <datalist id="corporate-department-options">{DEPARTMENT_OPTIONS.map((option) => <option key={option} value={option} />)}</datalist>
              {drawerMember.status === "INVITED" && memberEdit.email.toLowerCase() !== drawerMember.email.toLowerCase() && (
                <div className="v25-inline-warning">
                  <Icon name="mail" />
                  <span><strong>Davet adresi değişiyor.</strong> Kaydettiğinde eski davet geçersizleşir ve yeni e-posta adresine yeni davet gönderilir.</span>
                </div>
              )}
              <div className="v25-drawer-actions">
                <Button type="submit" variant="primary" disabled={memberEditBusy}>
                  {memberEditBusy ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
                </Button>
              </div>
            </form>
          )}

          {drawerTab === "invite" && (
            <section className="v25-invite-detail">
              <div className="v25-section-heading">
                <div>
                  <small>DAVET</small>
                  <h3>{drawerMember.status === "INVITED" ? "Davet bekliyor" : "Davet tamamlandı"}</h3>
                  <p>
                    {drawerMember.status === "INVITED"
                      ? "Çalışan henüz hesabını aktive etmedi."
                      : "Çalışanın üyelik kaydı aktif veya tamamlanmış durumda."}
                  </p>
                </div>
                <Icon name="mail" />
              </div>
              <dl>
                <div><dt>Ad Soyad</dt><dd>{drawerMember.full_name || "—"}</dd></div>
                <div><dt>E-posta</dt><dd>{drawerMember.email}</dd></div>
                <div><dt>Rol</dt><dd>{roleLabel(drawerMember.role)}</dd></div>
                <div><dt>Departman</dt><dd>{drawerMember.department || "Belirtilmedi"}</dd></div>
                <div><dt>Çalışan ID</dt><dd><code>{memberPublicId}</code></dd></div>
              </dl>
              {drawerMember.status === "INVITED" ? (
                <div className="v25-drawer-actions">
                  <Button type="button" variant="primary" onClick={() => void inviteAction(drawerMember.id, "RESEND")}>
                    <Icon name="mail" /> Daveti Yeniden Gönder
                  </Button>
                  <Button type="button" variant="destructive" onClick={() => void inviteAction(drawerMember.id, "REVOKE")}>
                    Daveti İptal Et
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setDrawerTab("profile")}>
                    <Icon name="pencil" /> Bilgileri Düzenle
                  </Button>
                </div>
              ) : (
                <div className="v25-complete-state">
                  <Icon name="check" />
                  <span>Davet aşaması tamamlandı.</span>
                </div>
              )}
            </section>
          )}

          {drawerTab === "card" && (
            <section className="v25-card-drawer">
              <div className="v25-physical-card-controls">
                <div className="v25-section-heading">
                  <div>
                    <small>FİZİKSEL KARTLAR</small>
                    <h3>{assignedCards.length ? `${assignedCards.length} kart bağlı` : "Fiziksel kart atanmadı"}</h3>
                    <p>
                      Kayıp kart çalışan tarafından bildirilir; yönetici aktif kartı devre dışı bırakabilir veya yeniden etkinleştirebilir.
                      <span className="v25-immutability-note">Fiziksel kart aktive edildikten sonra başka bir çalışana devredilemez.</span>
                    </p>
                  </div>
                  <StatusBadge tone={assignedCards.length ? "success" : "neutral"} className="v25-physical-card-summary"><Icon name="nfc" />{assignedCards.length ? "Kart bağlı" : "Atanmamış"}</StatusBadge>
                </div>
                {assignedCards.length === 0 ? (
                  <div className="v25-empty-line"><Icon name="nfc" />Bu çalışana bağlı fiziksel kart bulunmuyor.<StatusBadge tone="neutral">Atanmamış</StatusBadge></div>
                ) : (
                  assignedCards.map((card) => {
                    const replacementCandidate = assignedCards.find(
                      (candidate) => candidate.id !== card.id && candidate.status === "ACTIVE" && !candidate.replacedByCardId,
                    );
                    const replacementCard = card.replacedByCardId
                      ? assignedCards.find((candidate) => candidate.id === card.replacedByCardId)
                      : null;
                    return (
                      <article key={card.id} className="v25-physical-control-row">
                        <div>
                          <strong>{card.cardCodeMasked}</strong>
                          <StatusBadge tone={physicalCardTone(card.status)} className="v25-physical-card-status"><Icon name="nfc" />{physicalCardLabel(card.status)}</StatusBadge>
                          {card.replacedByCardId && (
                            <small>
                              Yeni kartla değiştirildi
                              {replacementCard ? ` · ${replacementCard.cardCodeMasked}` : ""}
                            </small>
                          )}
                        </div>
                        {card.status === "ACTIVE" ? (
                          <Button type="button" variant="destructive" size="sm" disabled={cardBusy === card.id} onClick={() => void toggleCardStatus(card.id, "DISABLED")}>
                            Devre Dışı Bırak
                          </Button>
                        ) : card.status === "DISABLED" && !card.replacedByCardId ? (
                          <Button type="button" variant="secondary-strong" size="sm" disabled={cardBusy === card.id} onClick={() => void toggleCardStatus(card.id, "ACTIVE")}>
                            Yeniden Etkinleştir
                          </Button>
                        ) : (card.status === "LOST" || card.status === "DISABLED") && !card.replacedByCardId && replacementCandidate ? (
                          <Button type="button" size="sm" disabled={cardBusy === card.id} onClick={() => void linkReplacementCard(card.id, replacementCandidate.id)}>
                            Yeni Kartla Eşleştir
                          </Button>
                        ) : (
                          <small>
                            {card.replacedByCardId
                              ? "Bu kart değiştirildi. Eski kart tekrar etkinleştirilemez; çalışanın dijital profili değişmeden devam eder."
                              : card.status === "LOST"
                                ? "Yeni kart aktive edildiğinde replacement olarak eşleştirilebilir"
                                : "Yönetim aksiyonu yok"}
                          </small>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {drawerTab === "lifecycle" && (
            <section className="v25-lifecycle">
              <div className="v25-section-heading">
                <div>
                  <small>ERİŞİM VE DURUM</small>
                  <h3>Çalışan durumu</h3>
                  <p>Davet, dijital profil ve fiziksel NFC kart aşamalarının tek görünümü.</p>
                </div>
                <Icon name="analytics" />
              </div>
              <ol>
                {lifecycle.map((step, index) => (
                  <li key={step.label} className={step.done ? "done" : "pending"}>
                    <i>{step.done ? <Icon name="check" /> : index + 1}</i>
                    <div>
                      <strong>{step.label}</strong>
                      <span>{step.detail}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="v25-identity-audit">
                <div>
                  <small>KİMLİK DEĞİŞİKLİKLERİ</small>
                  <strong>Ad ve e-posta denetim geçmişi</strong>
                  <p>Kilitli olmayan alanlarda çalışan tarafından yapılan son 50 değişiklik.</p>
                </div>
                {viewLoading === drawerMember.id ? (
                  <LoadingState label="Değişiklik geçmişi yükleniyor" />
                ) : viewedProfile?.memberId === drawerMember.id && viewedProfile.identityChanges.length ? (
                  <ul>
                    {viewedProfile.identityChanges.map((change) => (
                      <li key={change.id}>
                        <i><Icon name={change.field === "email" ? "mail" : "contact"} /></i>
                        <div>
                          <strong>{change.field === "email" ? "E-posta" : "Ad Soyad"}</strong>
                          <span><del>{change.old_value || "Boş"}</del><b aria-hidden>→</b>{change.new_value || "Boş"}</span>
                        </div>
                        <time dateTime={change.changed_at}>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(change.changed_at))}</time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="v25-identity-audit-empty">Henüz kaydedilmiş bir ad veya e-posta değişikliği yok.</p>
                )}
              </div>
              {drawerMember.role !== "OWNER" && (
                <div className="v25-danger-zone">
                  <strong>Çalışan durumu</strong>
                  <p>Pasife alma ve işten ayrılma işlemleri kart erişimini etkiler.</p>
                  <div className="v25-drawer-actions">
                    {drawerMember.status === "ACTIVE" && (
                      <Button
                        type="button"
                        onClick={() => {
                          if (!window.confirm("Bu çalışanı pasife almak dijital ve fiziksel kart erişimini sınırlandırabilir. Devam edilsin mi?")) return;
                          void changeStatus(drawerMember.id, "SUSPENDED");
                        }}
                      >
                        Pasife Al
                      </Button>
                    )}
                    {drawerMember.status === "SUSPENDED" && (
                      <Button type="button" variant="primary" onClick={() => void changeStatus(drawerMember.id, "ACTIVE")}>
                        Yeniden Aktif Et
                      </Button>
                    )}
                    {(drawerMember.status === "ACTIVE" || drawerMember.status === "SUSPENDED") && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          if (!window.confirm("Çalışanı şirketten ayırmak profil erişimini durdurur, kartları devre dışı bırakır ve lisansı serbest bırakır. Bu işlem uygulansın mı?")) return;
                          void changeStatus(drawerMember.id, "LEFT");
                        }}
                      >
                        İşten Ayrıldı
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="v25-drawer-preview">
          <div className="v25-section-heading">
            <div>
              <small>DİJİTAL KART · salt okunur</small>
              <h3>{previewTitle}</h3>
              <p>Bu görünüm yalnızca görüntüleme amaçlıdır; çalışan kartını yalnızca kendi hesabından düzenleyebilir.</p>
            </div>
            <Icon name="contact" />
          </div>
          {viewLoading === drawerMember.id ? (
            <LoadingState label="Kart yükleniyor" />
          ) : previewReady ? (
            viewedProfile!.profiles.map((profile) => {
              const currentTemplate = templates[0];
              const fields = currentTemplate?.fields || {};
              const branding: CardBranding = {
                logoUrl: currentTemplate?.logo_url || null,
                primaryColor: currentTemplate?.primary_color || null,
                companyName: org?.organizations?.name || null,
                variant: templateVariant(fields),
              };
              return (
                <div className="v25-card-preview-wrap" key={profile.id}>
                  <div className="p8-preview-stage">
                    <CardTemplate
                      preview
                      slug={profile.slug}
                      publicId={profile.public_id}
                      branding={branding}
                      corporateRole={isOrganizationRole(drawerMember.role) ? drawerMember.role : null}
                      data={{
                        name: drawerMember.full_name || profile.name || "",
                        role: drawerMember.title || profile.role || "",
                        company: profile.company || org?.organizations?.name || "",
                        phone: profile.phone || "",
                        whatsapp: profile.whatsapp || "",
                        email: drawerMember.email || profile.email || "",
                        website: profile.website || "",
                        linkedin: profile.linkedin || "",
                        instagram: profile.instagram || "",
                        location: profile.location || "",
                        image: profile.image_url || "",
                        links: corporateLinks
                          .filter((link) => link.configured && link.isPublished && Boolean(link.fileUrl || link.url))
                          .map((link) => ({
                            title: link.label,
                            subtitle: link.subtitle,
                            href: link.fileUrl || link.url || "#",
                            kind: "external" as const,
                          })),
                      }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyState
              compact
              icon="contact"
              title={
                drawerMember.status === "INVITED"
                  ? "Davet henüz kabul edilmedi"
                  : drawerMember.status === "LEFT" || drawerMember.status === "SUSPENDED"
                    ? "Bu çalışan artık aktif değil"
                    : "Kurumsal kart henüz oluşturulmadı"
              }
              description={
                drawerMember.status === "INVITED"
                  ? "Çalışan daveti kabul ettikten sonra kartını oluşturabilir."
                  : drawerMember.status === "LEFT" || drawerMember.status === "SUSPENDED"
                    ? "Kart görüntüleme ve kullanım durumu çalışan statüsüne göre sınırlandırılmıştır."
                    : "Çalışan kendi hesabından kişisel alanları tamamladığında kart burada görünür."
              }
            />
          )}
        </aside>
      </div>
    </Drawer>
  );
}
