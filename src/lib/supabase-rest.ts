import type { AdminOrder, Artwork, Auction, AuctionBid, CheckoutInput, OrderItemInput, PromoCode, PromoValidationResult, Review, ReviewInput } from "@/lib/types";

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

function normalizeArtworkInventory(data: Partial<Artwork>): Partial<Artwork> {
  const next: Partial<Artwork> = { ...data };

  if (next.stock !== undefined) {
    const numericStock = Number(next.stock);
    next.stock = Number.isFinite(numericStock) ? Math.max(0, Math.trunc(numericStock)) : 1;
  }

  if (next.status === "sold") {
    next.stock = 0;
  }

  if ((next.status === "available" || next.status === "auction") && Number(next.stock ?? 1) < 1) {
    next.stock = 1;
  }

  return next;
}

export async function createArtwork(data: Partial<Artwork>): Promise<Artwork> {
  const payload = normalizeArtworkInventory(data);
  const [row] = await supabaseFetch<Artwork[]>(
    "artworks",
    { method: "POST", body: JSON.stringify(payload) },
    { serviceRole: true }
  );
  return row;
}

export async function updateArtwork(id: string, data: Partial<Artwork>): Promise<Artwork> {
  const payload = normalizeArtworkInventory(data);
  const [row] = await supabaseFetch<Artwork[]>(
    `artworks?id=eq.${id}`,
    { method: "PATCH", body: JSON.stringify(payload) },
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
}): Promise<{ auction: Auction; bid: AuctionBid; artworkTitle?: string }> {
  const [auction] = await supabaseFetch<Array<Auction & { artworks?: Pick<Artwork, "title" | "status"> }>>(
    `auctions?select=*,artworks(title,status)&id=eq.${encodeURIComponent(input.auctionId)}&limit=1`,
    undefined,
    { serviceRole: true }
  );

  if (!auction) throw new Error("Lelang tidak ditemukan.");
  if (auction.status !== "active") throw new Error("Lelang ini tidak aktif.");
  if (auction.artworks?.status !== "auction") throw new Error("Karya ini tidak sedang dilelang.");
  if (new Date(auction.ends_at).getTime() <= Date.now()) throw new Error("Waktu lelang sudah berakhir.");

  const [highestBid] = await supabaseFetch<AuctionBid[]>(
    `auction_bids?select=*&auction_id=eq.${encodeURIComponent(input.auctionId)}&order=amount.desc,created_at.desc&limit=1`,
    undefined,
    { serviceRole: true }
  );

  if (highestBid?.bidder_id === input.bidderId) {
    throw new Error("Anda masih menjadi penawar tertinggi. Tunggu penawaran berikutnya sebelum menaikkan bid.");
  }

  const currentBid = Math.max(Number(auction.current_bid), Number(highestBid?.amount || 0));
  const minNext = currentBid + Number(auction.min_step);
  if (input.amount < minNext) {
    throw new Error(`Penawaran minimal Rp ${minNext.toLocaleString("id-ID")}.`);
  }

  const [updatedAuction] = await supabaseFetch<Auction[]>(
    `auctions?id=eq.${encodeURIComponent(input.auctionId)}&status=eq.active&current_bid=eq.${encodeURIComponent(String(auction.current_bid))}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        current_bid: input.amount,
        updated_at: new Date().toISOString()
      })
    },
    { serviceRole: true }
  );

  if (!updatedAuction) {
    throw new Error("Ada penawaran baru yang masuk. Muat ulang lelang lalu coba lagi.");
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

  return { auction: updatedAuction, bid, artworkTitle: auction.artworks?.title };
}

export async function getUserOrders(userId: string, email: string): Promise<AdminOrder[]> {
  return supabaseFetch<AdminOrder[]>(
    `orders?select=*,order_items(artwork_id,title,price,quantity)&or=(customer_id.eq.${userId},customer_email.ilike.${encodeURIComponent(email)})&order=created_at.desc`,
    undefined,
    { serviceRole: true }
  );
}

export async function updateOrder(id: string, data: Partial<AdminOrder>): Promise<AdminOrder> {
  const [previous] = await supabaseFetch<AdminOrder[]>(
    `orders?select=*,order_items(artwork_id,title,price,quantity)&id=eq.${id}&limit=1`,
    undefined,
    { serviceRole: true }
  );

  const [row] = await supabaseFetch<AdminOrder[]>(
    `orders?id=eq.${id}`,
    { method: "PATCH", body: JSON.stringify(data) },
    { serviceRole: true }
  );

  if (data.status === "cancelled" && previous && previous.status !== "cancelled") {
    await restoreOrderStock(previous).catch(() => {});
  }

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
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase belum dikonfigurasi. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di environment variables.");
  }

  return supabaseFetch<AdminOrder[]>(
    "orders?select=*,order_items(artwork_id,title,price,quantity)&order=created_at.desc",
    undefined,
    { serviceRole: true }
  );
}

export async function createOrder(input: CheckoutInput) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase belum dikonfigurasi. Pesanan produksi belum bisa disimpan.");
  }

  const verifiedItems = await verifyOrderItems(input.items);
  const subtotal = verifiedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = 0;

  // Validasi & ambil promo code jika ada
  let discountAmount = 0;
  let promoCodeId: string | null = null;
  if (input.promoCode) {
    const promo = await validatePromoCode(input.promoCode, subtotal);
    if (promo.valid && promo.promoCodeId && promo.discountAmount) {
      discountAmount = promo.discountAmount;
      promoCodeId = promo.promoCodeId;
    }
  }

  const total = Math.max(0, subtotal + shippingCost - discountAmount);

  const [order] = await supabaseFetch<AdminOrder[]>(
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
        discount_amount: discountAmount,
        total,
        notes: input.notes || null,
        promo_code_id: promoCodeId
      })
    },
    { serviceRole: true }
  );

  await supabaseFetch(
    "order_items",
    {
      method: "POST",
      body: JSON.stringify(
        verifiedItems.map((item) => ({
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

  // Increment uses pada promo code
  if (promoCodeId) {
    await supabaseFetch(
      `promo_codes?id=eq.${promoCodeId}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ current_uses: { inc: 1 } })
      },
      { serviceRole: true }
    ).catch(() => {
      // Gunakan raw SQL increment jika PATCH biasa tidak support
      supabaseFetch(
        `rpc/increment_promo_uses`,
        { method: "POST", body: JSON.stringify({ code_id: promoCodeId }) },
        { serviceRole: true }
      ).catch(() => {});
    });
  }

  // Kurangi stok artwork yang dipesan
  await Promise.all(
    verifiedItems
      .filter((item) => !String(item.artworkId).startsWith("demo-"))
      .map(async (item) => {
        await supabaseFetch(
          `rpc/decrement_artwork_stock`,
          { method: "POST", body: JSON.stringify({ p_artwork_id: item.artworkId, p_qty: item.quantity }) },
          { serviceRole: true }
        );

        const remainingStock = Math.max(0, item.stockBefore - item.quantity);
        if (remainingStock <= 0) {
          await updateArtwork(item.artworkId, { status: "sold", stock: 0 });
        }
      })
  );

  return order;
}

