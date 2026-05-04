import { NextResponse } from "next/server";
import { getAdminToken, verifyAdminToken } from "@/lib/admin-auth";
import { deleteArtwork, updateArtwork } from "@/lib/supabase-rest";

function unauthorized() {
  return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(getAdminToken(request) || "")) return unauthorized();
  try {
    const { id } = await params;
    const data = await request.json();
    const artwork = await updateArtwork(id, data);
    return NextResponse.json(artwork);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal update karya." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(getAdminToken(request) || "")) return unauthorized();
  try {
    const { id } = await params;
    await deleteArtwork(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal hapus karya." }, { status: 500 });
  }
}
