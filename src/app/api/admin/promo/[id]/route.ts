import { NextResponse } from "next/server";
import { getAdminToken, verifyAdminToken } from "@/lib/admin-auth";
import { deletePromoCode, updatePromoCode } from "@/lib/supabase-rest";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(getAdminToken(request) || "")) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const { id } = await params;
    const data = await request.json();
    const promo = await updatePromoCode(id, data);
    return NextResponse.json(promo);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal update promo." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(getAdminToken(request) || "")) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const { id } = await params;
    await deletePromoCode(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal hapus promo." }, { status: 500 });
  }
}
