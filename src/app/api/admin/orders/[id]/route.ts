import { NextResponse } from "next/server";
import { getAdminToken, verifyAdminToken } from "@/lib/admin-auth";
import { updateOrder } from "@/lib/supabase-rest";
import { notifyOrderUpdated } from "@/lib/notifications";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(getAdminToken(request) || "")) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const { id } = await params;
    const data = await request.json();
    const order = await updateOrder(id, data);
    await notifyOrderUpdated(order).catch((error) => {
      console.warn("Gagal mengirim notifikasi update pesanan:", error);
    });
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal update pesanan." }, { status: 500 });
  }
}
