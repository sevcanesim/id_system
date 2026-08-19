export const MEMBER_STATUSES = ["ACTIVE", "INVITED", "SUSPENDED", "LEFT"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

// Database status is intentionally narrower than the UI lifecycle. ASSIGNED and
// REPLACED are derived states: assignment comes from ownership/activation data,
// replacement comes from replaced_by_card_id.
export const PHYSICAL_CARD_DB_STATUSES = ["UNASSIGNED", "ACTIVE", "LOST", "DISABLED"] as const;
export type PhysicalCardDbStatus = (typeof PHYSICAL_CARD_DB_STATUSES)[number];
export const PHYSICAL_CARD_STATES = ["UNASSIGNED", "ASSIGNED", "ACTIVE", "LOST", "DISABLED", "REPLACED"] as const;
export type PhysicalCardStatus = (typeof PHYSICAL_CARD_STATES)[number];

export const DIGITAL_PROFILE_STATES = ["NONE", "DRAFT", "PUBLISHED", "DISABLED"] as const;
export type DigitalProfileState = (typeof DIGITAL_PROFILE_STATES)[number];

export const INVITATION_STATES = ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"] as const;
export type InvitationState = (typeof INVITATION_STATES)[number];

// These are product/domain states. They deliberately do not mirror the legacy
// entitlement enum one-for-one (PENDING_ACTIVATION/REVOKED are mapped below).
export const ENTITLEMENT_STATES = ["AVAILABLE", "CLAIMED", "ACTIVE", "EXPIRED", "GRACE"] as const;
export type EntitlementState = (typeof ENTITLEMENT_STATES)[number];

export type LifecycleCard = {
  status: PhysicalCardDbStatus | PhysicalCardStatus | string;
  ownerUserId?: string | null;
  activatedAt?: string | null;
  replacedByCardId?: string | null;
};

export type LifecycleProfile = {
  hasDigitalCard: boolean;
  published: boolean;
  cardStatus?: string | null;
};

export type LifecycleInvitation = {
  expiresAt?: string | null;
  acceptedAt?: string | null;
  usedAt?: string | null;
  revokedAt?: string | null;
};

export type LifecycleEntitlement = {
  status?: string | null;
  userId?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  graceEndsAt?: string | null;
};

export type MemberLifecycleAction =
  | "RESEND_INVITE"
  | "REVOKE_INVITE"
  | "REMIND_PROFILE"
  | "VIEW_PROFILE"
  | "ASSIGN_CARD"
  | "REPLACE_CARD"
  | "VIEW_CARD"
  | "REACTIVATE_MEMBER"
  | "SUSPEND_MEMBER"
  | "VIEW_HISTORY";

const memberLabels: Record<MemberStatus, string> = {
  ACTIVE: "Aktif",
  INVITED: "Davet bekliyor",
  SUSPENDED: "Pasif",
  LEFT: "Ayrıldı",
};

const physicalCardLabels: Record<PhysicalCardStatus, string> = {
  UNASSIGNED: "Atanmamış",
  ASSIGNED: "Atanmış",
  ACTIVE: "Aktif",
  LOST: "Kayıp",
  DISABLED: "Devre dışı",
  REPLACED: "Değiştirildi",
};

const digitalProfileLabels: Record<DigitalProfileState, string> = {
  NONE: "Yok",
  DRAFT: "Taslak",
  PUBLISHED: "Yayında",
  DISABLED: "Devre dışı",
};

const invitationLabels: Record<InvitationState, string> = {
  PENDING: "Davet bekliyor",
  ACCEPTED: "Kabul edildi",
  EXPIRED: "Süresi doldu",
  REVOKED: "İptal edildi",
};

const entitlementLabels: Record<EntitlementState, string> = {
  AVAILABLE: "Kullanılabilir",
  CLAIMED: "Sahiplenildi",
  ACTIVE: "Aktif",
  EXPIRED: "Süresi doldu",
  GRACE: "Ek süre",
};

export function isMemberStatus(value: string): value is MemberStatus {
  return MEMBER_STATUSES.includes(value as MemberStatus);
}

export function memberStatusLabel(status: string) {
  return isMemberStatus(status) ? memberLabels[status] : status;
}

export function memberConsumesSeat(status: string) {
  return status !== "LEFT";
}

export function getSeatBreakdown(members: Array<{ role: string; status: string }>) {
  const consuming = members.filter((member) => memberConsumesSeat(member.status));
  return {
    used: consuming.length,
    owners: consuming.filter((member) => member.role === "OWNER").length,
    active: consuming.filter((member) => member.status === "ACTIVE" && member.role !== "OWNER").length,
    invited: consuming.filter((member) => member.status === "INVITED").length,
    suspended: consuming.filter((member) => member.status === "SUSPENDED").length,
    released: members.filter((member) => member.status === "LEFT").length,
  };
}

export function currentLifecycleCards(cards: LifecycleCard[]): LifecycleCard[] {
  return cards.filter((card) => !card.replacedByCardId);
}

export function getDigitalProfileState(profile?: LifecycleProfile | null): DigitalProfileState {
  if (!profile?.hasDigitalCard) return "NONE";
  if (["SUSPENDED", "REFUNDED", "DISABLED"].includes(String(profile.cardStatus || "").toUpperCase())) return "DISABLED";
  return profile.published ? "PUBLISHED" : "DRAFT";
}

export function digitalProfileLabel(profileOrState?: LifecycleProfile | DigitalProfileState | null) {
  const state = typeof profileOrState === "string" ? profileOrState : getDigitalProfileState(profileOrState);
  return digitalProfileLabels[state];
}

export function getPhysicalCardState(cards: LifecycleCard[]): PhysicalCardStatus {
  if (!cards.length) return "UNASSIGNED";
  // replaced_by_card_id is historical: a current ACTIVE/ASSIGNED card must win
  // over an older replaced row, otherwise assigned members show "Değiştirildi".
  const current = currentLifecycleCards(cards);
  if (!current.length) return "REPLACED";
  if (current.some((card) => card.status === "LOST")) return "LOST";
  if (current.some((card) => card.status === "DISABLED")) return "DISABLED";
  if (current.some((card) => card.status === "ACTIVE" && Boolean(card.activatedAt))) return "ACTIVE";
  if (current.some((card) => card.status === "ACTIVE" && Boolean(card.ownerUserId))) return "ASSIGNED";
  if (current.some((card) => card.status === "ACTIVE")) return "ACTIVE";
  if (current.some((card) => card.status === "ASSIGNED")) return "ASSIGNED";
  return "UNASSIGNED";
}

export function physicalCardLabel(cardsOrState: LifecycleCard[] | PhysicalCardStatus) {
  const state = typeof cardsOrState === "string" ? cardsOrState : getPhysicalCardState(cardsOrState);
  return physicalCardLabels[state];
}

export type PhysicalInventoryCounts = {
  total: number;
  active: number;
  awaitingAssignment: number;
  disabled: number;
  lost: number;
};

/** Inventory buckets for physical hardware. DISABLED/LOST assigned cards are not "unassigned". */
export function physicalInventoryCounts(cards: LifecycleCard[]): PhysicalInventoryCounts {
  const current = currentLifecycleCards(cards);
  return {
    total: cards.length,
    active: current.filter((card) => Boolean(card.ownerUserId) && card.status === "ACTIVE").length,
    awaitingAssignment: current.filter((card) => !card.ownerUserId).length,
    disabled: current.filter((card) => Boolean(card.ownerUserId) && card.status === "DISABLED").length,
    lost: current.filter((card) => Boolean(card.ownerUserId) && card.status === "LOST").length,
  };
}

export function countMembersWithoutPhysicalAssignment(
  members: Array<{ status: string; user_id?: string | null }>,
  physicalCards: LifecycleCard[],
): number {
  const cardsByOwner = new Map<string, LifecycleCard[]>();
  for (const card of physicalCards) {
    if (!card.ownerUserId) continue;
    const list = cardsByOwner.get(card.ownerUserId) ?? [];
    list.push(card);
    cardsByOwner.set(card.ownerUserId, list);
  }
  return members.filter((member) => {
    if (member.status === "LEFT" || member.status === "INVITED") return false;
    if (!member.user_id) return false;
    return getPhysicalCardState(cardsByOwner.get(member.user_id) ?? []) === "UNASSIGNED";
  }).length;
}

export function getInvitationState(invitation?: LifecycleInvitation | null, now = new Date()): InvitationState | null {
  if (!invitation) return null;
  if (invitation.revokedAt) return "REVOKED";
  if (invitation.acceptedAt || invitation.usedAt) return "ACCEPTED";
  if (invitation.expiresAt && new Date(invitation.expiresAt).getTime() <= now.getTime()) return "EXPIRED";
  return "PENDING";
}

export function invitationStatusLabel(state: InvitationState) {
  return invitationLabels[state];
}

// Five-state entitlement machine and derived member actions. The live panel
// uses seat/license status and explicit EmployeeDrawer buttons, not this list.
// Kept as unused domain layer — do not fake-wire into UI.
export function getEntitlementState(entitlement?: LifecycleEntitlement | null, now = new Date()): EntitlementState | null {
  if (!entitlement) return null;
  const raw = String(entitlement.status || "").toUpperCase();
  const nowMs = now.getTime();
  const expiresMs = entitlement.expiresAt ? new Date(entitlement.expiresAt).getTime() : null;
  const graceMs = entitlement.graceEndsAt ? new Date(entitlement.graceEndsAt).getTime() : null;

  if (raw === "EXPIRED" || (graceMs !== null && graceMs <= nowMs)) return "EXPIRED";
  if (expiresMs !== null && expiresMs <= nowMs && graceMs !== null && graceMs > nowMs) return "GRACE";
  if (raw === "ACTIVE") return "ACTIVE";
  if (raw === "PENDING_ACTIVATION") return entitlement.userId ? "CLAIMED" : "AVAILABLE";
  // Legacy REVOKED rows have no direct state in the commercial five-state
  // model; they are terminal/unavailable and therefore surface as EXPIRED.
  if (raw === "REVOKED") return "EXPIRED";
  return entitlement.userId ? "CLAIMED" : "AVAILABLE";
}

export function entitlementStatusLabel(state: EntitlementState) {
  return entitlementLabels[state];
}

export function getMemberLifecycleActions(input: {
  memberStatus: string;
  profile?: LifecycleProfile | null;
  cards: LifecycleCard[];
  invitationState?: InvitationState | null;
}): MemberLifecycleAction[] {
  const { memberStatus, profile, cards, invitationState } = input;
  if (memberStatus === "LEFT") return ["VIEW_HISTORY"];
  if (memberStatus === "INVITED") {
    if (invitationState === "REVOKED" || invitationState === "ACCEPTED") return ["VIEW_HISTORY"];
    return ["RESEND_INVITE", "REVOKE_INVITE"];
  }
  if (memberStatus === "SUSPENDED") return ["REACTIVATE_MEMBER", "VIEW_HISTORY"];

  const actions: MemberLifecycleAction[] = [];
  if (getDigitalProfileState(profile) === "NONE") actions.push("REMIND_PROFILE");
  else actions.push("VIEW_PROFILE");

  const physicalState = getPhysicalCardState(cards);
  if (physicalState === "UNASSIGNED") actions.push("ASSIGN_CARD");
  else if (physicalState === "LOST" || physicalState === "REPLACED") actions.push("REPLACE_CARD");
  else actions.push("VIEW_CARD");
  actions.push("SUSPEND_MEMBER", "VIEW_HISTORY");
  return actions;
}
