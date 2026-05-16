import { NextResponse } from "next/server";
import { getUserAuthToken, getUser } from "@/lib/supabase-auth";

function getAuthConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

export async function PATCH(request: Request) {
  const token = getUserAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: "Sesi tidak ditemukan. Silakan login kembali." }, { status: 401 });
  }

  const currentUser = await getUser(token);
  if (!currentUser) {
    return NextResponse.json({ error: "Sesi tidak valid. Silakan login kembali." }, { status: 401 });
  }

  const config = getAuthConfig();
  if (!config) {
    return NextResponse.json({ error: "Layanan autentikasi belum dikonfigurasi." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { name?: string; wa?: string; password?: string };
    const { name, wa, password } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Nama tidak boleh kosong." }, { status: 400 });
    }
    if (password && password.length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
    }

    // Update user metadata (name, wa) via Supabase Auth REST
    const updateBody: Record<string, unknown> = {
      data: {
        full_name: name.trim(),
        phone: wa?.trim() || null
      }
    };
    if (password) {
      updateBody.password = password;
    }

    const res = await fetch(`${config.url}/auth/v1/user`, {
      method: "PUT",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updateBody),
      cache: "no-store"
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data as { error_description?: string; msg?: string; message?: string })
        .error_description || (data as { msg?: string }).msg || (data as { message?: string }).message || "Gagal memperbarui profil.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json({
      user: {
        id: currentUser.id,
        name: name.trim(),
        email: currentUser.email,
        wa: wa?.trim() || null
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Terjadi kesalahan." },
      { status: 500 }
    );
  }
}
