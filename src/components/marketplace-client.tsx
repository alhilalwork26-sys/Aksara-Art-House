"use client";

import { Heart, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ArtworkVisual } from "@/components/artwork-visual";
import { formatRupiah } from "@/lib/format";
import type { Artwork, CheckoutInput, OrderItemInput } from "@/lib/types";

type CartItem = OrderItemInput;

export function MarketplaceClient({ artworks }: { artworks: Artwork[] }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());

  function toggleWishlist(artworkId: string) {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(artworkId)) {
        next.delete(artworkId);
      } else {
        next.add(artworkId);
      }
      return next;
    });
  }

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  function addToCart(artwork: Artwork) {
    setCart((items) => {
      if (items.some((item) => item.artworkId === artwork.id)) return items;
      return [
        ...items,
        {
          artworkId: artwork.id,
          title: artwork.title,
          price: artwork.price,
          quantity: 1
        }
      ];
    });
    setDrawerOpen(true);
  }

  function updateQty(artworkId: string, direction: 1 | -1) {
    setCart((items) =>
      items
        .map((item) =>
          item.artworkId === artworkId
            ? { ...item, quantity: Math.max(1, item.quantity + direction) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(artworkId: string) {
    setCart((items) => items.filter((item) => item.artworkId !== artworkId));
  }

  async function submitCheckout(formData: FormData) {
    setLoading(true);
    setMessage(null);

    const payload: CheckoutInput = {
      customerName: String(formData.get("customerName") || ""),
      customerEmail: String(formData.get("customerEmail") || ""),
      customerPhone: String(formData.get("customerPhone") || ""),
      shippingAddress: String(formData.get("shippingAddress") || ""),
      shippingCity: String(formData.get("shippingCity") || ""),
      shippingPostalCode: String(formData.get("shippingPostalCode") || ""),
      courier: String(formData.get("courier") || "Konfirmasi manual"),
      paymentMethod: String(formData.get("paymentMethod") || "Transfer bank"),
      notes: String(formData.get("notes") || ""),
      items: cart
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Checkout gagal.");

      setCart([]);
      setCheckoutOpen(false);
      setDrawerOpen(false);
      setMessage(`Pesanan ${result.orderNumber} berhasil dibuat. Tim kami akan menghubungi Anda.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Checkout gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {message ? <div className="section"><div className="notice">{message}</div></div> : null}

      <section className="section" id="catalog">
        <div className="section-head">
          <h2 className="section-title">Koleksi <em>Terkurasi</em></h2>
          <button className="button secondary" onClick={() => setDrawerOpen(true)}>
            <ShoppingBag size={16} /> Keranjang ({cart.length})
          </button>
        </div>

        <div className="grid">
          {artworks.map((artwork) => (
            <article className="art-card" key={artwork.id}>
              <div className="art-visual">
                <ArtworkVisual artwork={artwork} />
              </div>
              <div className="art-body">
                <span className={`chip ${artwork.status}`}>{artwork.status === "auction" ? "Lelang" : artwork.status === "sold" ? "Terjual" : "Tersedia"}</span>
                <div className="art-meta">{artwork.medium} · {artwork.year || "-"} · {artwork.width_cm || "-"} x {artwork.height_cm || "-"} cm</div>
                <h3 className="art-title">{artwork.title}</h3>
                <p className="art-meta">{artwork.description}</p>
                <div className="art-price">{formatRupiah(artwork.price)}</div>
                <div className="toolbar" style={{ marginTop: "auto" }}>
                  <button
                    className="button"
                    disabled={artwork.status === "sold" || artwork.status === "auction"}
                    onClick={() => addToCart(artwork)}
                  >
                    <ShoppingBag size={15} /> {artwork.status === "auction" ? "Lelang" : "Tambah"}
                  </button>
                  <button
                    className={`button ghost${wishlist.has(artwork.id) ? " active" : ""}`}
                    type="button"
                    onClick={() => toggleWishlist(artwork.id)}
                    aria-label={wishlist.has(artwork.id) ? "Hapus dari wishlist" : "Simpan ke wishlist"}
                  >
                    <Heart size={15} fill={wishlist.has(artwork.id) ? "currentColor" : "none"} /> Simpan
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {drawerOpen ? (
        <aside className="cart-drawer" aria-label="Keranjang">
          <div className="cart-inner">
            <div className="cart-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <strong>Keranjang</strong>
              <button className="button ghost" onClick={() => setDrawerOpen(false)} aria-label="Tutup keranjang">
                <X size={16} />
              </button>
            </div>

            <div className="cart-body">
              {cart.length === 0 ? (
                <p className="art-meta">Keranjang masih kosong.</p>
              ) : (
                cart.map((item) => (
                  <div className="cart-item" key={item.artworkId}>
                    <strong>{item.title}</strong>
                    <div className="art-meta">{formatRupiah(item.price)}</div>
                    <div className="toolbar">
                      <button className="button ghost" onClick={() => updateQty(item.artworkId, -1)} aria-label="Kurangi jumlah">
                        <Minus size={14} />
                      </button>
                      <span>{item.quantity}</span>
                      <button className="button ghost" onClick={() => updateQty(item.artworkId, 1)} aria-label="Tambah jumlah">
                        <Plus size={14} />
                      </button>
                      <button className="button ghost" onClick={() => removeItem(item.artworkId)}>
                        Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="cart-foot">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                <span>Total</span>
                <strong>{formatRupiah(total)}</strong>
              </div>
              <button className="button" disabled={!cart.length} onClick={() => setCheckoutOpen(true)} style={{ width: "100%" }}>
                Checkout
              </button>
            </div>
          </div>
        </aside>
      ) : null}

      {checkoutOpen ? (
        <aside className="cart-drawer" aria-label="Checkout">
          <div className="cart-inner">
            <div className="cart-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <strong>Checkout</strong>
              <button className="button ghost" onClick={() => setCheckoutOpen(false)} aria-label="Tutup checkout">
                <X size={16} />
              </button>
            </div>
            <form className="cart-body" action={submitCheckout}>
              <div className="form-grid">
                <label className="field">
                  <span>Nama</span>
                  <input name="customerName" required />
                </label>
                <label className="field">
                  <span>Email</span>
                  <input name="customerEmail" required type="email" />
                </label>
                <label className="field">
                  <span>WhatsApp</span>
                  <input name="customerPhone" required />
                </label>
                <label className="field">
                  <span>Kota</span>
                  <input name="shippingCity" required />
                </label>
                <label className="field">
                  <span>Kode Pos</span>
                  <input name="shippingPostalCode" />
                </label>
                <label className="field">
                  <span>Kurir</span>
                  <select name="courier">
                    <option>Konfirmasi manual</option>
                    <option>JNE / J&T</option>
                    <option>Ekspedisi karya seni</option>
                    <option>Ambil di galeri</option>
                  </select>
                </label>
                <label className="field full">
                  <span>Alamat</span>
                  <textarea name="shippingAddress" required rows={3} />
                </label>
                <label className="field full">
                  <span>Pembayaran</span>
                  <select name="paymentMethod">
                    <option>Transfer bank</option>
                    <option>QRIS manual</option>
                    <option>DP 50%</option>
                  </select>
                </label>
                <label className="field full">
                  <span>Catatan</span>
                  <textarea name="notes" rows={2} />
                </label>
              </div>

              <div className="notice">Total sementara {formatRupiah(total)}. Ongkir dan instruksi pembayaran akan dikonfirmasi admin.</div>
              <button className="button" disabled={loading || !cart.length} type="submit">
                {loading ? "Memproses..." : "Buat Pesanan"}
              </button>
            </form>
          </div>
        </aside>
      ) : null}
    </>
  );
}

