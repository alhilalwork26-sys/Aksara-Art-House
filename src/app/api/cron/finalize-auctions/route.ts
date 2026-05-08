import { NextResponse } from "next/server";
import { finalizeExpiredAuctionsWithNotifications } from "@/lib/auction-finalizer";

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
    const results = await finalizeExpiredAuctionsWithNotifications();

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
