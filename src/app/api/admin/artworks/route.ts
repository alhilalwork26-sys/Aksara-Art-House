import { NextResponse } from "next/server";
import { getAdminToken, verifyAdminToken } from "@/lib/admin-auth";
import { createArtwork, listAllArtworks } from "@/lib/supabase-rest";

function unauthorized() {
  return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
}

export async function GET(request: Request) {
  if (!verifyAdminToken(getAdminToken(request) || "")) return unauthorized();
  try {
    return NextResponse.json(await listAllArtworks());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!verifyAdminToken(getAdminToken(request) || "")) return unauthorized();
  try {
    const data = await request.json();
    const artwork = await createArtwork(data);
    return NextResponse.json(artwork, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal membuat karya." }, { status: 500 });
  }
}
