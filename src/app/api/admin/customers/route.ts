import { NextResponse } from "next/server";
import { getAdminToken, verifyAdminToken } from "@/lib/admin-auth";

function getConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, serviceKey };
}

export async function GET(request: Request) {
  if (!verifyAdminToken(getAdminToken(request) || "")) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  const { url, serviceKey } = getConfig();
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase service role belum dikonfigurasi." }, { status: 503 });
  }

  try {
    // Ambil semua user dari Supabase Auth Admin API
    const usersRes = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      },
      cache: "no-store"
    });

    if (!usersRes.ok) {
      throw new Error("Gagal mengambil data user dari Supabase.");
    }

    const usersData = await usersRes.json() as { users?: Array<{
      id: string;
      email: string;
      created_at: string;
      user_metadata?: { full_name?: string; phone?: string };
    }> };

    const users = usersData.users || [];

    // Ambil semua orders untuk hitung total per user
    const ordersRes = await fetch(
      `${url}/rest/v1/orders?select=user_id,total,status&status=neq.cancelled`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json"
        },
        cache: "no-store"
      }
    );

    const orders = ordersRes.ok
      ? (await ordersRes.json() as Array<{ user_id: string; total: number; status: string }>)
      : [];

    // Hitung per user
    const orderMap = new Map<string, { count: number; total: number }>();
    for (const o of orders) {
      if (!o.user_id) continue;
      const existing = orderMap.get(o.user_id) || { count: 0, total: 0 };
      orderMap.set(o.user_id, { count: existing.count + 1, total: existing.total + Number(o.total || 0) });
    }

    const customers = users
      .filter(u => !u.email?.endsWith("@admin.local")) // Exclude admin accounts
      .map(u => ({
        id: u.id,
        name: u.user_metadata?.full_name || u.email?.split("@")[0] || "Kolektor",
        email: u.email || "",
        wa: u.user_metadata?.phone || "",
        joined: u.created_at,
        order_count: orderMap.get(u.id)?.count || 0,
        total_spent: orderMap.get(u.id)?.total || 0
      }))
      .sort((a, b) => new Date(b.joined).getTime() - new Date(a.joined).getTime());

    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat data kolektor." },
      { status: 500 }
    );
  }
}
