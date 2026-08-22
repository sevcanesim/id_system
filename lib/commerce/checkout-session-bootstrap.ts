import { readCart, setCartOwner } from "../cart";
import {
  fetchLastOrderCheckoutPrefill,
  mergeCheckoutPrefill,
  sessionCheckoutPrefill,
} from "./checkout-prefill";

type SessionLike = {
  access_token: string;
  user: {
    id: string;
    email?: string | null;
    phone?: string | null;
    user_metadata?: Record<string, unknown>;
  };
};

type CheckoutForm = {
  recipientName: string;
  email: string;
  phone: string;
  addressLine: string;
  district: string;
  city: string;
  postalCode: string;
};

export async function bootstrapAuthenticatedCheckout<T extends CheckoutForm>(
  session: SessionLike | null,
  handlers: {
    setForm: (updater: (current: T) => T) => void;
    setItems: (items: ReturnType<typeof readCart>) => void;
    setIsAuthenticated: (value: boolean) => void;
    setOrganizationTargets: (value: Record<string, { name: string; role: string }>) => void;
    setCheckoutReady: (value: boolean) => void;
  },
) {
  if (!session) {
    handlers.setCheckoutReady(true);
    return;
  }

  handlers.setIsAuthenticated(true);
  setCartOwner(session.user.id, { claimGuest: true });
  const mergedCart = readCart();
  handlers.setItems(mergedCart);
  handlers.setForm((current) => mergeCheckoutPrefill(current, sessionCheckoutPrefill(session.user)));

  const organizationIds = Array.from(new Set(
    mergedCart.map((item) => item.configuration?.organizationId).filter((id): id is string => typeof id === "string"),
  ));

  const [organizations, lastOrder] = await Promise.all([
    organizationIds.length
      ? fetch("/api/organizations/mine?management=true", { headers: { authorization: `Bearer ${session.access_token}` } })
        .then((response) => response.ok ? response.json() : null)
        .catch(() => null)
      : Promise.resolve(null),
    fetchLastOrderCheckoutPrefill(session.access_token).catch(() => null),
  ]);

  if (lastOrder) handlers.setForm((current) => mergeCheckoutPrefill(current, lastOrder));
  if (organizations) {
    const next: Record<string, { name: string; role: string }> = {};
    for (const row of organizations.organizations || []) {
      if (organizationIds.includes(row.organization_id)) {
        next[row.organization_id] = { name: row.organizations?.name || "Kurumsal hesap", role: row.role || "" };
      }
    }
    handlers.setOrganizationTargets(next);
  }
  handlers.setCheckoutReady(true);
}
