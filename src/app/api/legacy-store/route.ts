import { NextResponse } from "next/server";
import { getAdminToken, verifyAdminToken } from "@/lib/admin-auth";
import { deleteLegacyValue, isSupabaseConfigured, readLegacyStore, writeLegacyValue } from "@/lib/supabase-rest";

const allowedKeys = new Set([
  "aksara-paintings",
  "aksara-auctions",
  "aksara-orders",
  "aksara-cart",
  "aksara-wishlist",
  "aksara-user",
  "murni-admin-settings"
]);

function isAllowedKey(key: string) {
  return allowedKeys.has(key);
}

function isAdmin(request: Request) {
  return verifyAdminToken(getAdminToken(request) || "");
}

export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    return NextResponse.json({
      configured: isSupabaseConfigured(),
      values: await readLegacyStore()
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: isSupabaseConfigured(),
        error: error instanceof Error ? error.message : "Gagal membaca database.",
        values: {}
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { key?: string; value?: string };
    const key = String(body.key || "");

    if (!isAllowedKey(key)) {
      return NextResponse.json({ error: "Key tidak diizinkan." }, { status: 400 });
    }

    await writeLegacyValue(key, String(body.value ?? ""));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan data." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get("key") || "";

    if (!isAllowedKey(key)) {
      return NextResponse.json({ error: "Key tidak diizinkan." }, { status: 400 });
    }

    await deleteLegacyValue(key);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus data." },
      { status: 500 }
    );
  }
}
