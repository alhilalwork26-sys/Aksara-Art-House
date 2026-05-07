import { NextResponse } from "next/server";
import { getUser, getUserAuthToken } from "@/lib/supabase-auth";
import { getUserOrders } from "@/lib/supabase-rest";

export async function GET(request: Request) {
  try {
    const token = getUserAuthToken(request);
    if (!token) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

    const user = await getUser(token);
    if (!user) return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });

    const orders = await getUserOrders(user.id, user.email);
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat pesanan." },
      { status: 500 }
    );
  }
}
