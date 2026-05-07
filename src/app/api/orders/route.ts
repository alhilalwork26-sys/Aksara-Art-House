import { NextResponse } from "next/server";
import { createOrder } from "@/lib/supabase-rest";
import type { CheckoutInput } from "@/lib/types";

function validateCheckout(input: CheckoutInput) {
  if (!input.customerName || !input.customerEmail || !input.customerPhone) {
    return "Nama, email, dan WhatsApp wajib diisi.";
  }

  if (!input.shippingAddress || !input.shippingCity) {
    return "Alamat dan kota wajib diisi.";
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

    return NextResponse.json({
      id: order.id,
      orderNumber: order.order_number
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat pesanan." },
      { status: 500 }
    );
  }
}
