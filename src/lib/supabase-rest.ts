import type { AdminOrder, Artwork, Auction, AuctionBid, CheckoutInput } from "@/lib/types";

type SupabaseConfig = {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
};

function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;
  return {
    url: url.replace(/\/$/, ""),
    anonKey,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
}

export async function supabaseFetch<T>(path: string, init?: RequestInit, options?: { serviceRole?: boolean }): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_ANON_KEY.");
  }

  const token = options?.serviceRole ? config.serviceRoleKey : config.anonKey;
  if (!token) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY belum diisi untuk operasi server.");
  }

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: token,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request gagal (${response.status}): ${detail}`);
  }

  if (response.status === 204) return null as T;

  const text = await response.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseConfig());
}

export async function readLegacyStore(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured()) return {};

  const rows = await supabaseFetch<Array<{ key: string; value: { value?: string } }>>(
    `site_settings?select=key,value&key=like.${encodeURIComponent("legacy:%")}`,
    undefined,
    { serviceRole: true }
  );

  return rows.reduce<Record<string, string>>((acc, row) => {
    acc[row.key.replace(/^legacy:/, "")] = String(row.value?.value ?? "");
    return acc;
  }, {});
}

export async function writeLegacyValue(key: string, value: string) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase belum dikonfigurasi.");
  }

  await supabaseFetch(
    "site_settings?on_conflict=key",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({
        key: `legacy:${key}`,
        value: { value },
        updated_at: new Date().toISOString()
      })
    },
    { serviceRole: true }
  );
}

export async function deleteLegacyValue(key: string) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase belum dikonfigurasi.");
  }

  await supabaseFetch(
    `site_settings?key=eq.${encodeURIComponent(`legacy:${key}`)}`,
    {
      method: "DELETE",
      headers: {
        Prefer: "return=minimal"
      }
    },
    { serviceRole: true }
  );
}

export async function readSiteSetting<T extends Record<string, unknown>>(key: string): Promise<T | null> {
  const rows = await supabaseFetch<Array<{ value: T }>>(
    `site_settings?select=value&key=eq.${encodeURIComponent(key)}&limit=1`
  );
  return rows[0]?.value ?? null;
}

export async function writeSiteSetting(key: string, value: Record<string, unknown>) {
  await supabaseFetch(
    "site_settings?on_conflict=key",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({
        key,
        value,
        updated_at: new Date().toISOString()
      })
    },
    { serviceRole: true }
  );
}

export async function listArtworks(): Promise<Artwork[]> {
  return supabaseFetch<Artwork[]>(
    "artworks?select=*&status=in.(available,auction,sold)&order=is_featured.desc,created_at.desc"
  );
}

export async function listAllArtworks(): Promise<Artwork[]> {
  return supabaseFetch<Artwork[]>(
    "artworks?select=*&order=is_featured.desc,created_at.desc",
    undefined,
    { serviceRole: true }
  );
}

export async function createArtwork(data: Partial<Artwork>): Promise<Artwork> {
  const [row] = await supabaseFetch<Artwork[]>(
    "artworks",
    { method: "POST", body: JSON.stringify(data) },
    { serviceRole: true }
  );
  return row;
}

export async function updateArtwork(id: string, data: Partial<Artwork>): Promise<Artwork> {
  const [row] = await supabaseFetch<Artwork[]>(
    `artworks?id=eq.${id}`,
    { method: "PATCH", body: JSON.stringify(data) },
    { serviceRole: true }
  );
  return row;
}

export async function syncAuctionForArtwork(artwork: Artwork): Promise<void> {
  if (artwork.status === "auction") {
    const existing = await supabaseFetch<Auction[]>(
      `auctions?select=*&artwork_id=eq.${artwork.id}&limit=1`,
      undefined,
      { serviceRole: true }
    );

    if (existing[0]) {
      if (existing[0].status !== "active") {
        await updateAuction(existing[0].id, { status: "active", updated_at: new Date().toISOString() });
      }
      return;
    }

    const minStep = Math.max(100000, Math.round((artwork.price || 0) * 0.05));
    const startBid = Math.max(0, (artwork.price || 0) - minStep);

    await supabaseFetch(
      "auctions",
      {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          artwork_id: artwork.id,
          status: "active",
          start_bid: startBid,
          current_bid: Math.max(startBid, startBid),
          min_step: minStep,
          starts_at: new Date().toISOString(),
          ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
      },
      { serviceRole: true }
    );
    return;
  }

  await supabaseFetch(
    `auctions?artwork_id=eq.${artwork.id}&status=in.(scheduled,active)`,
    {
      method: "PATCH",
      headers: {
        Prefer: "return=minimal"
      },
      body: JSON.stringify({
        status: "ended",
        updated_at: new Date().toISOString()
      })
    },
    { serviceRole: true }
  );
}

export async function ensureAuctionRecords(): Promise<void> {
  const auctionArtworks = await supabaseFetch<Artwork[]>(
    "artworks?select=*&status=eq.auction",
    undefined,
    { serviceRole: true }
  );

  await Promise.all(auctionArtworks.map((artwork) => syncAuctionForArtwork(artwork)));
}

export async function deleteArtwork(id: string): Promise<void> {
  await supabaseFetch<null>(
    `artworks?id=eq.${id}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
    { serviceRole: true }
  );
}

export async function listAuctions(): Promise<(Auction & { artworks: Artwork; auction_bids?: AuctionBid[] })[]> {
  await ensureAuctionRecords();
  return supabaseFetch<(Auction & { artworks: Artwork; auction_bids?: AuctionBid[] })[]>(
    "auctions?select=*,artworks(*),auction_bids(*)&status=in.(scheduled,active,ended)&order=ends_at.asc&auction_bids.order=amount.desc",
  );
}

