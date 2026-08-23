/**
 * Canonical demo QA registry (typed). Runtime data lives in `demo-user-matrix.mjs`
 * so the seed script can import it without a TypeScript loader.
 * Do not import this module from `app/`.
 */

import {
  DEMO_CORPORATE_CAPACITY_SCENARIOS as capacityScenarios,
  DEMO_GUEST_ORDERS as guestOrders,
  DEMO_IDENTITY_COLLISION as identityCollision,
  DEMO_INVITE_FIXTURES as inviteFixtures,
  DEMO_LOGIN_USERS as loginUsers,
  renderDemoTestUsersMarkdown as renderMarkdown,
} from "./demo-user-matrix.mjs";

export type DemoLoginScope = "INDIVIDUAL" | "CORPORATE" | "BOTH";

export type DemoUserKind =
  | "SUPER_ADMIN"
  | "INDIVIDUAL_PENDING"
  | "INDIVIDUAL_COMPLETE"
  | "INDIVIDUAL_PREMIUM"
  | "INDIVIDUAL_EXPIRED"
  | "INDIVIDUAL_LOST"
  | "INDIVIDUAL_BACKUP"
  | "INDIVIDUAL_CLAIM_MISMATCH"
  | "INDIVIDUAL_FOREIGN"
  | "CORPORATE_OWNER"
  | "CORPORATE_ADMIN"
  | "CORPORATE_HR"
  | "DEPARTMENT_MANAGER"
  | "CORPORATE_EMPLOYEE"
  | "MULTI_ORG_ADMIN";

export type DemoGuestKind =
  | "GUEST_ACTIVATION_PENDING"
  | "GUEST_CLAIM_MISMATCH_ORDER"
  | "GUEST_CORPORATE_PAID";

export type DemoInviteKind =
  | "INVITE_PENDING"
  | "INVITE_EXPIRED"
  | "INVITE_REVOKED"
  | "LIFECYCLE_INVITE_PENDING";

export type DemoCardFixture = {
  code: string;
  status: "ACTIVE" | "LOST" | "DISABLED" | "UNASSIGNED";
};

export type DemoProfileFixture = {
  slug: string;
  name?: string;
  isPublished?: boolean;
  cardStatus?: "ACTIVE" | "LOST" | "SUSPENDED";
};

export type DemoEntitlementFixture = {
  status: "ACTIVE" | "EXPIRED" | "PENDING_ACTIVATION";
  variantSku: string;
};

export type DemoAdditionalOrg = {
  slug: string;
  name: string;
  role: "OWNER" | "ADMIN" | "HR" | "DEPARTMENT_MANAGER" | "EMPLOYEE";
  status: "ACTIVE" | "INVITED" | "SUSPENDED" | "LEFT";
  title?: string;
  department?: string;
};

export type DemoLoginUser = {
  key: string;
  email: string;
  name: string;
  kind: DemoUserKind;
  loginScope: DemoLoginScope;
  intent: string;
  isAdmin?: boolean;
  orderNumber?: string;
  organizationSlug?: string;
  organizationName?: string;
  role?: "OWNER" | "ADMIN" | "HR" | "DEPARTMENT_MANAGER" | "EMPLOYEE";
  status?: "ACTIVE" | "INVITED" | "SUSPENDED" | "LEFT";
  title?: string;
  department?: string;
  profile?: DemoProfileFixture | null;
  cards?: DemoCardFixture[];
  entitlement?: DemoEntitlementFixture | null;
  additionalOrganizations?: DemoAdditionalOrg[];
};

export type DemoGuestOrder = {
  email: string;
  kind: DemoGuestKind;
  audience: "individual" | "corporate";
  orderNumber: string;
  tokenLabel: string;
  variantSku: string;
  entitlementStatus?: "PENDING_ACTIVATION" | null;
  intent: string;
};

export type DemoInviteFixture = {
  email: string;
  kind: DemoInviteKind;
  organizationSlug: string;
  role: "EMPLOYEE";
  status: "INVITED" | "LEFT";
  title: string;
  department: string;
  isExpired?: boolean;
  isRevoked?: boolean;
  intent: string;
};

export type DemoCapacityScenario = {
  owner: string;
  slug: string;
  name: string;
  plan: string;
  limit: number;
  used: number;
  upgrade?: boolean;
};

export const DEMO_LOGIN_USERS = loginUsers as DemoLoginUser[];
export const DEMO_GUEST_ORDERS = guestOrders as DemoGuestOrder[];
export const DEMO_INVITE_FIXTURES = inviteFixtures as DemoInviteFixture[];
export const DEMO_CORPORATE_CAPACITY_SCENARIOS = capacityScenarios as DemoCapacityScenario[];
export const DEMO_IDENTITY_COLLISION = identityCollision as {
  displayName: string;
  emailPrefix: string;
  organizationSlug: string;
  suffixes: string[];
  intent: string;
};
export const renderDemoTestUsersMarkdown = renderMarkdown as () => string;
