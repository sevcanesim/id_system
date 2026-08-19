import type { Dispatch, FormEvent, SetStateAction } from "react";
import { Icon } from "../../../icons";
import { LoadingState } from "../../../components/ui/States";
import CardTemplate, { type CardBranding } from "../../../CardTemplate";
import { normalizeEmailField } from "../../../../lib/form-standards";
import type { MemberActionTarget, MemberCardStatus } from "../domain/types";
import { physicalCardLabel } from "../../../../lib/organizations/lifecycle";
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


type MemberProfile = {
  id: string;
  slug: string;
  name: string;
  role: string;
  company: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  linkedin: string | null;
  instagram: string | null;
  location: string | null;
  image_url: string | null;
  is_published: boolean;
  updated_at: string;
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

// Kurumsal panelin çalışan detay çekmecesi (EmployeeDrawer): kart
// önizlemesi, kimlik düzenleme, yaşam döngüsü/denetim geçmişi ve fiziksel
// kart aksiyonları. page.tsx'teki `drawerMember && (...)` bloğundan
// bileşenleştirildi; veri/handler'lar page.tsx'te kalıyor.
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
                    const cardState = memberCardStatuses.find(
                      (item) => item.memberId === drawerMember.id,
                    );
                    const assignedCards = physicalCards.filter(
                      (card) =>
                        Boolean(drawerMember.user_id) &&
                        card.ownerUserId === drawerMember.user_id,
                    );
                    const lifecycle = [
                      {
                        label: "Çalışan kaydı",
                        done: true,
                        detail: new Date(
                          drawerMember.created_at,
                        ).toLocaleDateString("tr-TR"),
                      },
                      {
                        label: "Davet kabulü",
                        done: drawerMember.status !== "INVITED",
                        detail:
                          drawerMember.status === "INVITED"
                            ? "Bekleniyor"
                            : "Tamamlandı",
                      },
                      {
                        label: "Dijital kart",
                        done: Boolean(cardState?.hasDigitalCard),
                        detail: cardState?.hasDigitalCard
                          ? cardState.published
                            ? "Yayında"
                            : "Taslak hazır"
                          : "Oluşturulmadı",
                      },
                      {
                        label: "Fiziksel kart",
                        done: assignedCards.length > 0,
                        detail: assignedCards.length
                          ? `${assignedCards[0].cardCodeMasked} · ${assignedCards[0].status}`
                          : "Atanmadı",
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
                    return (
                      <div
                        className="v25-drawer-layer"
                        role="presentation"
                        onMouseDown={(event) => {
                          if (event.target === event.currentTarget) {
                            setDrawerMemberId(null);
                            setViewedProfile(null);
                          }
                        }}
                      >
                        <aside
                          className="v25-employee-drawer"
                          role="dialog"
                          aria-modal="true"
                          aria-label={`${drawerMember.full_name || drawerMember.email} çalışan detayları`}
                        >
                          <header className="v25-drawer-header">
                            <div className="v25-drawer-avatar">
                              {initials(drawerMember)}
                            </div>
                            <div>
                              <small>ÇALIŞAN KİMLİĞİ</small>
                              <h2>
                                {drawerMember.full_name || drawerMember.email}
                              </h2>
                              <p>{drawerMember.email}</p>
                              <span>
                                {drawerMember.title ||
                                  roleLabel(drawerMember.role)}
                                {drawerMember.department
                                  ? ` · ${drawerMember.department}`
                                  : ""}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setDrawerMemberId(null);
                                setViewedProfile(null);
                              }}
                              aria-label="Çalışan panelini kapat"
                            >
                              <Icon name="close" />
                            </button>
                          </header>
                          <div className="v25-drawer-meta">
                            <code>{memberPublicId}</code>
                            <span
                              className={`v25-status-pill status-${drawerMember.status.toLowerCase()}`}
                            >
                              {drawerMember.status === "ACTIVE"
                                ? "Aktif"
                                : drawerMember.status === "INVITED"
                                  ? "Davet Bekliyor"
                                  : drawerMember.status === "SUSPENDED"
                                    ? "Pasif"
                                    : "Ayrıldı"}
                            </span>
                          </div>
                          <nav className="v25-drawer-tabs">
                            <button
                              type="button"
                              className={
                                drawerTab === "profile" ? "active" : ""
                              }
                              onClick={() => setDrawerTab("profile")}
                            >
                              Profil
                            </button>
                            <button
                              type="button"
                              className={drawerTab === "card" ? "active" : ""}
                              onClick={() => {
                                setDrawerTab("card");
                                void viewMemberProfile(drawerMember);
                              }}
                            >
                              Kart
                            </button>
                            <button
                              type="button"
                              className={drawerTab === "invite" ? "active" : ""}
                              onClick={() => setDrawerTab("invite")}
                            >
                              Davet
                            </button>
                            <button
                              type="button"
                              className={
                                drawerTab === "lifecycle" ? "active" : ""
                              }
                              onClick={() => {
                                setDrawerTab("lifecycle");
                                void viewMemberProfile(drawerMember);
                              }}
                            >
                              Erişim & Durum
                            </button>
                          </nav>
                          <div className="v25-drawer-body">
                            {drawerTab === "profile" && (
                              <form
                                className="v25-employee-form"
                                onSubmit={saveMemberIdentity}
                              >
                                <div className="v25-section-heading">
                                  <div>
                                    <small>ŞİRKET TARAFINDAN YÖNETİLİR</small>
                                    <h3>Kurumsal kimlik</h3>
                                    <p>
                                      Bu alanlar İK/yönetici tarafından merkezi
                                      olarak yönetilir ve kurumsal karta yansır.
                                    </p>
                                  </div>
                                  <Icon name="lock" />
                                </div>
                                <div className="v25-form-grid">
                                  <label>
                                    Ad
                                    <input
                                      required
                                      value={memberEdit.firstName}
                                      onChange={(e) =>
                                        setMemberEdit((v) => ({
                                          ...v,
                                          firstName: e.target.value,
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    Soyad
                                    <input
                                      required
                                      value={memberEdit.lastName}
                                      onChange={(e) =>
                                        setMemberEdit((v) => ({
                                          ...v,
                                          lastName: e.target.value,
                                        }))
                                      }
                                    />
                                  </label>
                                  <label className="span-2">
                                    Kurumsal e-posta
                                    <input
                                      required
                                      type="email"
                                      inputMode="email"
                                      autoComplete="email"
                                      autoCapitalize="none"
                                      spellCheck={false}
                                      maxLength={254}
                                      value={memberEdit.email}
                                      onChange={(e) =>
                                        setMemberEdit((v) => ({
                                          ...v,
                                          email: e.target.value,
                                        }))
                                      }
                                      onBlur={() =>
                                        setMemberEdit((v) => ({
                                          ...v,
                                          email: normalizeEmailField(v.email),
                                        }))
                                      }
                                    />
                                    <small>
                                      Aktif kullanıcının giriş e-postası
                                      değişmez; bu alan kurumsal iletişim
                                      adresidir.
                                    </small>
                                  </label>
                                  <label>
                                    Ünvan
                                    <input
                                      list="corporate-title-options"
                                      value={memberEdit.title}
                                      placeholder="Seç veya yaz"
                                      onChange={(e) =>
                                        setMemberEdit((v) => ({
                                          ...v,
                                          title: e.target.value,
                                        }))
                                      }
                                    />
                                  </label>
                                  <label>
                                    Departman
                                    <input
                                      list="corporate-department-options"
                                      value={memberEdit.department}
                                      placeholder="Seç veya yaz"
                                      onChange={(e) =>
                                        setMemberEdit((v) => ({
                                          ...v,
                                          department: e.target.value,
                                        }))
                                      }
                                    />
                                  </label>
                                  <div className="span-2 v25-readonly-role">
                                    <small>Sistem rolü</small>
                                    <strong>
                                      {roleLabel(drawerMember.role)}
                                    </strong>
                                    <span>
                                      Rol değişiklikleri yetki matrisi üzerinden
                                      ayrı olarak yönetilir.
                                    </span>
                                  </div>
                                </div>
                                {drawerMember.status === "INVITED" &&
                                  memberEdit.email.toLowerCase() !==
                                    drawerMember.email.toLowerCase() && (
                                    <div className="v25-inline-warning">
                                      <Icon name="mail" />
                                      <span>
                                        <strong>Davet adresi değişiyor.</strong>{" "}
                                        Kaydettiğinde eski davet geçersizleşir
                                        ve yeni e-posta adresine yeni davet
                                        gönderilir.
                                      </span>
                                    </div>
                                  )}
                                <div className="v25-drawer-actions">
                                  <button
                                    type="submit"
                                    className="primary"
                                    disabled={memberEditBusy}
                                  >
                                    {memberEditBusy
                                      ? "Kaydediliyor…"
                                      : "Değişiklikleri Kaydet"}
                                  </button>
                                </div>
                              </form>
                            )}
                            {drawerTab === "invite" && (
                              <section className="v25-invite-detail">
                                <div className="v25-section-heading">
                                  <div>
                                    <small>DAVET</small>
                                    <h3>
                                      {drawerMember.status === "INVITED"
                                        ? "Davet bekliyor"
                                        : "Davet tamamlandı"}
                                    </h3>
                                    <p>
                                      {drawerMember.status === "INVITED"
                                        ? "Çalışan henüz hesabını aktive etmedi."
                                        : "Çalışanın üyelik kaydı aktif veya tamamlanmış durumda."}
                                    </p>
                                  </div>
                                  <Icon name="mail" />
                                </div>
                                <dl>
                                  <div>
                                    <dt>Ad Soyad</dt>
                                    <dd>{drawerMember.full_name || "—"}</dd>
                                  </div>
                                  <div>
                                    <dt>E-posta</dt>
                                    <dd>{drawerMember.email}</dd>
                                  </div>
                                  <div>
                                    <dt>Rol</dt>
                                    <dd>{roleLabel(drawerMember.role)}</dd>
                                  </div>
                                  <div>
                                    <dt>Departman</dt>
                                    <dd>
                                      {drawerMember.department ||
                                        "Belirtilmedi"}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Çalışan ID</dt>
                                    <dd>
                                      <code>{memberPublicId}</code>
                                    </dd>
                                  </div>
                                </dl>
                                {drawerMember.status === "INVITED" ? (
                                  <div className="v25-drawer-actions">
                                    <button
                                      type="button"
                                      className="primary"
                                      onClick={() =>
                                        void inviteAction(
                                          drawerMember.id,
                                          "RESEND",
                                        )
                                      }
                                    >
                                      <Icon name="mail" /> Daveti Yeniden Gönder
                                    </button>
                                    <button
                                      type="button"
                                      className="danger"
                                      onClick={() =>
                                        void inviteAction(
                                          drawerMember.id,
                                          "REVOKE",
                                        )
                                      }
                                    >
                                      Daveti İptal Et
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDrawerTab("profile")}
                                    >
                                      <Icon name="pencil" /> Bilgileri Düzenle
                                    </button>
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
                                <div className="v25-section-heading">
                                  <div>
                                    <small>DİJİTAL KART · salt okunur</small>
                                    <h3>
                                      {viewLoading === drawerMember.id
                                        ? "Kart yükleniyor"
                                        : viewedProfile?.memberId === drawerMember.id && viewedProfile.profiles.length > 0
                                          ? "Kart hazır"
                                          : "Kart henüz oluşturulmadı"}
                                    </h3>
                                    <p>
                                      Bu görünüm yalnızca görüntüleme amaçlıdır;
                                      çalışan kartını yalnızca kendi hesabından
                                      düzenleyebilir.
                                    </p>
                                  </div>
                                  <Icon name="contact" />
                                </div>
                                {viewLoading === drawerMember.id ? (
                                  <LoadingState label="Kart yükleniyor" />
                                ) : viewedProfile?.memberId ===
                                    drawerMember.id &&
                                  viewedProfile.profiles.length > 0 ? (
                                  viewedProfile.profiles.map((profile) => {
                                    const currentTemplate = templates[0];
                                    const fields =
                                      currentTemplate?.fields || {};
                                    const branding: CardBranding = {
                                      logoUrl:
                                        currentTemplate?.logo_url || null,
                                      primaryColor:
                                        currentTemplate?.primary_color || null,
                                      companyName:
                                        org?.organizations?.name || null,
                                      variant: ([
                                        "ESSENTIAL",
                                        "PROFESSIONAL",
                                        "EXECUTIVE",
                                        "CLASSIC",
                                        "MINIMAL",
                                      ].includes(String(fields.templateVariant))
                                        ? String(fields.templateVariant) ===
                                          "CLASSIC"
                                          ? "ESSENTIAL"
                                          : String(fields.templateVariant) ===
                                              "MINIMAL"
                                            ? "PROFESSIONAL"
                                            : String(fields.templateVariant)
                                        : "ESSENTIAL") as CardBranding["variant"],
                                    };
                                    return (
                                      <div
                                        className="v25-card-preview-wrap"
                                        key={profile.id}
                                      >
                                        <div className="enterprise-preview-phone">
                                          <CardTemplate
                                            preview
                                            slug={profile.slug}
                                            branding={branding}
                                            corporateRole={isOrganizationRole(drawerMember.role) ? drawerMember.role : null}
                                            data={{
                                              name:
                                                drawerMember.full_name ||
                                                profile.name ||
                                                "",
                                              role:
                                                drawerMember.title ||
                                                profile.role ||
                                                "",
                                              company:
                                                profile.company ||
                                                org?.organizations?.name ||
                                                "",
                                              phone: profile.phone || "",
                                              whatsapp: profile.whatsapp || "",
                                              email:
                                                drawerMember.email ||
                                                profile.email ||
                                                "",
                                              website: profile.website || "",
                                              linkedin: profile.linkedin || "",
                                              instagram:
                                                profile.instagram || "",
                                              location: profile.location || "",
                                              image: profile.image_url || "",
                                              links: corporateLinks
                                                .filter(
                                                  (link) =>
                                                    link.configured &&
                                                    link.isPublished &&
                                                    Boolean(
                                                      link.fileUrl || link.url,
                                                    ),
                                                )
                                                .map((link) => ({
                                                  title: link.label,
                                                  subtitle: link.subtitle,
                                                  href:
                                                    link.fileUrl ||
                                                    link.url ||
                                                    "#",
                                                  kind: "external" as const,
                                                })),
                                            }}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="v25-empty-state">
                                    <Icon name="contact" />
                                    <strong>
                                      {drawerMember.status === "INVITED"
                                        ? "Davet henüz kabul edilmedi"
                                        : drawerMember.status === "LEFT" ||
                                            drawerMember.status === "SUSPENDED"
                                          ? "Bu çalışan artık aktif değil"
                                          : "Kurumsal kart henüz oluşturulmadı"}
                                    </strong>
                                    <span>
                                      {drawerMember.status === "INVITED"
                                        ? "Çalışan daveti kabul ettikten sonra kartını oluşturabilir."
                                        : drawerMember.status === "LEFT" ||
                                            drawerMember.status === "SUSPENDED"
                                          ? "Kart görüntüleme ve kullanım durumu çalışan statüsüne göre sınırlandırılmıştır."
                                          : "Çalışan kendi hesabından kişisel alanları tamamladığında kart burada görünür."}
                                    </span>
                                  </div>
                                )}
                                <div className="v25-physical-card-controls">
                                  <div className="v25-section-heading">
                                    <div>
                                      <small>FİZİKSEL KARTLAR</small>
                                      <h3>
                                        {assignedCards.length
                                          ? `${assignedCards.length} kart bağlı`
                                          : "Fiziksel kart atanmadı"}
                                      </h3>
                                      <p>
                                        Kayıp kart çalışan tarafından
                                        bildirilir; yönetici aktif kartı devre
                                        dışı bırakabilir veya yeniden
                                        etkinleştirebilir.
                                      </p>
                                    </div>
                                    <i className="overview-icon">
                                      <Icon name="nfc" />
                                    </i>
                                  </div>
                                  {assignedCards.length === 0 ? (
                                    <div className="v25-empty-line">
                                      Bu çalışana bağlı fiziksel kart
                                      bulunmuyor.
                                    </div>
                                  ) : (
                                    assignedCards.map((card) => {
                                      const replacementCandidate =
                                        assignedCards.find(
                                          (candidate) =>
                                            candidate.id !== card.id &&
                                            candidate.status === "ACTIVE" &&
                                            !candidate.replacedByCardId,
                                        );
                                      const replacementCard =
                                        card.replacedByCardId
                                          ? assignedCards.find(
                                              (candidate) =>
                                                candidate.id ===
                                                card.replacedByCardId,
                                            )
                                          : null;
                                      return (
                                        <article
                                          key={card.id}
                                          className="v25-physical-control-row"
                                        >
                                          <div>
                                            <strong>
                                              {card.cardCodeMasked}
                                            </strong>
                                            <span>
                                              {physicalCardLabel(card.status)}
                                            </span>
                                            {card.replacedByCardId && (
                                              <small>
                                                Yeni kartla değiştirildi
                                                {replacementCard
                                                  ? ` · ${replacementCard.cardCodeMasked}`
                                                  : ""}
                                              </small>
                                            )}
                                          </div>
                                          {card.status === "ACTIVE" ? (
                                            <button
                                              type="button"
                                              disabled={cardBusy === card.id}
                                              onClick={() =>
                                                void toggleCardStatus(
                                                  card.id,
                                                  "DISABLED",
                                                )
                                              }
                                            >
                                              Devre Dışı Bırak
                                            </button>
                                          ) : card.status === "DISABLED" &&
                                            !card.replacedByCardId ? (
                                            <button
                                              type="button"
                                              disabled={cardBusy === card.id}
                                              onClick={() =>
                                                void toggleCardStatus(
                                                  card.id,
                                                  "ACTIVE",
                                                )
                                              }
                                            >
                                              Yeniden Etkinleştir
                                            </button>
                                          ) : (card.status === "LOST" ||
                                              card.status === "DISABLED") &&
                                            !card.replacedByCardId &&
                                            replacementCandidate ? (
                                            <button
                                              type="button"
                                              disabled={cardBusy === card.id}
                                              onClick={() =>
                                                void linkReplacementCard(
                                                  card.id,
                                                  replacementCandidate.id,
                                                )
                                              }
                                            >
                                              Yeni Kartla Eşleştir
                                            </button>
                                          ) : (
                                            <small>
                                              {card.replacedByCardId
                                                ? "Eski kart tekrar etkinleştirilemez"
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
                                    <p>
                                      Davet, dijital kart ve fiziksel kart
                                      aşamalarının tek görünümü.
                                    </p>
                                  </div>
                                  <Icon name="analytics" />
                                </div>
                                <ol>
                                  {lifecycle.map((step, index) => (
                                    <li
                                      key={step.label}
                                      className={step.done ? "done" : "pending"}
                                    >
                                      <i>
                                        {step.done ? (
                                          <Icon name="check" />
                                        ) : (
                                          index + 1
                                        )}
                                      </i>
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
                                    <p>
                                      Pasife alma ve işten ayrılma işlemleri
                                      kart erişimini etkiler.
                                    </p>
                                    <div>
                                      {drawerMember.status === "ACTIVE" && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (!window.confirm("Bu çalışanı pasife almak dijital ve fiziksel kart erişimini sınırlandırabilir. Devam edilsin mi?")) return;
                                            void changeStatus(drawerMember.id, "SUSPENDED");
                                          }}
                                        >
                                          Pasife Al
                                        </button>
                                      )}
                                      {drawerMember.status === "SUSPENDED" && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void changeStatus(
                                              drawerMember.id,
                                              "ACTIVE",
                                            )
                                          }
                                        >
                                          Yeniden Aktif Et
                                        </button>
                                      )}
                                      {(drawerMember.status === "ACTIVE" ||
                                        drawerMember.status ===
                                          "SUSPENDED") && (
                                        <button
                                          type="button"
                                          className="danger"
                                          onClick={() => {
                                            if (!window.confirm("Çalışanı şirketten ayırmak profil erişimini durdurur, kartları devre dışı bırakır ve lisansı serbest bırakır. Bu işlem uygulansın mı?")) return;
                                            void changeStatus(drawerMember.id, "LEFT");
                                          }}
                                        >
                                          İşten Ayrıldı
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </section>
                            )}
                          </div>
                        </aside>
                      </div>
                    );
}
