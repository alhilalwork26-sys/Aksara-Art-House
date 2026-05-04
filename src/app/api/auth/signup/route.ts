import { NextResponse } from "next/server";
import { signUp } from "@/lib/supabase-auth";

export async function POST(request: Request) {
  try {
    const { email, password, fullName, phone } = await request.json() as {
      email?: string;
      password?: string;
      fullName?: string;
      phone?: string;
    };

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Nama, email, dan password wajib diisi." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
    }

    const data = await signUp(email, password, fullName, phone);

    const accessToken = data.access_token || null;
    // Supabase mengembalikan {access_token, user} jika email confirm dimatikan,
    // atau langsung user object jika email confirm aktif (tidak ada access_token)
    const userData = data.user ?? data;

    return NextResponse.json({
      accessToken,
      user: {
        id: userData.id || null,
        name: fullName,
        email: userData.email || email,
        wa: phone || null
      },
      needsEmailConfirmation: !accessToken
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pendaftaran gagal." },
      { status: 400 }
    );
  }
}
