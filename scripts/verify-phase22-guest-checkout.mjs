import { readFileSync } from "node:fs";

const api = readFileSync("app/api/commerce/checkout/route.ts", "utf8");
const page = readFileSync("app/checkout/page.tsx", "utf8");
const cart = readFileSync("app/sepet/page.tsx", "utf8");
const callback = readFileSync("app/api/payments/iyzico/callback/route.ts", "utf8");
const status = readFileSync("app/api/commerce/orders/status/route.ts", "utf8");
const success = readFileSync("app/odeme/basarili/OrderResultGate.tsx", "utf8");
const activationAction = readFileSync("app/odeme/basarili/ActivationAction.tsx", "utf8");

const apiContracts = [
  "let authenticatedUserId: string | null = null;",
  "Guest orders remain claimable by email after",
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
  "Hesap açmadan güvenli ödeme yapabilirsin",
  "siparişini bu e-posta ile hesabına bağlayabilirsin",
  "headers.authorization",
  "const mergedCart = readCart();",
];
for (const token of pageContracts) {
  if (!page.includes(token)) throw new Error(`Missing guest checkout UI contract: ${token}`);
}

if (!cart.includes("Hesap açmadan ödeme yapabilirsin")) {
  throw new Error("Cart must explain guest payment timing.");
}

const callbackContracts = [
  "sendActivationEmail",
  'event_type: "ACTIVATION"',
  "sendGuestActivationIfTokenPersisted",
  'payload?.code === "ACCOUNT_REQUIRED"',
];
for (const token of callbackContracts) {
  if (!callback.includes(token)) throw new Error(`Missing guest activation callback contract: ${token}`);
}

if (!status.includes("activationRequired")) {
  throw new Error("Order status API must expose activationRequired without leaking PII.");
}
if (!success.includes("activationRequired") || !success.includes("Siparişin henüz bir hesaba bağlı değil")) {
  throw new Error("Success page must not claim account binding for guest orders.");
}
if (!activationAction.includes("/api/commerce/activation/resend")) {
  throw new Error("Guest success CTA must offer activation resend.");
}
const middleware = readFileSync("middleware.ts", "utf8");
if (!middleware.includes('"/checkout"') || !middleware.includes('"/aktivasyon"') || !middleware.includes('"/api/auth/session"')) {
  throw new Error("Middleware must match checkout, activation, and auth session cookie routes.");
}
const session = readFileSync("app/api/auth/session/route.ts", "utf8");
if (!session.includes("httpOnly: true") || !session.includes("auth.getUser")) {
  throw new Error("Access token cookie must be HttpOnly and verified before set.");
}
const activation = readFileSync("app/aktivasyon/ActivationClient.tsx", "utf8");
if (!activation.includes("yenomi-activation-token") || !activation.includes('router.replace("/aktivasyon"')) {
  throw new Error("Activation token must be stripped from the URL after capture.");
}

console.log("Phase 22 guest checkout contract: PASS");
