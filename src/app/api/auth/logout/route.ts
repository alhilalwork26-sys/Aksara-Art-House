import { NextResponse } from "next/server";
import { signOut } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (token) {
      await signOut(token);
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Tetap anggap logout berhasil meski token sudah expired
    return NextResponse.json({ ok: true });
  }
}
