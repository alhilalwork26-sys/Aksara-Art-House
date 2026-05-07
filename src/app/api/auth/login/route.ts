import { NextResponse } from "next/server";
import { signIn, USER_AUTH_COOKIE_NAME } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json() as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
    }

    const data = await signIn(email, password);

    const fullName = data.user?.user_metadata?.full_name || data.user?.email?.split("@")[0] || "Kolektor";
    const phone = data.user?.user_metadata?.phone || null;

    const response = NextResponse.json({
      user: {
        id: data.user?.id,
        name: fullName,
        email: data.user?.email,
        wa: phone
      }
    });
    response.cookies.set({
      name: USER_AUTH_COOKIE_NAME,
      value: data.access_token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Number(data.expires_in || 3600)
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login gagal." },
      { status: 401 }
    );
  }
}
