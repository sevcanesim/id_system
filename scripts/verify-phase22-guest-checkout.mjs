import { readFileSync } from "node:fs";

const api = readFileSync("app/api/commerce/checkout/route.ts", "utf8");
const page = readFileSync("app/checkout/page.tsx", "utf8");
const cart = readFileSync("app/sepet/page.tsx", "utf8");

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
];
for (const token of pageContracts) {
  if (!page.includes(token)) throw new Error(`Missing guest checkout UI contract: ${token}`);
}

if (!cart.includes("Satın alma sırasında giriş yapar veya hesap oluşturursun")) {
  throw new Error("Cart must explain account timing.");
}

console.log("Phase 22 guest checkout contract: PASS");
