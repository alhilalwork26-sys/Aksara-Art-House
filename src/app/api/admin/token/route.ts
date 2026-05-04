import { NextResponse } from "next/server";
import { createAdminToken, verifyAdminCredentials } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json() as { username?: string; password?: string };

    if (!username || !password) {
      return NextResponse.json({ error: "Username dan password wajib diisi." }, { status: 400 });
    }

    if (!verifyAdminCredentials(username, password)) {
      return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
    }

    return NextResponse.json({ token: createAdminToken() });
  } catch {
    return NextResponse.json({ error: "Login admin gagal." }, { status: 500 });
  }
}
