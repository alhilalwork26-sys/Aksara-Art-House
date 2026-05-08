import { NextResponse } from "next/server";
import { getAdminToken, verifyAdminToken } from "@/lib/admin-auth";
import { finalizeAuctionWithNotifications } from "@/lib/auction-finalizer";
import { updateAuction } from "@/lib/supabase-rest";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(getAdminToken(request) || "")) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const { id } = await params;
    const data = await request.json();
    const auction = await updateAuction(id, data);
    return NextResponse.json(auction);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal update lelang." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!verifyAdminToken(getAdminToken(request) || "")) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as { action?: string };
    if (body.action !== "finalize") {
      return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
    }
    const result = await finalizeAuctionWithNotifications(id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal finalisasi lelang." }, { status: 500 });
  }
}
