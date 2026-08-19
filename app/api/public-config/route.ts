import { NextResponse } from "next/server";
import { getDatabaseCatalog, getDatabaseLegalVersions, getDatabaseSeatPacks, getDatabaseTemplateOptions } from "../../../lib/config/database";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (new URL(request.url).searchParams.get("scope") === "corporate") {
      const [seatPacks, templateOptions] = await Promise.all([
        getDatabaseSeatPacks(),
        getDatabaseTemplateOptions(),
      ]);
      return NextResponse.json({ seatPacks, templateOptions }, {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
      });
    }
    const [seatPacks, templateOptions, legalVersions, catalog] = await Promise.all([
      getDatabaseSeatPacks(),
      getDatabaseTemplateOptions(),
      getDatabaseLegalVersions(),
      getDatabaseCatalog(),
    ]);
    return NextResponse.json({ seatPacks, templateOptions, legalVersions, catalog }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ error: "Yönetilebilir uygulama verileri alınamadı." }, { status: 503 });
  }
}
