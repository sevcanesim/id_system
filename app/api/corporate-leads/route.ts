import { createHmac, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeDistributedRateLimit, requestIp } from "../../../lib/security/rate-limit";
import { getSupabaseAdminClient } from "../../../lib/supabase/server-admin";
import { recordSystemError } from "../../../lib/observability/system-errors";
import { canEncryptCorporateLeads, encryptCorporateLeadPayload } from "../../../lib/security/corporate-lead-crypto";
import { deliverCorporateLeadNotifications } from "../../../lib/operations/corporate-lead-notifications";

export const runtime = "nodejs";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  company: z.string().trim().min(2).max(160),
  employeeCount: z.string().trim().max(32).optional().default("Belirtilmedi"),
  message: z.string().trim().max(1000).optional().default(""),
  plan: z.string().trim().max(80).optional().default("GENEL"),
  website: z.string().max(200).optional().default(""),
});

export async function POST(request: NextRequest) {
  const ip = requestIp(request.headers);
  const limit = await consumeDistributedRateLimit({ key: `corporate-lead:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Çok fazla talep gönderildi. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  }

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Lütfen zorunlu alanları kontrol edin." }, { status: 400 });

    // Silent honeypot success prevents revealing the anti-spam mechanism.
    if (parsed.data.website) return NextResponse.json({ ok: true });

    if (!canEncryptCorporateLeads()) {
      void recordSystemError({
        source: "CORPORATE_LEAD",
        errorCode: "CORPORATE_LEAD_ENCRYPTION_UNCONFIGURED",
        message: "Kurumsal teklif talebi şifreleme anahtarı yapılandırılmamış.",
      });
      return NextResponse.json({ error: "Talep sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin." }, { status: 503 });
    }

    const leadId = randomUUID();
    const encryptedPayload = encryptCorporateLeadPayload(leadId, {
      fullName: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      company: parsed.data.company,
      employeeCount: parsed.data.employeeCount || "Belirtilmedi",
      message: parsed.data.message || "",
    });
    if (!encryptedPayload) {
      return NextResponse.json({ error: "Talep sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin." }, { status: 503 });
    }

    const fingerprintKey = process.env.AUTH_LOG_FINGERPRINT_KEY?.trim();
    const ipFingerprint = ip === "unknown" || !fingerprintKey
      ? null
      : createHmac("sha256", fingerprintKey).update(ip).digest("hex");
    const admin = getSupabaseAdminClient();
    const { error } = await admin.from("corporate_leads").insert({
      id: leadId,
      encrypted_payload: encryptedPayload,
      plan: parsed.data.plan || "GENEL",
      source: "corporate_page",
      ip_hash: ipFingerprint,
    });

    if (error) {
      void recordSystemError({
        source: "CORPORATE_LEAD",
        errorCode: "LEAD_PERSIST_FAILED",
        message: "Kurumsal talep kaydı oluşturulamadı.",
      });
      return NextResponse.json({ error: "Talep kaydedilemedi. Lütfen tekrar deneyin." }, { status: 503 });
    }

    try {
      await deliverCorporateLeadNotifications(admin, 1, Date.now(), leadId);
    } catch {
      void recordSystemError({
        source: "CORPORATE_LEAD",
        errorCode: "LEAD_NOTIFICATION_WORKER_FAILED",
        message: "Kurumsal teklif bildirimi ilk denemede işlenemedi.",
        details: { leadId },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    void recordSystemError({
      source: "CORPORATE_LEAD",
      errorCode: "REQUEST_FAILED",
      message: "Kurumsal talep isteği işlenemedi.",
    });
    return NextResponse.json({ error: "Talep işlenemedi. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