type VerifiedOrderItem = OrderItemInput & {
  stockBefore: number;
};

async function verifyOrderItems(items: OrderItemInput[]): Promise<VerifiedOrderItem[]> {
  const realItems = items.filter((item) => !String(item.artworkId).startsWith("demo-"));
  if (!realItems.length) {
    return items.map((item) => ({ ...item, stockBefore: item.quantity }));
  }

  const ids = [...new Set(realItems.map((item) => item.artworkId))];
  const artworks = await supabaseFetch<Artwork[]>(
    `artworks?select=*&id=in.(${ids.map(encodeURIComponent).join(",")})`,
    undefined,
    { serviceRole: true }
  );
  const artworkById = new Map(artworks.map((artwork) => [artwork.id, artwork]));

  return items.map((item) => {
    if (String(item.artworkId).startsWith("demo-")) return { ...item, stockBefore: item.quantity };

    const artwork = artworkById.get(item.artworkId);
    if (!artwork) throw new Error(`Karya "${item.title}" tidak ditemukan.`);
    if (artwork.status !== "available") throw new Error(`"${artwork.title}" belum tersedia untuk dibeli.`);
    if (Number(artwork.stock || 0) < item.quantity) {
      throw new Error(`Stok "${artwork.title}" tidak mencukupi atau sudah habis.`);
    }

    return {
      artworkId: artwork.id,
      title: artwork.title,
      price: artwork.price,
      quantity: item.quantity,
      stockBefore: Number(artwork.stock || 0)
    };
  });
}

async function restoreOrderStock(order: AdminOrder): Promise<void> {
  const items = (order.order_items || []).filter((item) => item.artwork_id);
  await Promise.all(
    items.map(async (item) => {
      const [artwork] = await supabaseFetch<Artwork[]>(
        `artworks?select=*&id=eq.${item.artwork_id}&limit=1`,
        undefined,
        { serviceRole: true }
      );
      if (!artwork || !item.artwork_id) return;

      const nextStock = Number(artwork.stock || 0) + Number(item.quantity || 1);
      await updateArtwork(item.artwork_id, {
        stock: nextStock,
        status: artwork.status === "sold" ? "available" : artwork.status
      });
    })
  );
}

