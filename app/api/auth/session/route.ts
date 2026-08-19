import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

const COOKIE_NAME = "yenomi-access-token";
const schema = z.object({
  accessToken: z.string().min(20).max(4000).nullable(),
  expiresAt: z.number().int().positive().nullable().optional(),
});

function clearCookie(response: NextResponse) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return clearCookie(NextResponse.json({ error: "Oturum bilgisi geçersiz." }, { status: 400 }));
    }

    if (!parsed.data.accessToken) {
      return clearCookie(NextResponse.json({ ok: true }));
    }

    const auth = getSupabaseAuthClient();
    const { data, error } = await auth.auth.getUser(parsed.data.accessToken);
    if (error || !data.user) {
      return clearCookie(NextResponse.json({ error: "Oturum doğrulanamadı." }, { status: 401 }));
    }

    const maxAge = parsed.data.expiresAt
      ? Math.max(60, parsed.data.expiresAt - Math.floor(Date.now() / 1000))
      : 3600;
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: COOKIE_NAME,
      value: encodeURIComponent(parsed.data.accessToken),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    return response;
  } catch (error) {
    console.error("auth session cookie error", error instanceof Error ? error.message : "UNKNOWN");
    return clearCookie(NextResponse.json({ error: "Oturum kaydedilemedi." }, { status: 500 }));
  }
}
