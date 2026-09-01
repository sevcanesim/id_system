/**
 * Yenomi ID commercial package architecture (source of truth).
 *
 * Product ladder: Digital identity (QR+NFC) → networking CRM → engagement
 * (meetings/presentations) → Network Mail follow-up → company intelligence.
 *
 * Network Mail is 1 credit = 1 recipient (personal follow-up), never bulk
 * campaign send. Campaign Mail is a separate, later-stage ledger.
 */

export const NETWORK_MAIL_PER_SEAT_ANNUAL = 100;
export const INDIVIDUAL_PREMIUM_NETWORK_MAIL = 100;
export const NETWORK_MAIL_DAILY_SEND_CAP = 150;
export const PHYSICAL_CARD_VALUE_KURUS = 40_000;

export const INDIVIDUAL_DIGITAL_PLAN = { code: "INDIVIDUAL_DIGITAL", name: "Dijital", priceKurus: 79_900, durationMonths: 12, nfcCards: 0, networkMailCredits: 0, popular: false } as const;
export const INDIVIDUAL_PLAN = { code: "INDIVIDUAL", name: "NFC", priceKurus: 149_000, durationMonths: 12, nfcCards: 1, networkMailCredits: 0, popular: false } as const;
export const ADDITIONAL_CARD_PLAN = { code: "ADDITIONAL_CARD", name: "Yedek Kart", priceKurus: 39_900, nfcCards: 1, networkMailCredits: 0 } as const;
export const INDIVIDUAL_PREMIUM_PLAN = { code: "INDIVIDUAL_PREMIUM", name: "Premium", priceKurus: 249_000, durationMonths: 12, nfcCards: 1, networkMailCredits: INDIVIDUAL_PREMIUM_NETWORK_MAIL, popular: true } as const;
export const INDIVIDUAL_RENEWAL_PLAN = { code: "INDIVIDUAL_RENEWAL", name: "Bireysel NFC yenileme", priceKurus: INDIVIDUAL_PLAN.priceKurus - PHYSICAL_CARD_VALUE_KURUS, durationMonths: 12, nfcCards: 0, networkMailCredits: 0 } as const;
export const INDIVIDUAL_PREMIUM_RENEWAL_PLAN = { code: "INDIVIDUAL_PREMIUM_RENEWAL", name: "Bireysel Premium yenileme", priceKurus: INDIVIDUAL_PREMIUM_PLAN.priceKurus - PHYSICAL_CARD_VALUE_KURUS, durationMonths: 12, nfcCards: 0, networkMailCredits: INDIVIDUAL_PREMIUM_NETWORK_MAIL } as const;
export const INDIVIDUAL_PREMIUM_UPGRADE_PLAN = { code: "INDIVIDUAL_PREMIUM_UPGRADE", name: "Premium yükseltme", priceKurus: INDIVIDUAL_PREMIUM_PLAN.priceKurus - INDIVIDUAL_PLAN.priceKurus, nfcCards: 0, networkMailCredits: INDIVIDUAL_PREMIUM_NETWORK_MAIL } as const;

export const CORPORATE_PACKAGE_LADDER = [
  { code: "CORP-2", name: "Kurumsal 2", seats: 2, priceKurus: 549_000 },
  { code: "CORP-3", name: "Kurumsal 3", seats: 3, priceKurus: 749_000 },
  { code: "CORP-5", name: "Kurumsal 5", seats: 5, priceKurus: 1_199_000 },
  { code: "CORP-10", name: "Kurumsal 10", seats: 10, priceKurus: 2_190_000, popular: true },
  { code: "CORP-25", name: "Kurumsal 25", seats: 25, priceKurus: 4_990_000 },
  { code: "CORP-50", name: "Kurumsal 50", seats: 50, priceKurus: 8_990_000 },
  { code: "CORP-100", name: "Kurumsal 100", seats: 100, priceKurus: 15_990_000 },
] as const;

