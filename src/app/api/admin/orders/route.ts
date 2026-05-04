import { NextResponse } from "next/server";
import { getAdminToken, verifyAdminToken } from "@/lib/admin-auth";
import { listAdminOrders } from "@/lib/supabase-rest";

export async function GET(request: Request) {
  if (!verifyAdminToken(getAdminToken(request) || "")) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    return NextResponse.json(await listAdminOrders());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal." }, { status: 500 });
  }
}
