import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { paytrConfig } from "./config";

const PAYTR_TOKEN_URL = "https://www.paytr.com/odeme/api/get-token";
const PAYTR_NO_INSTALLMENT = "0";
const PAYTR_MAX_INSTALLMENT = "0";
const PAYTR_CURRENCY = "TL";
const PAYTR_IFRAME_V2 = "1";
const PAYTR_FAILURE_REASON_CODE = /^\d{1,4}$/;

export type PaytrBasketItem = {
  name: string;
  unitPriceKurus: number;
  quantity: number;
};

type PaytrTokenRequest = {
  merchantOid: string;
  userIp: string;
  email: string;
  userName: string;
  userAddress: string;
  userPhone: string;
  amountKurus: number;
  basketItems: PaytrBasketItem[];
  merchantOkUrl: string;
  merchantFailUrl: string;
};

type PaytrTokenResponse = {
  status?: string;
  token?: string;
  reason?: string;
};

function asMoney(kurus: number) {
  return (kurus / 100).toFixed(2);
}

export function createPaytrMerchantOid() {
  return `PT${randomUUID().replaceAll("-", "")}`;
}

export function createPaytrUserBasket(items: PaytrBasketItem[]) {
  return Buffer.from(JSON.stringify(items.map((item) => [
    item.name.slice(0, 255),
    asMoney(item.unitPriceKurus),
    item.quantity,
  ]))).toString("base64");
}

export function createPaytrTokenHash(input: {
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
  userIp: string;
  merchantOid: string;
  email: string;
  paymentAmount: string;
  userBasket: string;
  testMode: "0" | "1";
}) {
  const hashInput = [
    input.merchantId,
    input.userIp,
    input.merchantOid,
    input.email,
    input.paymentAmount,
    input.userBasket,
    PAYTR_NO_INSTALLMENT,
    PAYTR_MAX_INSTALLMENT,
    PAYTR_CURRENCY,
    input.testMode,
    input.merchantSalt,
  ].join("");
  return createHmac("sha256", input.merchantKey).update(hashInput).digest("base64");
}

export async function initializePaytrCheckout(input: PaytrTokenRequest) {
  if (!Number.isInteger(input.amountKurus) || input.amountKurus <= 0) {
    return { ok: false as const, errorCode: "INVALID_AMOUNT", errorMessage: "Ödeme tutarı geçersiz." };
  }
  if (!input.basketItems.length || input.basketItems.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.unitPriceKurus < 0)) {
    return { ok: false as const, errorCode: "INVALID_BASKET", errorMessage: "Sipariş kalemleri geçersiz." };
  }

  const paymentAmount = String(input.amountKurus);
  const userBasket = createPaytrUserBasket(input.basketItems);
  const testMode = paytrConfig.testMode ? "1" : "0";
  const paytrToken = createPaytrTokenHash({
    merchantId: paytrConfig.merchantId,
    merchantKey: paytrConfig.merchantKey,
    merchantSalt: paytrConfig.merchantSalt,
    userIp: input.userIp,
    merchantOid: input.merchantOid,
    email: input.email,
    paymentAmount,
    userBasket,
    testMode,
  });

  const form = new URLSearchParams({
    merchant_id: paytrConfig.merchantId,
    user_ip: input.userIp,
    merchant_oid: input.merchantOid,
    email: input.email,
    payment_amount: paymentAmount,
    paytr_token: paytrToken,
    user_basket: userBasket,
    debug_on: testMode,
    no_installment: PAYTR_NO_INSTALLMENT,
    max_installment: PAYTR_MAX_INSTALLMENT,
    user_name: input.userName,
    user_address: input.userAddress,
    user_phone: input.userPhone,
    merchant_ok_url: input.merchantOkUrl,
    merchant_fail_url: input.merchantFailUrl,
    timeout_limit: "30",
    currency: PAYTR_CURRENCY,
    test_mode: testMode,
    lang: "tr",
    iframe_v2: PAYTR_IFRAME_V2,
  });

  try {
    const response = await fetch(PAYTR_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({})) as PaytrTokenResponse;
    if (!response.ok || payload.status !== "success" || !payload.token) {
      return {
        ok: false as const,
        errorCode: "PAYTR_TOKEN_REJECTED",
        errorMessage: "PayTR ödeme sayfası oluşturulamadı.",
      };
    }
    return { ok: true as const, token: payload.token };
  } catch {
    return {
      ok: false as const,
      errorCode: "PAYTR_TOKEN_UNAVAILABLE",
      errorMessage: "PayTR ödeme sayfasına şu anda ulaşılamıyor.",
    };
  }
}

export function verifyPaytrCallbackHash(input: {
  merchantOid: string;
  status: string;
  totalAmount: string;
  hash: string;
}) {
  if (!input.merchantOid || !input.status || !/^\d+$/.test(input.totalAmount) || !input.hash) return false;
  const expected = createHmac("sha256", paytrConfig.merchantKey)
    .update(`${input.merchantOid}${paytrConfig.merchantSalt}${input.status}${input.totalAmount}`)
    .digest("base64");
  const supplied = Buffer.from(input.hash, "utf8");
  const trusted = Buffer.from(expected, "utf8");
  return supplied.length === trusted.length && timingSafeEqual(supplied, trusted);
}

export function paytrFailureCode(value: unknown) {
  if (typeof value !== "string") {
    return "PAYTR_PAYMENT_FAILED";
  }

  const code = value.trim();
  return PAYTR_FAILURE_REASON_CODE.test(code)
    ? `PAYTR_DECLINED_${code}`
    : "PAYTR_PAYMENT_FAILED";
}
