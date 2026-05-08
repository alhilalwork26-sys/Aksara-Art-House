import { NextResponse } from "next/server";
import { createReview, listReviews } from "@/lib/supabase-rest";
import type { ReviewInput } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const artworkId = searchParams.get("artworkId");
  if (!artworkId) return NextResponse.json({ error: "artworkId wajib diisi." }, { status: 400 });

  try {
    return NextResponse.json(await listReviews(artworkId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<ReviewInput>;
    const { artworkId, reviewerName, reviewerEmail, rating, comment } = body;

    if (!artworkId || !reviewerName || !reviewerEmail || !rating) {
      return NextResponse.json({ error: "artworkId, nama, email, dan rating wajib diisi." }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating harus antara 1 dan 5." }, { status: 400 });
    }

    const review = await createReview({ artworkId, reviewerName, reviewerEmail, rating, comment });
    return NextResponse.json({ ok: true, id: review.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal menyimpan ulasan." }, { status: 500 });
  }
}
