import { NextResponse } from "next/server";
import { getUser, getUserAuthToken } from "@/lib/supabase-auth";
import { placeAuctionBid } from "@/lib/supabase-rest";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getUserAuthToken(request);
    if (!token) {
      return NextResponse.json({ error: "Silakan masuk untuk ikut lelang." }, { status: 401 });
    }

    const user = await getUser(token);
    if (!user?.id) {
      return NextResponse.json({ error: "Sesi login tidak valid. Silakan masuk ulang." }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as { amount?: number };
    const amount = Number(body.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Nominal penawaran tidak valid." }, { status: 400 });
    }

    const fullName = String(user.user_metadata?.full_name || user.email || "Bidder");
    const result = await placeAuctionBid({
      auctionId: id,
      amount,
      bidderId: user.id,
      bidderName: fullName
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan penawaran." },
      { status: 500 }
    );
  }
}
