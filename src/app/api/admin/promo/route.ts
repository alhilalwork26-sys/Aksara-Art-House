import { NextResponse } from "next/server";
import { getAdminToken, verifyAdminToken } from "@/lib/admin-auth";
import { createPromoCode, listPromoCodes } from "@/lib/supabase-rest";
import type { PromoCode } from "@/lib/types";

export async function GET(request: Request) {
  if (!verifyAdminToken(getAdminToken(request) || "")) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    return NextResponse.json(await listPromoCodes());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!verifyAdminToken(getAdminToken(request) || "")) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const body = await request.json() as Partial<PromoCode>;
    if (!body.code || !body.discount_type || !body.discount_value) {
      return NextResponse.json({ error: "code, discount_type, dan discount_value wajib diisi." }, { status: 400 });
    }
    body.code = body.code.trim().toUpperCase();
    const promo = await createPromoCode(body);
    return NextResponse.json(promo);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal membuat promo." }, { status: 500 });
  }
}
