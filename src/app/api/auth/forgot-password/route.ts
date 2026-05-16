import { NextResponse } from "next/server";

function getAuthConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Alamat email tidak valid." }, { status: 400 });
    }

    const config = getAuthConfig();
    if (!config) {
      return NextResponse.json({ error: "Layanan autentikasi belum dikonfigurasi." }, { status: 503 });
    }

    const redirectTo =
      process.env.APP_URL
        ? `${process.env.APP_URL}/marketplace.html`
        : "https://aksara-steel.vercel.app/marketplace.html";

    const res = await fetch(`${config.url}/auth/v1/recover`, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, gotrue_meta_security: {}, redirect_to: redirectTo }),
      cache: "no-store"
    });

    // Supabase selalu return 200 untuk endpoint recover (tidak mengekspos apakah email terdaftar)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = (data as { error_description?: string; msg?: string }).error_description
        || (data as { msg?: string }).msg
        || "Gagal mengirim email reset.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Terjadi kesalahan." },
      { status: 500 }
    );
  }
}
