import { NextResponse } from "next/server";
import { notifyAuctionFinalized } from "@/lib/notifications";
import { finalizeExpiredAuctions } from "@/lib/supabase-rest";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const results = await finalizeExpiredAuctions();
    await Promise.allSettled(
      results
        .filter((result) => result.status === "sold" && result.order && result.amount)
        .map((result) =>
          notifyAuctionFinalized({
            order: result.order!,
            artworkTitle: result.artworkTitle,
            winnerName: result.winnerName,
            winnerEmail: result.winnerEmail,
            amount: result.amount!
          })
        )
    );

    return NextResponse.json({
      ok: true,
      processed: results.length,
      sold: results.filter((result) => result.status === "sold").length,
      noBids: results.filter((result) => result.status === "no_bids").length,
      skipped: results.filter((result) => result.status === "skipped").length,
      results
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal finalisasi lelang." },
      { status: 500 }
    );
  }
}
