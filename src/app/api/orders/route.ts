import { NextResponse } from "next/server";
import { createOrder } from "@/lib/supabase-rest";
import { notifyOrderCreated } from "@/lib/notifications";
import type { CheckoutInput } from "@/lib/types";

function validateCheckout(input: CheckoutInput) {
  if (!input.customerName || !input.customerEmail || !input.customerPhone) {
    return "Nama, email, dan WhatsApp wajib diisi.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customerEmail)) {
    return "Format email belum valid.";
  }

  if (input.customerPhone.replace(/\D/g, "").length < 9) {
    return "Nomor WhatsApp belum valid.";
  }

  if (!input.shippingAddress || !input.shippingCity) {
    return "Alamat dan kota wajib diisi.";
  }

  if (!input.courier || !input.paymentMethod) {
    return "Metode pengiriman dan pembayaran wajib dipilih.";
  }

  const allowedPayments = new Set(["transfer", "qris", "cod", "dp", "auction_invoice"]);
  if (!allowedPayments.has(input.paymentMethod)) {
    return "Metode pembayaran tidak valid.";
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return "Keranjang masih kosong.";
  }

  if (input.items.some((item) => !item.artworkId || !item.title || item.price < 0 || item.quantity < 1)) {
    return "Item pesanan tidak valid.";
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as CheckoutInput;
    const validationError = validateCheckout(input);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const order = await createOrder(input);
    await notifyOrderCreated(order, input).catch((error) => {
      console.warn("Gagal mengirim notifikasi pesanan:", error);
    });

    return NextResponse.json({
      id: order.id,
      orderNumber: order.order_number,
      subtotal: order.subtotal,
      discountAmount: order.discount_amount,
      total: order.total
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat pesanan.";
    const isValidationError = /stok|tidak ditemukan|belum tersedia|tidak mencukupi/i.test(message);
    return NextResponse.json(
      { error: message },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
