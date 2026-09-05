import { readCart, setCartOwner } from "../cart";
import {
  fetchLastOrderCheckoutPrefill,
  mergeCheckoutPrefill,
  sessionCheckoutPrefill,
} from "./checkout-prefill";

type CheckoutSession = {
  access_token: string;
  user: {
    id: string;
    email?: string | null;
    phone?: string | null;
    user_metadata?: Record<string, unknown>;
  };
};

type CheckoutBuyerFields = {
  recipientName: string;
  email: string;
  phone: string;
  addressLine: string;
  district: string;
  city: string;
  postalCode: string;
};

export type OrganizationCheckoutTarget = {
  name: string;
  role: string;
  legalName: string;
  taxNumber: string;
  taxOffice: string;
  billingAddress: string;
  billingCity: string;
  billingDistrict: string;
  billingPostalCode: string;
  billingEmail: string;
  billingPhone: string;
  authorizedPersonName: string;
};

export async function bootstrapAuthenticatedCheckout<T extends CheckoutBuyerFields>(
  session: CheckoutSession | null,
  surface: {
    setForm: (updater: (current: T) => T) => void;
    setItems: (lines: ReturnType<typeof readCart>) => void;
    setIsAuthenticated: (value: boolean) => void;
    setOrganizationTargets: (value: Record<string, OrganizationCheckoutTarget>) => void;
    setCheckoutReady: (value: boolean) => void;
  },
) {
  if (!session) {
    surface.setItems(readCart());
    surface.setCheckoutReady(true);
    return;
  }

  surface.setIsAuthenticated(true);
  setCartOwner(session.user.id, { claimGuest: true });
  const cartLines = readCart();
  surface.setItems(cartLines);
  surface.setForm((current) => mergeCheckoutPrefill(current, sessionCheckoutPrefill(session.user)));

  const organizationIds = Array.from(new Set(
    cartLines
      .map((line) => line.configuration?.organizationId)
      .filter((organizationId): organizationId is string => typeof organizationId === "string"),
  ));

  const [memberships, lastPaidOrder] = await Promise.all([
    organizationIds.length
      ? fetch("/api/organizations/mine?management=true", { headers: { authorization: `Bearer ${session.access_token}` } })
        .then((response) => response.ok ? response.json() : null)
        .catch(() => null)
      : Promise.resolve(null),
    fetchLastOrderCheckoutPrefill(session.access_token).catch(() => null),
  ]);

  if (lastPaidOrder) surface.setForm((current) => mergeCheckoutPrefill(current, lastPaidOrder));
  if (memberships) {
    const managedOrgs: Record<string, OrganizationCheckoutTarget> = {};
    for (const membership of memberships.organizations || []) {
      if (organizationIds.includes(membership.organization_id)) {
        const organization = membership.organizations || {};
        managedOrgs[membership.organization_id] = {
          name: organization.name || "Kurumsal hesap",
          role: membership.role || "",
          legalName: organization.legal_name || organization.name || "",
          taxNumber: organization.tax_number || "",
          taxOffice: organization.tax_office || "",
          // Older organizations can still have their verified activation
          // address in the legacy fields. Read it as a one-way compatibility
          // fallback; checkout always treats this profile as server-owned.
          billingAddress: organization.billing_address || organization.legal_address || "",
          billingCity: organization.billing_city || organization.city || "",
          billingDistrict: organization.billing_district || organization.district || "",
          billingPostalCode: organization.billing_postal_code || "",
          billingEmail: organization.billing_email || "",
          billingPhone: organization.billing_phone || "",
          authorizedPersonName: organization.authorized_person_name || "",
        };
      }
    }
    surface.setOrganizationTargets(managedOrgs);
  }
  surface.setCheckoutReady(true);
}
