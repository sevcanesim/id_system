import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActivePaymentProvider, publicSiteUrl } from "../../../../lib/payments/config";
import { createPaytrMerchantOid, initializePaytrCheckout } from "../../../../lib/payments/paytr";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";
import { canPurchaseCorporateCommerce, isOrganizationRole } from "../../../../lib/organizations/permissions";
import { publicError } from "../../../../lib/errors";
import {
  createCheckoutFingerprint,
  isValidIdempotencyKey,
  normalizeIdempotencyKey,
} from "../../../../lib/payments/idempotency";
import { getDatabaseLegalVersions } from "../../../../lib/config/database";
import { recordSystemError } from "../../../../lib/observability/system-errors";
import { COMMERCIAL_SKUS, digitalServiceBillingAddress, isCorporatePackageSku, isDigitalOnlySku, isPremiumUpgradeSku, requiresPortalAccountSku } from "../../../../lib/config/commercial";
import { corporateCheckoutLive, corporatePackageBySku, isDirectCheckoutBlocked, isNetworkMailCreditPackSku } from "../../../../lib/commerce/packages";
import { parseCompanyBilling } from "../../../../lib/validation/company";
import { decideOpenPaymentAttempt } from "../../../../lib/payments/reuse-open-attempt";
import { applyPendingOrderCookie } from "../../../../lib/payments/pending-order-cookie";
import { stampPhysicalProductionConfig } from "../../../../lib/commerce/production-config";
import { findExistingCheckoutAttempt } from "../../../../lib/payments/checkout-idempotency-lookup";
import { rejectCheckoutInitializeFlood } from "../../../../lib/security/route-rate-limits";
import { checkoutResumeSessionExpiry } from "../../../../lib/commerce/checkout-resume";

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

