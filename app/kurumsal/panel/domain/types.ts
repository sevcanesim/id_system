import type { DigitalProfileState, InvitationState, MemberStatus, PhysicalCardStatus } from "../../../../lib/organizations/lifecycle";
import type { OrganizationCapacityTerm } from "../../../../lib/organizations/capacity-terms";

export type Org = {
  organization_id: string;
  role: string;
  department?: string | null;
  organizations: {
    id: string;
    name: string;
    slug: string;
    status: string;
    /** Returned only for an active OWNER or HR membership. */
    corporate_id?: string | null;
    legal_name?: string | null;
    tax_id_type?: "VKN" | "TCKN" | null;
    tax_number?: string | null;
    tax_office?: string | null;
    mersis_number?: string | null;
    trade_registry_number?: string | null;
    billing_address?: string | null;
    billing_city?: string | null;
    billing_district?: string | null;
    billing_postal_code?: string | null;
    billing_country_code?: string | null;
    billing_email?: string | null;
    billing_phone?: string | null;
    authorized_person_name?: string | null;
  } | null;
  organization_subscriptions?: Array<{
    seat_limit: number;
    status: string;
    expires_at: string | null;
    business_plans: { name: string; code: string } | null;
  }>;
  organization_capacity_terms?: OrganizationCapacityTerm[];
};

export type MemberActionTarget = {
  id: string;
  email: string;
  full_name: string | null;
  title: string | null;
  department: string | null;
  role: string;
  status: MemberStatus;
  created_at: string;
  user_id?: string | null;
};

export type Member = MemberActionTarget & {
  last_activity_at: string | null;
};

export type Template = {
  id: string;
  name: string;
  primary_color: string | null;
  logo_url: string | null;
  is_default: boolean;
  fields?: Record<string, string | boolean>;
};

export type PhysicalCard = {
  id: string;
  cardCodeMasked: string;
  status: PhysicalCardStatus;
  ownerUserId: string | null;
  ownerName: string | null;
  activatedAt: string | null;
  lostAt: string | null;
  disabledAt: string | null;
  replacedByCardId: string | null;
};

// commerce_physical_card_units.operations_status — the pre-activation
// production/shipping pipeline. Purchased units have no per-employee
// attribution until a card is activated (see PhysicalCard above), so this is
// only ever surfaced as an organization-wide count, never per employee.
export type PhysicalCardOperationalStatus =
  | "PROFILE_REQUIRED"
  | "PRINT_PENDING"
  | "PRINTING"
  | "SHIPPING_PENDING"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export type PhysicalCardProductionSummary = Partial<Record<PhysicalCardOperationalStatus, number>>;

export type MemberProfile = {
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

export type CardAnalytics = {
  totalViews: number;
  last30DaysViews: number;
  windowDays: number;
  byCountry: Array<{ country: string; count: number }>;
  byDepartment?: Array<{ department: string; count: number }>;
  byCard: Array<{
    profileId: string;
    name: string;
    slug: string | null;
    count: number;
  }>;
  periodDays?: number;
  periodStart?: string;
  periodEnd?: string;
  byDay?: Array<{ date: string; count: number }>;
  content?: {
    totalInteractions: number;
    clicks: number;
    downloads: number;
    byLink: Array<{
      linkId: string;
      label: string;
      kind: string;
      count: number;
      downloads: number;
    }>;
    byKind?: Array<{
      kind: string;
      count: number;
      downloads: number;
    }>;
  };
  available?: boolean;
  warning?: string | null;
  code?: string | null;
};

export type MemberCardStatus = {
  memberId: string;
  memberStatus: MemberStatus;
  hasDigitalCard: boolean;
  profileId: string | null;
  slug: string | null;
  published: boolean;
  digitalProfileState: DigitalProfileState;
  physicalCardState: PhysicalCardStatus;
  invitationState: InvitationState | null;
  physicalCardCount: number;
  activePhysicalCardCount: number;
};

export type JobTitleOption = {
  id: string;
  title: string;
};

export type TitleRequest = {
  id: string;
  member_id: string;
  requested_title: string;
  created_at: string;
  organization_members: {
    full_name: string | null;
    department: string | null;
  };
};

export type CorporateLink = {
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

export type LinkVersion = {
  id: string;
  kind: string;
  label: string | null;
  link_type: string | null;
  url: string | null;
  file_name: string | null;
  is_published: boolean;
  publish_at: string | null;
  change_reason: string;
  created_at: string;
};

export type BulkInvitePreview = {
  fileName: string;
  rows: Array<{
    line: number;
    email: string;
    fullName: string;
    title: string;
    department: string;
    role: string;
  }>;
  errors: Array<{ line: number; error: string }>;
};

export type BulkInviteResults = {
  created: number;
  failed: number;
  results: Array<{
    email: string;
    status: "created" | "error";
    error?: string;
    emailSent?: boolean;
    memberId?: string;
  }>;
};

export type ViewedMemberProfile = {
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
