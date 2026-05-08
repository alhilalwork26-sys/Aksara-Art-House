import { NextResponse } from "next/server";
import { validatePromoCode } from "@/lib/supabase-rest";

export async function POST(request: Request) {
  try {
    const { code, subtotal } = await request.json() as { code?: string; subtotal?: number };
    if (!code) return NextResponse.json({ error: "Kode promo wajib diisi." }, { status: 400 });
    if (typeof subtotal !== "number" || subtotal < 0) {
      return NextResponse.json({ error: "Subtotal tidak valid." }, { status: 400 });
    }

    const result = await validatePromoCode(code.trim().toUpperCase(), subtotal);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memvalidasi promo." }, { status: 500 });
  }
}
