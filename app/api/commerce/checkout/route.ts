import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import Iyzipay from "iyzipay";
import { z } from "zod";
import { initializeCheckout } from "../../../../lib/payments/iyzico";
import { isIyzicoConfigured, publicSiteUrl } from "../../../../lib/payments/config";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";
import { canManageTemplates, isOrganizationRole } from "../../../../lib/organizations/permissions";
import { isValidIdentityNumber, normalizeIdentityNumber } from "../../../../lib/validation/payment";
import { publicError } from "../../../../lib/errors";
import {
  createCheckoutFingerprint,
  isValidIdempotencyKey,
  normalizeIdempotencyKey,
} from "../../../../lib/payments/idempotency";
import { getDatabaseLegalVersions } from "../../../../lib/config/database";
import { COMMERCIAL_SKUS, digitalServiceBillingAddress, isCorporatePackageSku, isDigitalOnlySku, isPremiumUpgradeSku } from "../../../../lib/config/commercial";
import { corporateCheckoutLive, corporatePackageBySku, isDirectCheckoutBlocked } from "../../../../lib/commerce/packages";
import { parseCompanyBilling } from "../../../../lib/validation/company";
import { decideOpenPaymentAttempt } from "../../../../lib/payments/reuse-open-attempt";
import { applyPendingOrderCookie } from "../../../../lib/payments/pending-order-cookie";
import { stampPhysicalProductionConfig } from "../../../../lib/commerce/production-config";
import { findExistingCheckoutAttempt } from "../../../../lib/payments/checkout-idempotency-lookup";
import { rejectCheckoutInitializeFlood } from "../../../../lib/security/route-rate-limits";

export const runtime = "nodejs";

function checkoutSchema(legalVersions: Awaited<ReturnType<typeof getDatabaseLegalVersions>>) { return z.object({
  items: z.array(z.object({
    productSlug: z.string().min(2).max(100),
    variantSku: z.string().min(2).max(100),
    quantity: z.number().int().min(1).max(20),
    configuration: z.record(z.any()).optional(),
  })).min(1).max(20),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email(),
    phone: z.string().trim().min(10).max(30),
    identityNumber: z.string().trim().min(5).max(20),
    identityType: z.enum(["TR", "FOREIGN"]).default("TR"),
  }),
  shipping: z.object({
    recipientName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(10).max(30),
    addressLine: z.string().trim().max(500).optional().default(""),
    district: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().max(12).nullable().optional(),
    deliveryNote: z.string().trim().max(500).nullable().optional(),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    countryCode: z.literal("TR"),
  }),
  retryOrderId: z.string().uuid().nullable().optional(),
  consents: z.object({
    distanceSalesAccepted: z.literal(true),
    personalizationAccepted: z.literal(true),
    distanceSalesVersion: z.literal(legalVersions.distanceSales),
    personalizationVersion: z.literal(legalVersions.personalization),
    privacyVersion: z.literal(legalVersions.privacy),
  }).strict(),
  company: z.object({
    name: z.string().max(180).optional(),
    taxNumber: z.string().max(32).optional(),
    taxOffice: z.string().max(80).optional(),
  }).optional(),
}).strict(); }

type ProductVariant = {
  id: string;
  sku: string;
  name: string;
  price_kurus: number;
  billing_period: string | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
};

const SEAT_PACK_PRODUCT_SLUG = "yenomi-business-seat-pack";

type CalculatedItem = {
  product: { id: string; slug: string; name: string; kind: string };
  variant: ProductVariant;
  quantity: number;
  unitPriceKurus: number;
  lineTotalKurus: number;
  configuration?: Record<string, unknown>;
};

function splitName(value: string) {
  const parts = value.trim().split(/\s+/);
  return { name: parts[0] || "Müşteri", surname: parts.slice(1).join(" ") || "Yenomi" };
}

function jsonWithPendingOrder(body: object, init?: { status?: number }) {
  const response = NextResponse.json(body, init);
  const record = body as { orderId?: unknown; resetOrder?: unknown };
  const orderId = typeof record.orderId === "string" ? record.orderId : null;
  if (record.resetOrder) return applyPendingOrderCookie(response, null);
  if (orderId) return applyPendingOrderCookie(response, orderId);
  return response;
}

