import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase-auth";
import { addToWishlist, getWishlist, removeFromWishlist } from "@/lib/supabase-rest";

async function resolveUser(request: Request) {
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  if (!token) return null;
  return getUser(token);
}

export async function GET(request: Request) {
  try {
    const user = await resolveUser(request);
    if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

    const artworks = await getWishlist(user.id);
    return NextResponse.json(artworks);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat wishlist." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await resolveUser(request);
    if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

    const { artworkId } = await request.json() as { artworkId?: string };
    if (!artworkId) return NextResponse.json({ error: "artworkId wajib diisi." }, { status: 400 });

    await addToWishlist(user.id, artworkId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menambah wishlist." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await resolveUser(request);
    if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const artworkId = searchParams.get("artworkId");
    if (!artworkId) return NextResponse.json({ error: "artworkId wajib diisi." }, { status: 400 });

    await removeFromWishlist(user.id, artworkId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal hapus wishlist." },
      { status: 500 }
    );
  }
}