export function corporateRenewalPriceKurus(priceKurus: number, seats: number): number {
  if (!Number.isInteger(seats) || seats < 1) throw new RangeError("seats must be an integer ≥ 1");
  return Math.max(0, priceKurus - seats * PHYSICAL_CARD_VALUE_KURUS);
}

export const RETIRED_CORPORATE_PACKAGE_CODES = ["CORP-4", "CORP-20", "CORP-75"] as const;
export type CorporatePackageCode = (typeof CORPORATE_PACKAGE_LADDER)[number]["code"];
export const CORPORATE_CHECKOUT_MAX_SEATS = 100;
export const CORPORATE_PACKAGE_PRODUCT_SLUG = "yenomi-business";
export function corporatePackageSku(code: string): string { return `YENOMI-${resolveCorporatePlanCode(code)}`; }
export function corporatePackageBySku(sku: string | null | undefined) { if (!sku?.startsWith("YENOMI-")) return null; return corporatePackageByCode(sku.slice("YENOMI-".length)); }
export function isCorporatePackageSku(sku: string | null | undefined): boolean { return corporatePackageBySku(sku) != null; }
export function corporateCheckoutLive(seats: number): boolean { return Number.isInteger(seats) && seats >= 1 && seats <= CORPORATE_CHECKOUT_MAX_SEATS; }
export const LEGACY_CORPORATE_PLAN_ALIASES = { STARTER: "CORP-10", GROWTH: "CORP-25", BUSINESS: "CORP-50" } as const;

