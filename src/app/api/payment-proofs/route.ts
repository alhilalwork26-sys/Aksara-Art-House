import { NextResponse } from "next/server";
import { getUser, getUserAuthToken } from "@/lib/supabase-auth";
import { uploadPaymentProof } from "@/lib/supabase-storage";

export async function POST(request: Request) {
  const token = getUserAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: "Silakan masuk sebelum upload bukti pembayaran." }, { status: 401 });
  }

  const user = await getUser(token).catch(() => null);
  if (!user?.id) {
    return NextResponse.json({ error: "Sesi login tidak valid. Silakan masuk ulang." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File bukti pembayaran wajib diisi." }, { status: 400 });
    }

    const uploaded = await uploadPaymentProof(file);
    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal upload bukti pembayaran." },
      { status: 500 }
    );
  }
}
