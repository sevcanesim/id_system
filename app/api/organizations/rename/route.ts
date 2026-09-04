import { NextResponse } from "next/server";

// `organizations.name` now belongs to the immutable legal identity snapshot.
// This route remains to return a safe, explicit response to older clients.
export async function PATCH() {
  return NextResponse.json({
    error: "Şirket unvanı aktivasyon kaydından gelir ve değiştirilemez.",
    code: "ORGANIZATION_LEGAL_PROFILE_LOCKED",
  }, { status: 403 });
}