function duplicateAttemptResponse(attempt: {
  order_id: string;
  status: string;
  request_fingerprint: string | null;
  payment_page_url: string | null;
}, fingerprint: string) {
  if (attempt.request_fingerprint !== fingerprint) {
    return jsonWithPendingOrder({ ...publicError("IDEMPOTENCY_CONFLICT"), retryable: true, resetOrder: true }, { status: 409 });
  }
  if (attempt.status === "PAID") {
    return jsonWithPendingOrder({ ...publicError("ORDER_ALREADY_PAID"), orderId: attempt.order_id }, { status: 409 });
  }
  if (attempt.status === "PENDING" && attempt.payment_page_url) {
    return jsonWithPendingOrder({ orderId: attempt.order_id, paymentPageUrl: attempt.payment_page_url, reused: true });
  }
  if (attempt.status === "FAILED") {
    return jsonWithPendingOrder({
      ...publicError("PAYMENT_UNAVAILABLE", { message: "Ödeme tamamlanamadı. Aynı siparişi yeni bir ödeme isteğiyle tekrar deneyebilirsin." }),
      orderId: attempt.order_id,
      retryable: true,
    }, { status: 409 });
  }
  return jsonWithPendingOrder({ ...publicError("PAYMENT_IN_PROGRESS") }, { status: 409 });
}

