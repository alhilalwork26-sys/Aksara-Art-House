import { NextResponse } from "next/server";
import { getAdminToken, verifyAdminToken } from "@/lib/admin-auth";
import { readSiteSetting, writeSiteSetting } from "@/lib/supabase-rest";

const DEFAULT_CONTACT = {
  studioName: "Aksara Art House",
  wa: "6281234567890"
};

function normalizeContact(value: Record<string, unknown> | null) {
  return {
    studioName: String(value?.studioName || DEFAULT_CONTACT.studioName),
    wa: String(value?.wa || DEFAULT_CONTACT.wa)
  };
}

export async function GET() {
  try {
    const contact = await readSiteSetting<Record<string, unknown>>("contact");
    return NextResponse.json(normalizeContact(contact));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat pengaturan." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!verifyAdminToken(getAdminToken(request) || "")) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const contact = normalizeContact(body);
    await writeSiteSetting("contact", contact);
    return NextResponse.json(contact);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan pengaturan." },
      { status: 500 }
    );
  }
}
