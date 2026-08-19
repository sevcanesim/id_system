import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { consumeDistributedRateLimit, requestIp } from "../../../lib/security/rate-limit";
import { getSupabaseAdminClient } from "../../../lib/supabase/server-admin";
import { sendCorporateLeadEmail } from "../../../lib/email/resend";

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

    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.from("corporate_leads").insert({
      full_name: parsed.data.fullName,
      email: parsed.data.email.toLowerCase(),
      company: parsed.data.company,
      employee_count: parsed.data.employeeCount || "Belirtilmedi",
      message: parsed.data.message || null,
      plan: parsed.data.plan || "GENEL",
      source: "corporate_page",
      ip_hash: ip === "unknown" ? null : createHash("sha256").update(ip).digest("hex"),
    }).select("id").single();

    if (error) {
      console.error("corporate lead insert failed", error);
      return NextResponse.json({ error: "Talep kaydedilemedi. Lütfen tekrar deneyin." }, { status: 503 });
    }

    const emailResult = await sendCorporateLeadEmail({
      id: data.id,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      company: parsed.data.company,
      employeeCount: parsed.data.employeeCount || "Belirtilmedi",
      message: parsed.data.message || "",
      plan: parsed.data.plan || "GENEL",
    });

    return NextResponse.json({ ok: true, notified: emailResult.sent });
  } catch (error) {
    console.error("corporate lead route failed", error);
    return NextResponse.json({ error: "Talep işlenemedi. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