export async function POST(request: NextRequest) {
  try {
    const flooded = await rejectCheckoutInitializeFlood(request);
    if (flooded) return flooded;
    if (!isIyzicoConfigured) return NextResponse.json(publicError("PAYMENT_UNAVAILABLE"), { status: 503 });

    const idempotencyKey = normalizeIdempotencyKey(request.headers.get("x-idempotency-key"));
    if (!isValidIdempotencyKey(idempotencyKey)) {
      return NextResponse.json(publicError("VALIDATION_ERROR", { message: "Ödeme güvenlik anahtarı geçersiz. Sayfayı yenileyip yeniden dene." }), { status: 400 });
    }

    const legalVersions = await getDatabaseLegalVersions();
    const parsed = checkoutSchema(legalVersions).safeParse(await request.json());
    if (!parsed.success) {
      const payload = publicError("VALIDATION_ERROR");
      console.error("checkout validation failed", { reference: payload.reference, issueCount: parsed.error.issues.length });
      return NextResponse.json(payload, { status: 400 });
    }

    const body = parsed.data;
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    let authenticatedUserId: string | null = null;
    let normalizedEmail = body.customer.email.toLowerCase();

    // Physical-first checkout supports guest purchase. If a session exists,
    // we bind the order to that user and require the checkout email to match
    // the authenticated account. Guest orders remain claimable by email after
    // payment and do not receive an authenticated user_id.
    if (bearer) {
      const auth = getSupabaseAuthClient();
      const { data: authData } = await auth.auth.getUser(bearer);
      if (authData.user?.id && authData.user.email) {
        authenticatedUserId = authData.user.id;
        normalizedEmail = authData.user.email.toLowerCase();
        if (body.customer.email.toLowerCase() !== normalizedEmail) {
          return NextResponse.json({ error: "Sipariş e-postası giriş yaptığın hesapla eşleşmelidir." }, { status: 403 });
        }
      }
    }
    const identityNumber = normalizeIdentityNumber(body.customer.identityNumber, body.customer.identityType);
    if (!isValidIdentityNumber(identityNumber, body.customer.identityType)) {
      return NextResponse.json({ error: body.customer.identityType === "TR" ? "Geçerli bir T.C. kimlik numarası gir." : "Geçerli bir pasaport numarası gir." }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    const slugs = [...new Set(body.items.map((item) => item.productSlug))];
    const { data: products, error: productError } = await admin
      .from("products")
      .select("id,slug,name,kind,is_active,product_variants(id,sku,name,price_kurus,billing_period,is_active,metadata)")
      .in("slug", slugs)
      .eq("is_active", true);

    if (productError || !products) return NextResponse.json(publicError("ORDER_CREATE_FAILED"), { status: 500 });

    const calculated: CalculatedItem[] = body.items.map((item) => {
      const product = products.find((row) => row.slug === item.productSlug);
      const variants = (product?.product_variants || []) as ProductVariant[];
      const variant = variants.find((row) => row.is_active && row.sku === item.variantSku);
      if (!product || !variant) throw new Error(`Product unavailable: ${item.productSlug}`);
      return {
        product: { id: product.id, slug: product.slug, name: product.name, kind: product.kind },
        variant,
        quantity: item.quantity,
        unitPriceKurus: Number(variant.price_kurus),
        lineTotalKurus: Number(variant.price_kurus) * item.quantity,
        configuration: item.configuration,
      };
    });

    for (const item of calculated) {
      const metadata = (item.variant.metadata as Record<string, unknown> | null) || {};
      if (isDirectCheckoutBlocked(metadata)) {
        return NextResponse.json({ error: "Bu ürün henüz doğrudan satın alınamaz." }, { status: 409 });
      }
    }

    // Capacity add-on lines must target an organization the buyer actually
    // manages, and only a fully ACTIVE subscription may expand capacity.
    // GRACE_PERIOD is intentionally excluded: overdue accounts must restore
    // their base subscription before purchasing additional seats.
    for (const item of calculated) {
      const metadata = (item.variant.metadata as Record<string, unknown> | null) || {};
      const isCapacityAddon = metadata.fulfillment_kind === "BUSINESS_CAPACITY_ADDON"
        || item.product.slug === SEAT_PACK_PRODUCT_SLUG;
      if (!isCapacityAddon) continue;
      const organizationId = item.configuration?.organizationId;
      if (typeof organizationId !== "string" || !/^[0-9a-f-]{36}$/i.test(organizationId)) {
        return NextResponse.json({ error: "Ek kullanıcı paketi için geçerli bir şirket seçilmedi." }, { status: 400 });
      }
      const { data: membership } = await admin
        .from("organization_members")
        .select("role,status")
        .eq("organization_id", organizationId)
        .eq("user_id", authenticatedUserId)
        .maybeSingle();
      if (!authenticatedUserId || !membership || !isOrganizationRole(membership.role) || !canManageTemplates(membership.role, membership.status)) {
        return NextResponse.json({ error: "Ek kullanıcı paketi satın almak için kurumsal hesabınla giriş yapmalısın." }, { status: 403 });
      }
      const { data: activeSubscription } = await admin
        .from("organization_subscriptions")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("status", "ACTIVE")
        .limit(1)
        .maybeSingle();
      if (!activeSubscription) {
        return NextResponse.json({ error: "Ek kullanıcı paketi için kurumsal aboneliğin ACTIVE durumda olmalı. Ödeme gecikmesi veya askı varsa önce aboneliği yeniden aktif hale getir." }, { status: 409 });
      }
      const seatCount = Number(metadata.seat_count);
      if (!Number.isFinite(seatCount) || seatCount <= 0) {
        return NextResponse.json(publicError("ORDER_CREATE_FAILED"), { status: 500 });
      }
      // Server-authoritative seat count always overrides any client value.
      item.configuration = { ...(item.configuration || {}), organizationId, seatCount };
    }

    const corporateItems = calculated.filter((item) => {
      const metadata = (item.variant.metadata as Record<string, unknown> | null) || {};
      return metadata.fulfillment_kind === "CORPORATE_PACKAGE" || isCorporatePackageSku(item.variant.sku);
    });
    if (corporateItems.length) {
      if (corporateItems.length !== calculated.length) {
        return NextResponse.json({ error: "Kurumsal paket başka ürünlerle aynı siparişte alınamaz." }, { status: 400 });
      }
      if (corporateItems.length > 1 || corporateItems.some((item) => item.quantity !== 1)) {
        return NextResponse.json({ error: "Aynı siparişte yalnız bir kurumsal paket ve 1 adet seçilebilir." }, { status: 400 });
      }
      const pack = corporateItems[0];
      if (!pack) {
        return NextResponse.json({ error: "Kurumsal paket seçilmedi." }, { status: 400 });
      }
      const metadata = (pack.variant.metadata as Record<string, unknown> | null) || {};
      const catalog = corporatePackageBySku(pack.variant.sku);
      const seats = Number(metadata.seat_count ?? catalog?.seats);
      if (!catalog || !corporateCheckoutLive(seats) || Number(pack.variant.price_kurus) !== catalog.priceKurus) {
        return NextResponse.json({ error: "Bu kurumsal paket doğrudan satın alınamaz. 100 kişiyi aşan ekipler için teklif alın." }, { status: 409 });
      }
      const parsedCompany = parseCompanyBilling(body.company);
      if (!parsedCompany.ok) {
        return NextResponse.json({ error: parsedCompany.error }, { status: 400 });
      }
      const { data: existingCompany } = await admin
        .from("organizations")
        .select("id")
        .eq("tax_number", parsedCompany.company.taxNumber)
        .maybeSingle();
      if (existingCompany) {
        return NextResponse.json({ error: "Bu vergi numarası başka bir şirkette kayıtlı. Mevcut kurumsal hesabınızla giriş yapın veya teklif alın." }, { status: 409 });
      }
      pack.configuration = {
        packageCode: catalog.code,
        seatCount: catalog.seats,
        companyName: parsedCompany.company.name,
        taxNumber: parsedCompany.company.taxNumber,
        taxOffice: parsedCompany.company.taxOffice,
      };
    }

    const hasPhysicalOnlyCard = calculated.some((item) => {
      const kind = ((item.variant.metadata || {}) as Record<string, unknown>).fulfillment_kind;
      return kind === "EXTRA_CARD" || kind === "REPLACEMENT_CARD" || item.variant.sku === COMMERCIAL_SKUS.ADDITIONAL_CARD;
    });
    const includesNewDigitalService = calculated.some((item) => {
      const metadata = (item.variant.metadata || {}) as Record<string, unknown>;
      return metadata.digital_service_included === true || metadata.fulfillment_kind === "INITIAL_BUNDLE" || metadata.fulfillment_kind === "DIGITAL_INITIAL" || metadata.fulfillment_kind === "CORPORATE_PACKAGE" || item.variant.sku === COMMERCIAL_SKUS.INITIAL || item.variant.sku === COMMERCIAL_SKUS.PREMIUM || item.variant.sku === COMMERCIAL_SKUS.DIGITAL;
    });
    const physicalOnlyCardNeedsActiveEntitlement = hasPhysicalOnlyCard && !includesNewDigitalService;
    const includesRenewal = calculated.some((item) => ((item.variant.metadata || {}) as Record<string, unknown>).fulfillment_kind === "DIGITAL_RENEWAL");
    const includesPremiumUpgrade = calculated.some((item) => {
      const metadata = (item.variant.metadata || {}) as Record<string, unknown>;
      return metadata.fulfillment_kind === "PREMIUM_UPGRADE" || isPremiumUpgradeSku(item.variant.sku);
    });
    const includesReplacement = calculated.some((item) => ((item.variant.metadata || {}) as Record<string, unknown>).fulfillment_kind === "REPLACEMENT_CARD");
    const includesPremiumRenewal = calculated.some((item) => item.variant.sku === COMMERCIAL_SKUS.PREMIUM_RENEWAL);
    const includesBasicRenewal = calculated.some((item) => item.variant.sku === COMMERCIAL_SKUS.RENEWAL);
    const digitalOnlyCart = calculated.length > 0 && calculated.every((item) => isDigitalOnlySku(item.variant.sku));
    const shipping = {
      ...body.shipping,
      addressLine: digitalOnlyCart
        ? digitalServiceBillingAddress(body.shipping.city, body.shipping.addressLine)
        : body.shipping.addressLine.trim(),
      latitude: digitalOnlyCart ? null : body.shipping.latitude ?? null,
      longitude: digitalOnlyCart ? null : body.shipping.longitude ?? null,
      deliveryNote: digitalOnlyCart ? null : body.shipping.deliveryNote || null,
    };
    if (!digitalOnlyCart && shipping.addressLine.length < 8) {
      return NextResponse.json({ error: "Teslimat adresini daha ayrıntılı yaz." }, { status: 400 });
    }

    if (includesPremiumRenewal && includesBasicRenewal) {
      return NextResponse.json({ error: "Aynı siparişte temel ve Premium yenileme birlikte alınamaz." }, { status: 400 });
    }

    if (physicalOnlyCardNeedsActiveEntitlement || includesRenewal || includesPremiumUpgrade) {
      const statuses = includesRenewal && !includesPremiumUpgrade ? ["ACTIVE", "EXPIRED"] : ["ACTIVE"];
      const { data: activeEntitlement } = await admin
        .from("entitlements")
        .select("id,package_code,status")
        .eq("user_id", authenticatedUserId)
        .in("status", statuses)
        .in("kind", ["BUSINESS_CARD", "NFC_PHYSICAL_CARD"])
        .order("expires_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (!activeEntitlement) {
        const message = includesPremiumUpgrade
          ? "Premium yükseltme için aktif bir Yenomi ID hizmetin bulunmalı."
          : includesRenewal
            ? "Yenileme için mevcut veya süresi dolmuş bir Yenomi ID hizmetin bulunmalı."
            : "Ek kart satın almak için aktif bir Yenomi ID paketin bulunmalı.";
        return NextResponse.json({ error: message }, { status: 403 });
      }
      if (includesPremiumUpgrade && activeEntitlement.package_code === "INDIVIDUAL_PREMIUM") {
        return NextResponse.json({ error: "Hesabın zaten Bireysel Premium. Yenileme fiyatından devam et." }, { status: 409 });
      }
      if (includesPremiumRenewal && activeEntitlement.package_code !== "INDIVIDUAL_PREMIUM") {
        return NextResponse.json({ error: "Premium yenileme yalnız Bireysel Premium hesaplara açıktır. Önce yükseltme paketini kullan." }, { status: 403 });
      }
    }
    if (includesReplacement) {
      const { data: lostCard } = await admin.from("physical_cards").select("id").eq("owner_user_id", authenticatedUserId).eq("status", "LOST").limit(1).maybeSingle();
      if (!lostCard) return NextResponse.json({ error: "Replacement kart yalnız kayıp moduna alınmış bir kart için satın alınabilir." }, { status: 409 });
    }

    const companyBilling = corporateItems[0]
      ? parseCompanyBilling(body.company)
      : null;
    const company = companyBilling?.ok ? companyBilling.company : null;

    const subtotalKurus = calculated.reduce((sum, item) => sum + item.lineTotalKurus, 0);
    const shippingKurus = 0;
    const totalKurus = subtotalKurus + shippingKurus;
    const fingerprint = createCheckoutFingerprint({
      items: body.items,
      email: normalizedEmail,
      totalKurus,
      customer: { name: body.customer.name, phone: body.customer.phone, identityType: body.customer.identityType, identityNumber },
      shipping,
      consents: body.consents,
      company: company ?? {},
    });

    const { data: existingAttempt } = await findExistingCheckoutAttempt(admin, idempotencyKey);
    if (existingAttempt) return duplicateAttemptResponse(existingAttempt, fingerprint);

    let order: { id: string; order_number: string } | null = null;
    let createdNewOrder = false;

    if (body.retryOrderId) {
      let retryQuery = admin
        .from("commerce_orders")
        .select("id,order_number,total_kurus,status,guest_email,user_id")
        .eq("id", body.retryOrderId)
        .eq("status", "AWAITING_PAYMENT")
        .eq("total_kurus", totalKurus);

      retryQuery = authenticatedUserId
        ? retryQuery.or(`user_id.eq.${authenticatedUserId},guest_email.eq.${normalizedEmail}`)
        : retryQuery.eq("guest_email", normalizedEmail);

      const { data: retryOrder } = await retryQuery.maybeSingle();
      if (!retryOrder) {
        return NextResponse.json(publicError("VALIDATION_ERROR", { message: "Yeniden denenebilecek ödeme bekleyen sipariş bulunamadı." }), { status: 409 });
      }

      const { data: previousAttempt } = await admin
        .from("commerce_payment_attempts")
        .select("request_fingerprint")
        .eq("order_id", retryOrder.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (previousAttempt?.request_fingerprint && previousAttempt.request_fingerprint !== fingerprint) {
        return jsonWithPendingOrder({ ...publicError("IDEMPOTENCY_CONFLICT"), retryable: true, resetOrder: true }, { status: 409 });
      }
      order = { id: retryOrder.id, order_number: retryOrder.order_number };
    } else {
      const { data: createdOrder, error: orderError } = await admin
        .from("commerce_orders")
        .insert({
          guest_email: normalizedEmail,
          status: "AWAITING_PAYMENT",
          currency: "TRY",
          subtotal_kurus: subtotalKurus,
          shipping_kurus: shippingKurus,
          total_kurus: totalKurus,
          customer_name: body.customer.name,
          customer_phone: body.customer.phone,
          country_code: "TR",
          user_id: authenticatedUserId,
          company_name: company?.name ?? null,
          tax_number: company?.taxNumber ?? null,
          tax_office: company?.taxOffice ?? null,
        })
        .select("id,order_number")
        .single();

      if (orderError || !createdOrder) {
        const payload = publicError("ORDER_CREATE_FAILED");
        console.error("commerce order create error", { reference: payload.reference, code: orderError?.code });
        return NextResponse.json(payload, { status: 500 });
      }

      order = createdOrder;
      createdNewOrder = true;

      const { error: itemError } = await admin.from("commerce_order_items").insert(calculated.map((item) => ({
        order_id: order!.id,
        product_id: item.product.id,
        variant_id: item.variant.id,
        product_kind: item.product.kind,
        product_name: item.product.name,
        unit_price_kurus: item.unitPriceKurus,
        quantity: item.quantity,
        configuration: stampPhysicalProductionConfig(
          item.variant.sku,
          { sku: item.variant.sku, billingPeriod: item.variant.billing_period, ...(item.configuration || {}) },
          body.customer.name,
        ),
      })));

      if (itemError) {
        await admin.from("commerce_orders").delete().eq("id", order.id);
        return NextResponse.json(publicError("ORDER_CREATE_FAILED"), { status: 500 });
      }

      const mapUrl = shipping.latitude != null && shipping.longitude != null
        ? `https://www.google.com/maps?q=${shipping.latitude},${shipping.longitude}`
        : null;
      const { error: addressError } = await admin.from("shipping_addresses").insert({
        order_id: order.id,
        recipient_name: shipping.recipientName,
        phone: shipping.phone,
        address_line: shipping.addressLine,
        district: shipping.district,
        city: shipping.city,
        postal_code: shipping.postalCode || null,
        latitude: shipping.latitude,
        longitude: shipping.longitude,
        map_url: mapUrl,
        delivery_note: shipping.deliveryNote,
        country_code: "TR",
      });
      if (addressError) {
        await admin.from("commerce_orders").delete().eq("id", order.id);
        return NextResponse.json(publicError("ORDER_CREATE_FAILED"), { status: 500 });
      }

      const { error: consentError } = await admin.from("commerce_order_consents").insert({
        order_id: order.id,
        distance_sales_accepted: true,
        personalization_accepted: true,
        distance_sales_version: body.consents.distanceSalesVersion,
        personalization_version: body.consents.personalizationVersion,
        privacy_version: body.consents.privacyVersion,
        accepted_ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        request_id: request.headers.get("x-request-id") || null,
      });
      if (consentError) {
        await admin.from("commerce_orders").delete().eq("id", order.id);
        return NextResponse.json(publicError("ORDER_CREATE_FAILED"), { status: 500 });
      }
    }

    const { data: openAttempt } = await admin
      .from("commerce_payment_attempts")
      .select("id,order_id,status,request_fingerprint,payment_page_url")
      .eq("order_id", order.id)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const openDecision = decideOpenPaymentAttempt(openAttempt, fingerprint);
    if (openDecision === "conflict") {
      return jsonWithPendingOrder({ ...publicError("IDEMPOTENCY_CONFLICT"), retryable: true, resetOrder: true }, { status: 409 });
    }
    if (openDecision === "reuse" && openAttempt?.payment_page_url) {
      return jsonWithPendingOrder({ orderId: order.id, paymentPageUrl: openAttempt.payment_page_url, reused: true });
    }
    if (openDecision === "abandon" && openAttempt?.id) {
      await admin.from("commerce_payment_attempts").update({
        status: "FAILED",
        idempotency_key: null,
        error_message: "Checkout init incomplete",
        updated_at: new Date().toISOString(),
      }).eq("id", openAttempt.id);
    }

    const conversationId = randomUUID();
    const { data: reservedAttempt, error: reserveError } = await admin
      .from("commerce_payment_attempts")
      .insert({
        order_id: order.id,
        status: "PENDING",
        amount_kurus: totalKurus,
        currency: "TRY",
        conversation_id: conversationId,
        request_fingerprint: fingerprint,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (reserveError || !reservedAttempt) {
      if (createdNewOrder) await admin.from("commerce_orders").delete().eq("id", order.id);
      const { data: racedAttempt } = await findExistingCheckoutAttempt(admin, idempotencyKey);
      if (racedAttempt) return duplicateAttemptResponse(racedAttempt, fingerprint);
      const payload = publicError("PAYMENT_IN_PROGRESS");
      console.error("payment attempt reservation failed", { reference: payload.reference, code: reserveError?.code });
      return NextResponse.json(payload, { status: 409 });
    }

    const money = (totalKurus / 100).toFixed(2);
    const person = splitName(body.customer.name);
    const checkout = await initializeCheckout({
      locale: Iyzipay.LOCALE.TR,
      conversationId,
      price: money,
      paidPrice: money,
      currency: Iyzipay.CURRENCY.TRY,
      basketId: order.id,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: `${publicSiteUrl}/api/payments/iyzico/callback`,
      enabledInstallments: [1, 2, 3, 6, 9],
      buyer: {
        id: order.id,
        name: person.name,
        surname: person.surname,
        gsmNumber: body.customer.phone,
        email: body.customer.email,
        identityNumber,
        registrationAddress: shipping.addressLine,
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1",
        city: shipping.city,
        country: "Türkiye",
        zipCode: shipping.postalCode || "00000",
      },
      shippingAddress: {
        contactName: shipping.recipientName,
        city: shipping.city,
        country: "Türkiye",
        address: `${shipping.addressLine}, ${shipping.district}`,
        zipCode: shipping.postalCode || "00000",
      },
      billingAddress: {
        contactName: company ? company.name : shipping.recipientName,
        city: shipping.city,
        country: "Türkiye",
        address: company
          ? `${company.name}, VN ${company.taxNumber}, ${company.taxOffice}. ${shipping.addressLine}, ${shipping.district}`
          : `${shipping.addressLine}, ${shipping.district}`,
        zipCode: shipping.postalCode || "00000",
      },
      basketItems: calculated.map((item) => ({
        id: item.variant.sku,
        name: item.product.name,
        category1: "Yenomi ID",
        itemType: isDigitalOnlySku(item.variant.sku) ? "VIRTUAL" : "PHYSICAL",
        price: (item.lineTotalKurus / 100).toFixed(2),
      })),
    });

    if (checkout?.status !== "success" || !checkout?.token || !checkout.paymentPageUrl) {
      await admin.from("commerce_payment_attempts").update({
        status: "FAILED",
        error_code: checkout?.errorCode || null,
        error_message: checkout?.errorMessage || "Checkout başlatılamadı",
        updated_at: new Date().toISOString(),
      }).eq("id", reservedAttempt.id);
      const payload = publicError("PAYMENT_UNAVAILABLE");
      console.error("iyzico checkout rejected", { reference: payload.reference, errorCode: checkout?.errorCode, orderId: order.id });
      return jsonWithPendingOrder({ ...payload, orderId: order.id, retryable: true }, { status: 502 });
    }

    await admin.from("commerce_payment_attempts").update({
      provider_token: checkout.token,
      payment_page_url: checkout.paymentPageUrl,
      updated_at: new Date().toISOString(),
    }).eq("id", reservedAttempt.id);

    return jsonWithPendingOrder({
      orderId: order.id,
      orderNumber: order.order_number,
      paymentPageUrl: checkout.paymentPageUrl,
      retried: Boolean(body.retryOrderId),
    });
  } catch (error) {
    const payload = publicError("PAYMENT_UNAVAILABLE");
    console.error("commerce checkout error", {
      reference: payload.reference,
      message: error instanceof Error ? error.message : "UNKNOWN",
    });
    return NextResponse.json(payload, { status: 500 });
  }
}
