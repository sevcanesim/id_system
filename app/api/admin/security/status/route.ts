import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminIdentity } from "../../../../../lib/admin/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const context = await requireSuperAdminIdentity(request);
  if (!context) return NextResponse.json({ error: "Super Admin yetkisi gerekli." }, { status: 403 });

  return NextResponse.json({
    isSuperAdmin: true,
    aal: context.aal,
    mfaRequired: true,
  });
}
