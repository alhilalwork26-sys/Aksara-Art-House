import { NextResponse } from "next/server";
import { signIn } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json() as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });
    }

    const data = await signIn(email, password);

    const fullName = data.user?.user_metadata?.full_name || data.user?.email?.split("@")[0] || "Kolektor";
    const phone = data.user?.user_metadata?.phone || null;

    return NextResponse.json({
      accessToken: data.access_token,
      user: {
        id: data.user?.id,
        name: fullName,
        email: data.user?.email,
        wa: phone
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login gagal." },
      { status: 401 }
    );
  }
}
