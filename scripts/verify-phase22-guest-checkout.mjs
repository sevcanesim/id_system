import { readFileSync } from "node:fs";

const api = readFileSync("app/api/commerce/checkout/route.ts", "utf8");
const page = readFileSync("app/checkout/page.tsx", "utf8");
const cart = readFileSync("app/sepet/page.tsx", "utf8");
const callback = readFileSync("app/api/payments/paytr/callback/route.ts", "utf8");
const settle = readFileSync("lib/payments/settle-commerce-payment.ts", "utf8");
const status = readFileSync("app/api/commerce/orders/status/route.ts", "utf8");
const success = readFileSync("app/odeme/basarili/OrderResultGate.tsx", "utf8");
const activationAction = readFileSync("app/odeme/basarili/ActivationAction.tsx", "utf8");
const paymentFlow = `${callback}\n${settle}`;

const apiContracts = [
  "let authenticatedUserId: string | null = null;",
  'retryQuery.eq("guest_email", normalizedEmail);',
  "guest_email: normalizedEmail",
  "user_id: authenticatedUserId",
  "if (!authenticatedUserId || !membership",
];
for (const token of apiContracts) {
  if (!api.includes(token)) throw new Error(`Missing guest checkout API contract: ${token}`);
}

const pageContracts = [
  "const [checkoutReady, setCheckoutReady]",
  "const [isAuthenticated, setIsAuthenticated]",
  "Hesap açmadan ilerleyebilirsin; siparişini daha sonra bu e-posta ile hesabına bağlayabilirsin.",
  "getBrowserIdentity",
  "const mergedCart = readCart();",
];
for (const token of pageContracts) {
  if (!page.includes(token)) throw new Error(`Missing guest checkout UI contract: ${token}`);
}
if (page.includes("headers.authorization") || page.includes("access_token")) {
  throw new Error("Checkout must use the HttpOnly session cookie instead of browser access tokens.");
}

if (!cart.includes("Hesap açmadan ilerleyebilirsin")) {
  throw new Error("Cart must explain guest payment timing.");
}

const callbackContracts = [
  "sendActivationEmail",
  'event_type: "ACTIVATION"',
  "sendGuestActivationIfTokenPersisted",
  'payload?.code === "ACCOUNT_REQUIRED"',
];
for (const token of callbackContracts) {
  if (!paymentFlow.includes(token)) throw new Error(`Missing guest activation callback contract: ${token}`);
}

if (!callback.includes("settleCommercePaymentByPaytrCallback") || !callback.includes("verifyPaytrCallbackHash")) {
  throw new Error("PayTR callback must be signature-verified and settle through the atomic commerce path.");
}
if (status.includes("retrieveCheckout") || status.includes("settlePendingCommercePaymentByOrderId")) {
  throw new Error("Order status GET must stay side-effect free.");
}
if (success.includes("/api/payments/iyzico/recover") || !success.includes("reviewRequired && !data.activationRequired")) {
  throw new Error("Success page must keep payment state read-only and surface authenticated claim failures.");
}
if (!api.includes("stampPhysicalProductionConfig") || !api.includes("applyPendingOrderCookie")) {
  throw new Error("Checkout must stamp physical production config and persist a pending-order cookie.");
}
const browserCheckout = readFileSync("lib/payments/browser-checkout.ts", "utf8");
if (!page.includes("lookupPendingCheckoutOrder") || !page.includes("yenomi-cart-change")) {
  throw new Error("Checkout must hydrate the pending-order cookie and listen for cart changes.");
}
if (!browserCheckout.includes("/api/commerce/orders/pending") || !browserCheckout.includes('credentials: "same-origin"')) {
  throw new Error("Pending-order lookup must use the HttpOnly cookie endpoint.");
}

if (!status.includes("activationRequired")) {
  throw new Error("Order status API must expose activationRequired without leaking PII.");
}
if (status.includes("company_name") || status.includes("tax_number") || status.includes("guest_email")) {
  throw new Error("Order status API must not leak billing or identity fields.");
}
if (!status.includes("corporate") || !status.includes("reviewRequired")) {
  throw new Error("Order status API must expose corporate and reviewRequired flags.");
}
if (!success.includes("activationRequired") || !success.includes("Siparişin henüz bir hesaba bağlı değil")) {
  throw new Error("Success page must not claim account binding for guest orders.");
}
if (!activationAction.includes("/api/commerce/activation/resend")) {
  throw new Error("Guest success CTA must offer activation resend.");
}
const middleware = readFileSync("proxy.ts", "utf8");
if (!middleware.includes('"/checkout"') || !middleware.includes('"/aktivasyon"') || !middleware.includes('"/api/auth/session"') || !middleware.includes('"/api/commerce/orders/pending"')) {
  throw new Error("Middleware must match checkout, activation, auth session, and pending-order routes.");
}
if (middleware.includes('scope: "paytr-callback"')) {
  throw new Error("Signature-verified PayTR callback must not be rejected by an IP limiter.");
}
const session = readFileSync("app/api/auth/session/route.ts", "utf8");
const sessionHelper = readFileSync("lib/auth/http-only-session.ts", "utf8");
if (!session.includes("httpOnly: true") || !session.includes("auth.getUser")) {
  throw new Error("Access token cookie must be HttpOnly and verified before set.");
}
if (!session.includes("export async function GET") || !sessionHelper.includes("yenomi-refresh-token") || !sessionHelper.includes("grant_type=refresh_token")) {
  throw new Error("Session route must restore and rotate refresh tokens via HttpOnly cookies.");
}
const activation = readFileSync("app/aktivasyon/ActivationClient.tsx", "utf8");
if (!activation.includes("window.location.hash") || !activation.includes("history.replaceState") || activation.includes("sessionStorage")) {
  throw new Error("Activation token must remain in the URL fragment and never enter browser storage.");
}
const canonical = readFileSync("app/canonical.css", "utf8");
if (!canonical.includes(".activation-callout") || !canonical.includes(".p5-next-steps") || !canonical.includes(".p18-review-notice")) {
  throw new Error("Payment result callout and next-step chrome must be styled in canonical.css.");
}
if (canonical.includes("#1a0dab") || canonical.includes("#188038")) {
  throw new Error("Footer SERP chrome must not use Google result colors.");
}

console.log("Phase 22 guest checkout contract: PASS");