// ── REVIEWS ────────────────────────────────────────────────

export async function listReviews(artworkId: string): Promise<Review[]> {
  return supabaseFetch<Review[]>(
    `reviews?artwork_id=eq.${artworkId}&is_approved=eq.true&order=created_at.desc`
  );
}

export async function createReview(input: ReviewInput): Promise<Review> {
  const [row] = await supabaseFetch<Review[]>(
    "reviews",
    {
      method: "POST",
      body: JSON.stringify({
        artwork_id: input.artworkId,
        reviewer_name: input.reviewerName,
        reviewer_email: input.reviewerEmail,
        rating: input.rating,
        comment: input.comment || null,
        is_approved: false
      })
    },
    { serviceRole: true }
  );
  return row;
}

export async function listAdminReviews(): Promise<Review[]> {
  if (!isSupabaseConfigured()) throw new Error("Supabase belum dikonfigurasi.");
  return supabaseFetch<Review[]>(
    "reviews?select=*&order=created_at.desc",
    undefined,
    { serviceRole: true }
  );
}

export async function updateReview(id: string, data: Partial<Review>): Promise<Review> {
  const [row] = await supabaseFetch<Review[]>(
    `reviews?id=eq.${id}`,
    { method: "PATCH", body: JSON.stringify(data) },
    { serviceRole: true }
  );
  return row;
}

export async function deleteReview(id: string): Promise<void> {
  await supabaseFetch<null>(
    `reviews?id=eq.${id}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
    { serviceRole: true }
  );
}

// ── PROMO CODES ────────────────────────────────────────────

export async function validatePromoCode(code: string, subtotal: number): Promise<PromoValidationResult> {
  if (!isSupabaseConfigured()) return { valid: false, message: "Supabase belum dikonfigurasi." };

  try {
    const rows = await supabaseFetch<PromoCode[]>(
      `promo_codes?code=ilike.${encodeURIComponent(code)}&is_active=eq.true&limit=1`,
      undefined,
      { serviceRole: true }
    );

    if (!rows || rows.length === 0) return { valid: false, message: "Kode promo tidak ditemukan atau sudah tidak aktif." };

    const promo = rows[0];
    const now = new Date();

    if (new Date(promo.valid_from) > now) return { valid: false, message: "Kode promo belum aktif." };
    if (promo.valid_until && new Date(promo.valid_until) < now) return { valid: false, message: "Kode promo sudah kadaluarsa." };
    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) return { valid: false, message: "Kode promo sudah mencapai batas penggunaan." };
    if (subtotal < promo.min_purchase) return { valid: false, message: `Minimum pembelian ${promo.min_purchase.toLocaleString("id-ID")} untuk kode ini.` };

    const discountAmount = promo.discount_type === "percentage"
      ? Math.round(subtotal * promo.discount_value / 100)
      : Math.min(Math.round(promo.discount_value), subtotal);

    return {
      valid: true,
      promoCodeId: promo.id,
      discountType: promo.discount_type,
      discountValue: promo.discount_value,
      discountAmount,
      finalTotal: Math.max(0, subtotal - discountAmount),
      message: `Promo berhasil! Hemat Rp ${discountAmount.toLocaleString("id-ID")}`
    };
  } catch {
    return { valid: false, message: "Gagal memvalidasi kode promo." };
  }
}

export async function listPromoCodes(): Promise<PromoCode[]> {
  if (!isSupabaseConfigured()) throw new Error("Supabase belum dikonfigurasi.");
  return supabaseFetch<PromoCode[]>(
    "promo_codes?select=*&order=created_at.desc",
    undefined,
    { serviceRole: true }
  );
}

export async function createPromoCode(data: Partial<PromoCode>): Promise<PromoCode> {
  const [row] = await supabaseFetch<PromoCode[]>(
    "promo_codes",
    { method: "POST", body: JSON.stringify(data) },
    { serviceRole: true }
  );
  return row;
}

export async function updatePromoCode(id: string, data: Partial<PromoCode>): Promise<PromoCode> {
  const [row] = await supabaseFetch<PromoCode[]>(
    `promo_codes?id=eq.${id}`,
    { method: "PATCH", body: JSON.stringify(data) },
    { serviceRole: true }
  );
  return row;
}

export async function deletePromoCode(id: string): Promise<void> {
  await supabaseFetch<null>(
    `promo_codes?id=eq.${id}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
    { serviceRole: true }
  );
}
