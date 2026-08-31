export type Org = {
  organization_id: string;
  role: string;
  department?: string | null;
  organizations: {
    id: string;
    name: string;
    slug: string;
    status: string;
  } | null;
  organization_subscriptions?: Array<{
    seat_limit: number;
    status: string;
    expires_at: string | null;
    business_plans: { name: string; code: string } | null;
  }>;
  organization_entitlements?: {
    organization_id: string;
    mail_credit_limit: number;
    mail_credits_remaining: number;
  } | null;
  organization_capacity_terms?: Array<{
    id: string;
    organization_id: string;
    card_count: number;
    starts_at: string;
    expires_at: string;
    renewal_price_kurus: number | null;
    currency: "TRY";
    status: "ACTIVE" | "GRACE_PERIOD";
  }>;
};

import type { DigitalProfileState, InvitationState, MemberStatus, PhysicalCardStatus } from "../../../../lib/organizations/lifecycle";

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
  last_activity_at: string;
};

export type MemberCardStatus = {
  user_id: string;
  profile_id: string | null;
  public_id: string | null;
  hasDigitalCard: boolean;
  published: boolean;
  physical_card_id: string | null;
  physical_card_status: PhysicalCardStatus | null;
  physical_card_serial: string | null;
  physical_card_assigned_at: string | null;
  digital_profile_state: DigitalProfileState;
  physical_card_state: PhysicalCardStatus | "NONE";
  invitation_state: InvitationState;
};

export type PhysicalCard = {
  id: string;
  serial: string;
  status: PhysicalCardStatus;
  assigned_user_id: string | null;
  assigned_at: string | null;
  notes: string | null;
};

export type Template = {
  id: string;
  name: string;
  version: number;
  status: string;
  is_default: boolean;
  template_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ContentItem = {
  id: string;
  content_type: "SOCIAL" | "LINK" | "CAMPAIGN" | "ANNOUNCEMENT";
  title: string;
  body: string | null;
  url: string | null;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  publish_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Department = {
  id: string;
  name: string;
  manager_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_user_id: string | null;
};

export type Lead = {
  id: string;
  source: "PUBLIC_PROFILE" | "QR_SCAN" | "MANUAL";
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  note: string | null;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "ARCHIVED";
  created_at: string;
  updated_at: string;
};

export type NetworkingEvent = {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  note: string | null;
  created_at: string;
};

export type Meeting = {
  id: string;
  lead_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  note: string | null;
  status: "PLANNED" | "COMPLETED" | "CANCELLED";
  created_at: string;
};

export type CardAnalytics = {
  available?: boolean;
  totalViews: number;
  byDay: Array<{ date: string; count: number }>;
  content: { clicks: number };
};
