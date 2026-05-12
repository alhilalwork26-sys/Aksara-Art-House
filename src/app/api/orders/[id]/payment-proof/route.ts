import { NextResponse } from "next/server";
import { notifyOrderUpdated } from "@/lib/notifications";
import { getUser, getUserAuthToken } from "@/lib/supabase-auth";
import { appendOrderNote, getUserOrderById, updateOrder } from "@/lib/supabase-rest";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function cleanText(value: unknown, max = 500) {
  return String(value || "").trim().slice(0, max);
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const token = getUserAuthToken(request);
    if (!token) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

    const user = await getUser(token);
    if (!user) return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });

    const { id } = await context.params;
    const order = await getUserOrderById(id, user.id, user.email);
    if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    if (order.status === "cancelled" || order.status === "done") {
      return NextResponse.json({ error: "Pesanan ini sudah tidak bisa diubah." }, { status: 400 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const proofUrl = cleanText(body.proofUrl, 1000);
    const note = cleanText(body.note, 700);
    if (!proofUrl || !/^https?:\/\//i.test(proofUrl)) {
      return NextResponse.json({ error: "URL bukti pembayaran tidak valid." }, { status: 400 });
    }

    const history = [
      `Riwayat pembayaran: ${new Date().toISOString()} - User mengupload bukti pembayaran.`,
      `Bukti pembayaran: ${proofUrl}`,
      note ? `Catatan pembayaran: ${note}` : ""
    ].filter(Boolean).join("\n");

    const updated = await updateOrder(order.id, {
      payment_status: "waiting_confirmation",
      status: order.status === "pending" ? "pending" : order.status,
      notes: appendOrderNote(order.notes, history)
    });

    await notifyOrderUpdated(updated).catch((error) => {
      console.warn("Gagal mengirim notifikasi upload bukti:", error);
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan bukti pembayaran." },
      { status: 500 }
    );
  }
}
