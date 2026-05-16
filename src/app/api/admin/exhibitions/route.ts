import { NextResponse } from "next/server";
import { getAdminToken, verifyAdminToken } from "@/lib/admin-auth";
import { supabaseFetch } from "@/lib/supabase-rest";
import type { Exhibition } from "@/app/api/exhibitions/route";

function authGuard(request: Request) {
  return verifyAdminToken(getAdminToken(request) || "");
}

export async function GET(request: Request) {
  if (!authGuard(request)) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const rows = await supabaseFetch<Exhibition[]>(
      `exhibitions?order=date_start.asc&select=*`,
      undefined,
      { serviceRole: true }
    );
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat pameran." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!authGuard(request)) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Partial<Exhibition>;
    const row = await supabaseFetch<Exhibition[]>(
      `exhibitions?select=*`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({
          title: body.title,
          description: body.description || null,
          date_start: body.date_start,
          date_end: body.date_end || null,
          location: body.location || null,
          image_url: body.image_url || null,
          status: body.status || "upcoming",
        }),
      },
      { serviceRole: true }
    );
    return NextResponse.json(row[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat pameran." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!authGuard(request)) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as Partial<Exhibition> & { id: number };
    const { id, created_at, ...rest } = body;
    const row = await supabaseFetch<Exhibition[]>(
      `exhibitions?id=eq.${id}&select=*`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ ...rest, updated_at: new Date().toISOString() }),
      },
      { serviceRole: true }
    );
    void created_at;
    return NextResponse.json(row[0]);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui pameran." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!authGuard(request)) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const { id } = (await request.json()) as { id: number };
    await supabaseFetch(
      `exhibitions?id=eq.${id}`,
      { method: "DELETE" },
      { serviceRole: true }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus pameran." },
      { status: 500 }
    );
  }
}