export const NETWORK_MAIL_CREDIT_PACKS = [
  { sku: "YENOMI-NETWORK-MAIL-100", credits: 100, priceKurus: 14_900, liveCheckout: false },
  { sku: "YENOMI-NETWORK-MAIL-500", credits: 500, priceKurus: 49_900, liveCheckout: false },
  { sku: "YENOMI-NETWORK-MAIL-1000", credits: 1_000, priceKurus: 79_900, liveCheckout: false },
  { sku: "YENOMI-NETWORK-MAIL-5000", credits: 5_000, priceKurus: 299_000, liveCheckout: false },
] as const;
export const CAMPAIGN_MAIL_PACKS = [
  { sku: "YENOMI-CAMPAIGN-MAIL-1000", credits: 1_000, priceKurus: 24_900 }, { sku: "YENOMI-CAMPAIGN-MAIL-5000", credits: 5_000, priceKurus: 89_900 }, { sku: "YENOMI-CAMPAIGN-MAIL-10000", credits: 10_000, priceKurus: 149_000 }, { sku: "YENOMI-CAMPAIGN-MAIL-25000", credits: 25_000, priceKurus: 299_000 }, { sku: "YENOMI-CAMPAIGN-MAIL-50000", credits: 50_000, priceKurus: 499_000 }, { sku: "YENOMI-CAMPAIGN-MAIL-100000", credits: 100_000, priceKurus: 849_000 },
] as const;
export const CAMPAIGN_MAIL_STAGE = "COMING_SOON" as const;
export const BUSINESS_SEAT_PACKS = [
  { sku: "YENOMI-BUSINESS-SEATS-1", seats: 1, priceKurus: 279_000, name: "Ek 1 Kullanıcı + Kart" }, { sku: "YENOMI-BUSINESS-SEATS-5", seats: 5, priceKurus: 1_099_000, name: "Ek 5 Kullanıcı + Kart" }, { sku: "YENOMI-BUSINESS-SEATS-10", seats: 10, priceKurus: 1_999_000, name: "Ek 10 Kullanıcı + Kart" },
] as const;
export function isSeatPackSku(sku: string | null | undefined): boolean { if (!sku) return false; return BUSINESS_SEAT_PACKS.some((pack) => pack.sku === sku) || sku.startsWith("YENOMI-BUSINESS-SEATS-"); }
export const ADMIN_PROVISION_PLAN_CODES = ["DEMO-2","DEMO-5","DEMO-10","STARTER","GROWTH","BUSINESS","ENTERPRISE","CORP-2","CORP-3","CORP-4","CORP-5","CORP-10","CORP-20","CORP-25","CORP-50","CORP-75","CORP-100"] as const;
export type AdminProvisionPlanCode = (typeof ADMIN_PROVISION_PLAN_CODES)[number];
export const INDIVIDUAL_PREMIUM_CHECKOUT = { live: true, reason: null } as const;
export const NETWORK_MAIL_PACK_CHECKOUT = { live: false, reason: "CREDIT_PACK_FULFILLMENT_NOT_LIVE" } as const;
const BLOCKED_CHECKOUT_FULFILLMENT_KINDS = new Set(["NETWORK_MAIL_CREDIT_PACK", "CAMPAIGN_MAIL_CREDIT_PACK"]);
export function isDirectCheckoutBlocked(metadata: Record<string, unknown> | null | undefined): boolean { const kind = metadata?.fulfillment_kind; if (typeof kind === "string" && BLOCKED_CHECKOUT_FULFILLMENT_KINDS.has(kind)) return true; if (metadata?.live_checkout === false) return true; if (metadata?.stage === "COMING_SOON") return true; return false; }
export function networkMailGrant(seatCount: number): number { if (!Number.isInteger(seatCount) || seatCount < 1) throw new RangeError("seatCount must be an integer ≥ 1"); return seatCount * NETWORK_MAIL_PER_SEAT_ANNUAL; }
export function perSeatKurus(priceKurus: number, seats: number): number { if (!Number.isInteger(seats) || seats < 1) throw new RangeError("seats must be an integer ≥ 1"); return Math.round(priceKurus / seats); }
export function corporatePackageByCode(code: string) { return CORPORATE_PACKAGE_LADDER.find((row) => row.code === code) ?? null; }
export function corporatePackageBySeats(seats: number) { return CORPORATE_PACKAGE_LADDER.find((row) => row.seats === seats) ?? null; }
export function resolveCorporatePlanCode(code: string): string { if (code in LEGACY_CORPORATE_PLAN_ALIASES) return LEGACY_CORPORATE_PLAN_ALIASES[code as keyof typeof LEGACY_CORPORATE_PLAN_ALIASES]; return code; }
export function upgradeDeltaKurus(fromSeats: number, toSeats: number): number | null { const from = corporatePackageBySeats(fromSeats); const to = corporatePackageBySeats(toSeats); if (!from || !to || to.seats <= from.seats) return null; return to.priceKurus - from.priceKurus; }
export type MailLedgerKind = "NETWORK" | "CAMPAIGN";
export function debitNetworkMail(input: { remaining: number; recipientCount: number; kind: MailLedgerKind; }): { ok: true; remaining: number; debit: number } | { ok: false; reason: string } { if (input.kind === "CAMPAIGN") return { ok: false, reason: "CAMPAIGN_LEDGER_NOT_LIVE" }; if (!Number.isInteger(input.recipientCount) || input.recipientCount < 1) return { ok: false, reason: "INVALID_RECIPIENT_COUNT" }; if (!Number.isInteger(input.remaining) || input.remaining < 0) return { ok: false, reason: "INVALID_REMAINING" }; if (input.remaining < input.recipientCount) return { ok: false, reason: "INSUFFICIENT_NETWORK_MAIL" }; return { ok: true, debit: input.recipientCount, remaining: input.remaining - input.recipientCount }; }
export function rolloverNetworkMail(input: { unused: number; newGrant: number; renewed: boolean; }): { remaining: number; expired: number } { const unused = Math.max(0, Math.trunc(input.unused)); const newGrant = Math.max(0, Math.trunc(input.newGrant)); if (input.renewed) return { remaining: unused + newGrant, expired: 0 }; return { remaining: 0, expired: unused }; }
export type IndividualNetworkMailMode = "GRANT" | "ROLLOVER" | "EXPIRE";
export function applyIndividualNetworkMail(input: { remaining: number; limit: number; mode: IndividualNetworkMailMode; grant: number; }): { remaining: number; limit: number; expired: number } { const remaining = Math.max(0, Math.trunc(input.remaining)); const grant = Math.max(0, Math.trunc(input.grant)); if (input.mode === "EXPIRE") return { remaining: 0, limit: 0, expired: remaining }; if (input.mode === "ROLLOVER") { const rolled = rolloverNetworkMail({ unused: remaining, newGrant: grant, renewed: true }); return { remaining: rolled.remaining, limit: grant, expired: 0 }; } const nextRemaining = remaining + grant; return { remaining: nextRemaining, limit: Math.max(Math.max(0, Math.trunc(input.limit)), nextRemaining), expired: 0 }; }
export function isIndividualPremiumPackage(packageCode?: string | null): boolean { return packageCode === INDIVIDUAL_PREMIUM_PLAN.code; }
export type IndividualSubscriptionOfferId = "BASIC_RENEWAL" | "PREMIUM_RENEWAL" | "PREMIUM_UPGRADE";
export function individualSubscriptionOffers(input: { signedIn: boolean; hasEntitlement: boolean; isPremium: boolean; }): IndividualSubscriptionOfferId[] { if (!input.signedIn || !input.hasEntitlement) return []; if (input.isPremium) return ["PREMIUM_RENEWAL"]; return ["BASIC_RENEWAL", "PREMIUM_UPGRADE"]; }
export const NETWORK_MAIL_SENDER_POLICY = { from: "PLATFORM" as const, replyTo: "VERIFIED_ACTOR_EMAIL" as const, requireEmailConfirmed: true, customDomainLive: false, reason: "CUSTOM_SENDING_DOMAIN_NOT_LIVE" } as const;
export function assertVerifiedNetworkMailSender(input: { email?: string | null; emailConfirmedAt?: string | Date | null; customFromDomain?: string | null; }): { ok: true; replyTo: string } | { ok: false; reason: string } { if (input.customFromDomain?.trim()) return { ok: false, reason: NETWORK_MAIL_SENDER_POLICY.reason }; const email = input.email?.trim().toLowerCase() ?? ""; if (!email || !email.includes("@")) return { ok: false, reason: "SENDER_EMAIL_MISSING" }; if (!input.emailConfirmedAt) return { ok: false, reason: "SENDER_EMAIL_UNVERIFIED" }; return { ok: true, replyTo: email }; }
export function assertNetworkDailyCap(sentToday: number, additional: number): boolean { return sentToday + additional <= NETWORK_MAIL_DAILY_SEND_CAP; }
export function defaultMailCreditLimit(seatCount: number, override?: number | null): number { if (override != null) { if (!Number.isInteger(override) || override < 0) throw new RangeError("mailCreditLimit override must be an integer ≥ 0"); return override; } return networkMailGrant(seatCount); }
export function recommendCorporatePack(employeeCount: number): { code: string; seats: number | null; priceKurus: number | null; } { if (!Number.isInteger(employeeCount) || employeeCount < 1) throw new RangeError("employeeCount must be an integer ≥ 1"); const pack = CORPORATE_PACKAGE_LADDER.find((row) => row.seats >= employeeCount); if (pack) return { code: pack.code, seats: pack.seats, priceKurus: pack.priceKurus }; return { code: "ENTERPRISE", seats: null, priceKurus: null }; }
export function prorateUpgradeKurus(input: { fromSeats: number; toSeats: number; daysRemaining: number; termDays: number; }): number | null { const delta = upgradeDeltaKurus(input.fromSeats, input.toSeats); if (delta == null || input.termDays <= 0) return null; const days = Math.max(0, Math.min(input.termDays, input.daysRemaining)); return Math.round(delta * (days / input.termDays)); }
export function seatDecreasePolicy(input: { currentSeats: number; requestedSeats: number; }): { allowedNow: boolean; refundKurus: number; applyAtRenewal: boolean; reason: string } { if (input.requestedSeats >= input.currentSeats) return { allowedNow: true, refundKurus: 0, applyAtRenewal: false, reason: "NO_DECREASE" }; return { allowedNow: false, refundKurus: 0, applyAtRenewal: true, reason: "MID_TERM_DECREASE_NOT_REFUNDED" }; }
export const INDIVIDUAL_DIGITAL_FEATURES = ["1 dijital kartvizit","QR paylaşımı","Kişisel mini profil","İletişim bilgileri","Sosyal medya bağlantıları","WhatsApp / telefon / e-posta aksiyonları","Temel görüntülenme istatistikleri","1 yıl platform üyeliği dahil"] as const;
export const INDIVIDUAL_DIGITAL_CATALOG_POINTS = ["Canlı dijital kartvizit","QR ile paylaş","Temel görüntülenme","Tek seferlik ödeme","1 yıl platform üyeliği dahil"] as const;
export const INDIVIDUAL_FEATURES = ["1 dijital kartvizit","1 NFC kart","QR kart","Kişisel mini profil","İletişim bilgileri","Sosyal medya bağlantıları","WhatsApp / telefon / e-posta aksiyonları","QR paylaşımı","NFC paylaşımı","Temel görüntülenme istatistikleri","1 yıl platform üyeliği dahil","Ücretsiz kargo"] as const;
export const INDIVIDUAL_CATALOG_POINTS = ["1 NFC + QR kart","Canlı dijital profil","Temel görüntülenme","Tek seferlik ödeme, 1 yıl dahil","Türkiye içi kargo dahil"] as const;
export const INDIVIDUAL_PREMIUM_FEATURES = ["NFC paketteki her şey","Toplantı oluşturma","Sunum ekleme ve paylaşımı","Gelişmiş istatistikler","Contact / bağlantı yönetimi","100 Network Mail kredisi","Hazır follow-up senaryoları","Kişiye özel follow-up","Etkinlik / fuar networking","1 NFC kart","1 yıl platform üyeliği dahil","Ücretsiz kargo"] as const;
export const INDIVIDUAL_PREMIUM_CATALOG_POINTS = ["NFC paketteki her şey","100 Network Mail","Toplantı ve sunum","Gelişmiş profil ve kişi yönetimi","Tek seferlik ödeme, 1 yıl dahil"] as const;
export const ADDITIONAL_CARD_FEATURES = ["1 NFC + QR kart","Mevcut profile bağlanır","Yeni yıllık hizmet başlatmaz","Yeni dijital kimlik açmaz","Türkiye içi kargo dahil"] as const;
export const CORPORATE_SHARED_FEATURES = ["Şirket profili","Çalışan dijital kartvizitleri","NFC kartlar (kişi sayısı kadar)","QR kartlar","Şirket yönetim paneli","Kullanıcı yönetimi","Admin yetkilendirme","HR yetkilendirme","Departman yönetimi","Toplantı oluşturma","Sunum ekleme / paylaşma","Contact / lead yönetimi","Network Mail (kişi başı 100 / yıl)","Çalışan bazlı istatistikler","Şirket bazlı istatistikler","Networking / lead takibi","1 yıllık kullanım","Ücretsiz kargo"] as const;
export const NETWORK_MAIL_POSITIONING = { name: "Network Mail Kredisi", promise: "Tanıştığınız kişilere doğrudan kartınız üzerinden profesyonel takip maili gönderin.", unit: "1 kredi = 1 alıcı", notBulk: "Toplu pazarlama (Campaign Mail) bu krediden düşmez." } as const;
export const FOLLOW_UP_SCENARIOS = [{ code: "EVENT_MET", label: "Tanıştığımıza memnun oldum" },{ code: "OFFER", label: "Teklifimizi iletiyorum" },{ code: "AFTER_MEETING", label: "Toplantı sonrası takip" },{ code: "PRESENTATION", label: "Sunumu iletiyorum" },{ code: "EVENT_THANKS", label: "Etkinlik sonrası teşekkür" },{ code: "PRODUCT_INFO", label: "Ürün bilgisi gönder" },{ code: "CUSTOM", label: "Özel mesaj" }] as const;
