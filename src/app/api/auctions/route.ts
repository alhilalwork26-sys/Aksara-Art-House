import { NextResponse } from "next/server";
import { finalizeExpiredAuctionsWithNotifications } from "@/lib/auction-finalizer";
import { listAuctions } from "@/lib/supabase-rest";

export async function GET() {
  try {
    await finalizeExpiredAuctionsWithNotifications();
    const auctions = await listAuctions();
    return NextResponse.json(auctions);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat lelang." },
      { status: 500 }
    );
  }
}
