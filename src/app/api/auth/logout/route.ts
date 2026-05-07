import { NextResponse } from "next/server";
import { getUserAuthToken, signOut, USER_AUTH_COOKIE_NAME } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  try {
    const token = getUserAuthToken(request);

    if (token) {
      await signOut(token);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({ name: USER_AUTH_COOKIE_NAME, value: "", path: "/", maxAge: 0 });
    return response;
  } catch {
    // Tetap anggap logout berhasil meski token sudah expired
    const response = NextResponse.json({ ok: true });
    response.cookies.set({ name: USER_AUTH_COOKIE_NAME, value: "", path: "/", maxAge: 0 });
    return response;
  }
}
