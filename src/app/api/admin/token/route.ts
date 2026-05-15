import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, createAdminToken, getAdminToken, verifyAdminCredentials, verifyAdminToken } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const token = getAdminToken(request);
  if (!token || !verifyAdminToken(token)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    username: process.env.ADMIN_USERNAME || "Admin"
  });
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json() as { username?: string; password?: string };

    if (!username || !password) {
      return NextResponse.json({ error: "Username dan password wajib diisi." }, { status: 400 });
    }

    if (!verifyAdminCredentials(username, password)) {
      return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true, username });
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: createAdminToken(),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 24 * 60 * 60
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Login admin gagal." }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}