type CorporateBillingProfile = {
  organizationId: string;
  name: string;
  taxNumber: string;
  taxOffice: string;
  addressLine: string;
  city: string;
  district: string;
  postalCode: string;
  email: string;
  phone: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function corporateBillingProfile(organizationId: string, organization: Record<string, unknown>): CorporateBillingProfile | null {
  const name = text(organization.legal_name) || text(organization.name);
  const taxNumber = text(organization.tax_number).replace(/\D/g, "");
  const addressLine = text(organization.billing_address) || text(organization.legal_address);
  const city = text(organization.billing_city) || text(organization.city);
  const district = text(organization.billing_district) || text(organization.district);
  if (!name || !taxNumber || !addressLine || !city || !district) return null;
  return {
    organizationId,
    name,
    taxNumber,
    taxOffice: text(organization.tax_office),
    addressLine,
    city,
    district,
    postalCode: text(organization.billing_postal_code),
    email: text(organization.billing_email),
    phone: text(organization.billing_phone),
  };
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
  updated_at?: string | null;
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
  const requestId = request.headers.get("x-request-id");
  let observabilityUserId: string | null = null;
  try {
    const flooded = await rejectCheckoutInitializeFlood(request);
    if (flooded) return flooded;
    const paymentProvider = getActivePaymentProvider();
    if (!paymentProvider) return NextResponse.json(publicError("PAYMENT_UNAVAILABLE"), { status: 503 });

    const idempotencyKey = normalizeIdempotencyKey(request.headers.get("x-idempotency-key"));
    if (!isValidIdempotencyKey(idempotencyKey)) {
      return NextResponse.json(publicError("VALIDATION_ERROR", { message: "Ödeme güvenlik anahtarı geçersiz. Sayfayı yenileyip yeniden dene." }), { status: 400 });
    }

    const legalVersions = await getDatabaseLegalVersions();
    const parsed = checkoutSchema(legalVersions).safeParse(await request.json());
    if (!parsed.success) {
      const payload = publicError("VALIDATION_ERROR");
      return NextResponse.json(payload, { status: 400 });
    }

    const body = parsed.data;
    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    let authenticatedUserId: string | null = null;
    let normalizedEmail = body.customer.email.toLowerCase();

    if (bearer) {
      const auth = getSupabaseAuthClient();
      const { data: authData } = await auth.auth.getUser(bearer);
      if (authData.user?.id && authData.user.email) {
        authenticatedUserId = authData.user.id;
        observabilityUserId = authData.user.id;
        normalizedEmail = authData.user.email.toLowerCase();
        if (body.customer.email.toLowerCase() !== normalizedEmail) {
          return NextResponse.json({ error: "Sipariş e-postası giriş yaptığın hesapla eşleşmelidir." }, { status: 403 });
        }
      }
    }

    const admin = getSupabaseAdminClient();
    const slugs = [...new Set(body.items.map((item) => item.productSlug))];
    const { data: products, error: productError } = await admin
      .from("products")
      .select("id,slug,name,kind,is_active,product_variants(id,sku,name,price_kurus,billing_period,is_active,metadata)")
      .in("slug", slugs)
      .eq("is_active", true);

    if (productError || !products) return NextResponse.json(publicError("ORDER_CREATE_FAILED"), { status: 500 });

    const unavailableItem = body.items.find((item) => {
      const product = products.find((row) => row.slug === item.productSlug);
      const variants = (product?.product_variants || []) as ProductVariant[];
      return !product || !variants.some((row) => row.is_active && row.sku === item.variantSku);
    });
    if (unavailableItem) {
      return NextResponse.json(publicError("PRODUCT_UNAVAILABLE"), { status: 409 });
    }

    const calculated: CalculatedItem[] = body.items.map((item) => {
      const product = products.find((row) => row.slug === item.productSlug)!;
      const variants = (product.product_variants || []) as ProductVariant[];
      const variant = variants.find((row) => row.is_active && row.sku === item.variantSku)!;
      return {
        product: { id: product.id, slug: product.slug, name: product.name, kind: product.kind },
        variant,
        quantity: item.quantity,
        unitPriceKurus: Number(variant.price_kurus),
        lineTotalKurus: Number(variant.price_kurus) * item.quantity,
        configuration: item.configuration,
      };
    });

    if (!authenticatedUserId && calculated.some((item) => requiresPortalAccountSku(item.variant.sku))) {
      return NextResponse.json({
        code: "ACCOUNT_REQUIRED",
        error: "Bu paket portal erişimi içerir. Ödeme öncesinde giriş yapmalı veya hesap oluşturmalısın.",
      }, { status: 401 });
    }

    for (const item of calculated) {
      const metadata = (item.variant.metadata as Record<string, unknown> | null) || {};
      if (isDirectCheckoutBlocked(metadata)) {
        return NextResponse.json({ error: "Bu ürün henüz doğrudan satın alınamaz." }, { status: 409 });
      }
    }

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
      if (!authenticatedUserId || !membership || !isOrganizationRole(membership.role) || !canPurchaseCorporateCommerce(membership.role, membership.status)) {
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
    const networkMailItems = calculated.filter((item) => isNetworkMailCreditPackSku(item.variant.sku));
    if (networkMailItems.length && networkMailItems.length !== calculated.length) {
      return NextResponse.json({ error: "Network Mail kredi paketleri ayrı bir siparişte alınır." }, { status: 400 });
    }
    let organizationBilling: CorporateBillingProfile | null = null;
    if (networkMailItems.length) {
      const organizationIds = networkMailItems.map((item) => item.configuration?.organizationId);
      const organizationCreditPurchase = organizationIds.some((value) => value != null);

      if (organizationCreditPurchase) {
        if (organizationIds.some((value) => typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value))) {
          return NextResponse.json({ error: "Network Mail paketi için geçerli bir şirket seçilmedi." }, { status: 400 });
        }
        const uniqueOrganizationIds = [...new Set(organizationIds as string[])];
        if (uniqueOrganizationIds.length !== 1) {
          return NextResponse.json({ error: "Bir Network Mail siparişi yalnız bir şirket bakiyesine eklenebilir." }, { status: 400 });
        }
        const organizationId = uniqueOrganizationIds[0];
        const { data: membership } = await admin
          .from("organization_members")
          .select("role,status")
          .eq("organization_id", organizationId)
          .eq("user_id", authenticatedUserId)
          .maybeSingle();
        if (!authenticatedUserId || !membership || !isOrganizationRole(membership.role) || !canPurchaseCorporateCommerce(membership.role, membership.status)) {
          return NextResponse.json({ error: "Şirket Network Mail kredisi satın alma yetkisi yalnız Şirket Sahibindedir." }, { status: 403 });
        }
        const { data: activeSubscription } = await admin
          .from("organization_subscriptions")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("status", "ACTIVE")
          .limit(1)
          .maybeSingle();
        if (!activeSubscription) {
          return NextResponse.json({ error: "Şirket Network Mail kredisi yalnız aktif kurumsal aboneliklerde kullanılabilir." }, { status: 409 });
        }
        const { data: organization, error: organizationError } = await admin
          .from("organizations")
          .select("id,name,legal_name,tax_number,tax_office,billing_address,billing_city,billing_district,billing_postal_code,billing_email,billing_phone,legal_address,city,district")
          .eq("id", organizationId)
          .maybeSingle();
        if (organizationError || !organization) {
          return NextResponse.json({ error: "Şirketin fatura profili doğrulanamadı. Lütfen kısa süre sonra yeniden dene." }, { status: 409 });
        }
        organizationBilling = corporateBillingProfile(organizationId, organization as Record<string, unknown>);
        if (!organizationBilling) {
          return NextResponse.json({ error: "Şirketin kayıtlı fatura profili eksik. Şirket Sahibi, resmî unvan ve fatura adresini tamamlamalıdır." }, { status: 409 });
        }
        for (const item of networkMailItems) {
          item.configuration = { ...(item.configuration || {}), organizationId, creditScope: "ORGANIZATION" };
        }
      } else {
        const nowIso = new Date().toISOString();
        const [{ data: premiumEntitlement }, { data: premiumGrant }] = await Promise.all([
          admin
            .from("entitlements")
            .select("id,expires_at,grace_ends_at")
            .eq("user_id", authenticatedUserId)
            .eq("package_code", "INDIVIDUAL_PREMIUM")
            .eq("status", "ACTIVE")
            .order("expires_at", { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle(),
          admin
            .from("admin_access_grants")
            .select("id,starts_at,expires_at")
            .eq("user_id", authenticatedUserId)
            .eq("scope", "INDIVIDUAL")
            .eq("package_code", "INDIVIDUAL_PREMIUM")
            .eq("status", "ACTIVE")
            .order("expires_at", { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle(),
        ]);
        const premiumIsActive = premiumEntitlement
          && (!premiumEntitlement.expires_at || premiumEntitlement.expires_at > nowIso || (premiumEntitlement.grace_ends_at && premiumEntitlement.grace_ends_at > nowIso));
        const premiumGrantIsActive = premiumGrant
          && premiumGrant.starts_at <= nowIso
          && (!premiumGrant.expires_at || premiumGrant.expires_at > nowIso);
        if (!premiumIsActive && !premiumGrantIsActive) return NextResponse.json({ error: "Network Mail paketi yalnız aktif Premium hesaplara açıktır. Önce Premium’a yükselt." }, { status: 403 });
        for (const item of networkMailItems) {
          item.configuration = { ...(item.configuration || {}), creditScope: "INDIVIDUAL" };
        }
      }
    }
    const digitalOnlyCart = calculated.length > 0 && calculated.every((item) => isDigitalOnlySku(item.variant.sku));
    const shippingSource = organizationBilling
      ? {
          ...body.shipping,
          recipientName: body.customer.name,
          phone: organizationBilling.phone || body.customer.phone,
          addressLine: organizationBilling.addressLine,
          district: organizationBilling.district,
          city: organizationBilling.city,
          postalCode: organizationBilling.postalCode || null,
        }
      : body.shipping;
    const shipping = {
      ...shippingSource,
      addressLine: digitalOnlyCart
        ? digitalServiceBillingAddress(shippingSource.city, shippingSource.addressLine)
        : shippingSource.addressLine.trim(),
      latitude: digitalOnlyCart ? null : shippingSource.latitude ?? null,
      longitude: digitalOnlyCart ? null : shippingSource.longitude ?? null,
      deliveryNote: digitalOnlyCart ? null : shippingSource.deliveryNote || null,
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
    const company = companyBilling?.ok
      ? companyBilling.company
      : organizationBilling
        ? { name: organizationBilling.name, taxNumber: organizationBilling.taxNumber, taxOffice: organizationBilling.taxOffice }
        : null;

    const subtotalKurus = calculated.reduce((sum, item) => sum + item.lineTotalKurus, 0);
    const shippingKurus = 0;
    const totalKurus = subtotalKurus + shippingKurus;
    const fingerprint = createCheckoutFingerprint({
      items: body.items,
      email: normalizedEmail,
      totalKurus,
      customer: {
        name: body.customer.name,
        phone: body.customer.phone,
      },
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
        void recordSystemError({
          source: "COMMERCE_CHECKOUT",
          errorCode: "ORDER_CREATE_FAILED",
          message: "Checkout could not create a commerce order.",
          requestId,
          userId: observabilityUserId,
          details: { reference: payload.reference, databaseCode: orderError?.code ?? null },
        });
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

      const { error: billingProfileError } = await admin.from("commerce_order_billing_profiles").insert({
        order_id: order.id,
        billing_type: organizationBilling ? "CORPORATE" : "INDIVIDUAL",
        organization_id: organizationBilling?.organizationId || null,
        legal_name: organizationBilling?.name || body.customer.name.trim(),
        tax_number: organizationBilling?.taxNumber || null,
        tax_office: organizationBilling?.taxOffice || null,
        contact_name: body.customer.name.trim(),
        email: organizationBilling?.email || normalizedEmail,
        phone: organizationBilling?.phone || body.customer.phone,
        address_line: shipping.addressLine,
        district: shipping.district,
        city: shipping.city,
        postal_code: shipping.postalCode || null,
        country_code: "TR",
      });
      if (billingProfileError) {
        await admin.from("commerce_orders").delete().eq("id", order.id);
        void recordSystemError({
          source: "COMMERCE_CHECKOUT",
          errorCode: "BILLING_PROFILE_SNAPSHOT_FAILED",
          message: "Checkout could not persist its billing snapshot.",
          requestId,
          userId: observabilityUserId,
          details: { databaseCode: billingProfileError.code ?? null },
        });
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

    const resumeExpiresAt = checkoutResumeSessionExpiry();
    const { error: resumeSessionError } = await admin.from("commerce_checkout_sessions").upsert({
      order_id: order.id,
      expires_at: resumeExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
      draft_payload: {
        items: calculated.map((item) => ({
          productId: item.product.slug,
          variantSku: item.variant.sku,
          kind: item.product.kind,
          name: item.product.name,
          unitPriceKurus: item.unitPriceKurus,
          quantity: item.quantity,
          configuration: item.configuration || {},
        })),
        form: {
          recipientName: body.customer.name.trim(),
          email: normalizedEmail,
          phone: body.customer.phone,
          addressLine: shipping.addressLine,
          district: shipping.district,
          city: shipping.city,
          postalCode: shipping.postalCode || "",
          deliveryNote: shipping.deliveryNote || "",
          latitude: shipping.latitude,
          longitude: shipping.longitude,
          companyName: company?.name || "",
          companyTaxNumber: company?.taxNumber || "",
          companyTaxOffice: company?.taxOffice || "",
        },
      },
    }, { onConflict: "order_id" });
    if (resumeSessionError) {
      void recordSystemError({
        source: "COMMERCE_CHECKOUT",
        errorCode: "CHECKOUT_RESUME_SNAPSHOT_FAILED",
        message: "Checkout continuation data could not be persisted.",
        requestId,
        userId: observabilityUserId,
        details: { databaseCode: resumeSessionError.code ?? null },
      });
    }

    const { data: openAttempt } = await admin
      .from("commerce_payment_attempts")
      .select("id,order_id,status,request_fingerprint,payment_page_url,updated_at")
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
    const paytrMerchantOid = createPaytrMerchantOid();
    const { data: reservedAttempt, error: reserveError } = await admin
      .from("commerce_payment_attempts")
      .insert({
        order_id: order.id,
        status: "PENDING",
        amount_kurus: totalKurus,
        currency: "TRY",
        conversation_id: conversationId,
        provider: paymentProvider,
        provider_token: paytrMerchantOid,
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
      void recordSystemError({
        source: "COMMERCE_CHECKOUT",
        errorCode: "PAYMENT_ATTEMPT_RESERVATION_FAILED",
        message: "A PayTR payment attempt could not be reserved.",
        requestId,
        userId: observabilityUserId,
        details: { reference: payload.reference, databaseCode: reserveError?.code ?? null },
      });
      return NextResponse.json(payload, { status: 409 });
    }

    const userIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")?.trim()
      || "127.0.0.1";
    const paytrCheckout = await initializePaytrCheckout({
      merchantOid: paytrMerchantOid,
      userIp,
      email: normalizedEmail,
      userName: body.customer.name,
      userAddress: company
        ? `${company.name}, ${shipping.addressLine}, ${shipping.district}, ${shipping.city}`
        : `${shipping.addressLine}, ${shipping.district}, ${shipping.city}`,
      userPhone: body.customer.phone,
      amountKurus: totalKurus,
      basketItems: calculated.map((item) => ({
        name: item.product.name,
        unitPriceKurus: item.unitPriceKurus,
        quantity: item.quantity,
      })),
      merchantOkUrl: `${publicSiteUrl}/odeme/basarili?order=${encodeURIComponent(order.id)}`,
      merchantFailUrl: `${publicSiteUrl}/odeme/basarisiz?order=${encodeURIComponent(order.id)}`,
    });

    if (!paytrCheckout.ok) {
      await admin.from("commerce_payment_attempts").update({
        status: "FAILED",
        error_code: paytrCheckout.errorCode,
        error_message: paytrCheckout.errorMessage,
        updated_at: new Date().toISOString(),
      }).eq("id", reservedAttempt.id);
      const payload = publicError("PAYMENT_UNAVAILABLE");
      void recordSystemError({
        source: "COMMERCE_CHECKOUT",
        errorCode: paytrCheckout.errorCode || "PAYTR_INITIALIZATION_FAILED",
        message: "PayTR hosted payment initialization was rejected.",
        requestId,
        userId: observabilityUserId,
        details: { reference: payload.reference, orderId: order.id },
      });
      return jsonWithPendingOrder({ ...payload, orderId: order.id, retryable: true }, { status: 502 });
    }

    const paymentPageUrl = `${publicSiteUrl}/odeme/paytr?token=${encodeURIComponent(paytrCheckout.token)}`;
    await admin.from("commerce_payment_attempts").update({
      payment_page_url: paymentPageUrl,
      updated_at: new Date().toISOString(),
    }).eq("id", reservedAttempt.id);

    return jsonWithPendingOrder({
      orderId: order.id,
      orderNumber: order.order_number,
      paymentPageUrl,
      retried: Boolean(body.retryOrderId),
    });
  } catch {
    const payload = publicError("PAYMENT_UNAVAILABLE");
    void recordSystemError({
      source: "COMMERCE_CHECKOUT",
      errorCode: "COMMERCE_CHECKOUT_UNHANDLED",
      message: "The checkout request could not be completed.",
      requestId,
      userId: observabilityUserId,
      details: { reference: payload.reference },
    });
    return NextResponse.json(payload, { status: 500 });
  }
}
