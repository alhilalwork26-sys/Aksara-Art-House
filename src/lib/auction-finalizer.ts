import { notifyAuctionFinalized } from "@/lib/notifications";
import { finalizeExpiredAuctions } from "@/lib/supabase-rest";

export async function finalizeExpiredAuctionsWithNotifications() {
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

  return results;
}
