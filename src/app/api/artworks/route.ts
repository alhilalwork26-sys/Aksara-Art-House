import { NextResponse } from "next/server";
import { listArtworks } from "@/lib/supabase-rest";

export async function GET() {
  try {
    const artworks = await listArtworks();
    return NextResponse.json(artworks);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat karya." },
      { status: 500 }
    );
  }
}