export async function listAdminAuctions(): Promise<(Auction & { artworks: Artwork; auction_bids?: AuctionBid[] })[]> {
  await ensureAuctionRecords();
  return supabaseFetch<(Auction & { artworks: Artwork; auction_bids?: AuctionBid[] })[]>(
    "auctions?select=*,artworks(*),auction_bids(*)&order=created_at.desc&auction_bids.order=amount.desc",
    undefined,
    { serviceRole: true }
  );
}

export async function createAuction(data: Partial<Auction>): Promise<Auction> {
  const [row] = await supabaseFetch<Auction[]>(
    "auctions",
    { method: "POST", body: JSON.stringify(data) },
    { serviceRole: true }
  );
  return row;
}

export async function updateAuction(id: string, data: Partial<Auction>): Promise<Auction> {
  const [row] = await supabaseFetch<Auction[]>(
    `auctions?id=eq.${id}`,
    { method: "PATCH", body: JSON.stringify(data) },
    { serviceRole: true }
  );
  return row;
}

export async function placeAuctionBid(input: {
  auctionId: string;
  amount: number;
  bidderId: string;
  bidderName: string;
}): Promise<{ auction: Auction; bid: AuctionBid }> {
  const [auction] = await supabaseFetch<Auction[]>(
    `auctions?select=*&id=eq.${encodeURIComponent(input.auctionId)}&limit=1`,
    undefined,
    { serviceRole: true }
  );

  if (!auction) throw new Error("Lelang tidak ditemukan.");
  if (auction.status !== "active") throw new Error("Lelang ini tidak aktif.");
  if (new Date(auction.ends_at).getTime() <= Date.now()) throw new Error("Waktu lelang sudah berakhir.");

  const minNext = Number(auction.current_bid) + Number(auction.min_step);
  if (input.amount < minNext) {
    throw new Error(`Penawaran minimal Rp ${minNext.toLocaleString("id-ID")}.`);
  }

  const [bid] = await supabaseFetch<AuctionBid[]>(
    "auction_bids",
    {
      method: "POST",
      body: JSON.stringify({
        auction_id: input.auctionId,
        bidder_id: input.bidderId,
        bidder_name: input.bidderName,
        amount: input.amount
      })
    },
    { serviceRole: true }
  );

  const updatedAuction = await updateAuction(input.auctionId, {
    current_bid: input.amount,
    updated_at: new Date().toISOString()
  });

  return { auction: updatedAuction, bid };
}

export async function getUserOrders(userId: string, email: string): Promise<AdminOrder[]> {
  return supabaseFetch<AdminOrder[]>(
    `orders?select=*,order_items(title,price,quantity)&or=(customer_id.eq.${userId},customer_email.ilike.${encodeURIComponent(email)})&order=created_at.desc`,
    undefined,
    { serviceRole: true }
  );
}

export async function updateOrder(id: string, data: Partial<AdminOrder>): Promise<AdminOrder> {
  const [row] = await supabaseFetch<AdminOrder[]>(
    `orders?id=eq.${id}`,
    { method: "PATCH", body: JSON.stringify(data) },
    { serviceRole: true }
  );
  return row;
}

export async function getWishlist(userId: string): Promise<Artwork[]> {
  const rows = await supabaseFetch<Array<{ artworks: Artwork }>>(
    `wishlists?select=artworks(*)&user_id=eq.${userId}`,
    undefined,
    { serviceRole: true }
  );
  return rows.map((r) => r.artworks);
}

export async function addToWishlist(userId: string, artworkId: string): Promise<void> {
  await supabaseFetch(
    "wishlists?on_conflict=user_id,artwork_id",
    {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: userId, artwork_id: artworkId })
    },
    { serviceRole: true }
  );
}

export async function removeFromWishlist(userId: string, artworkId: string): Promise<void> {
  await supabaseFetch(
    `wishlists?user_id=eq.${userId}&artwork_id=eq.${artworkId}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
    { serviceRole: true }
  );
}

export async function listAdminOrders(): Promise<AdminOrder[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    return await supabaseFetch<AdminOrder[]>(
      "orders?select=*,order_items(title,price,quantity)&order=created_at.desc",
      undefined,
      { serviceRole: true }
    );
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function createOrder(input: CheckoutInput) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase belum dikonfigurasi. Pesanan produksi belum bisa disimpan.");
  }

  const subtotal = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = 0;

  const [order] = await supabaseFetch<Array<{ id: string; order_number: string }>>(
    "orders",
    {
      method: "POST",
      body: JSON.stringify({
        customer_name: input.customerName,
        customer_email: input.customerEmail,
        customer_phone: input.customerPhone,
        shipping_address: input.shippingAddress,
        shipping_city: input.shippingCity,
        shipping_postal_code: input.shippingPostalCode,
        courier: input.courier,
        payment_method: input.paymentMethod,
        payment_status: "waiting_confirmation",
        status: "pending",
        subtotal,
        shipping_cost: shippingCost,
        total: subtotal + shippingCost,
        notes: input.notes || null
      })
    },
    { serviceRole: true }
  );

  await supabaseFetch(
    "order_items",
    {
      method: "POST",
      body: JSON.stringify(
        input.items.map((item) => ({
          order_id: order.id,
          artwork_id: String(item.artworkId).startsWith("demo-") ? null : item.artworkId,
          title: item.title,
          price: item.price,
          quantity: item.quantity
        }))
      )
    },
    { serviceRole: true }
  );

  return order;
}
