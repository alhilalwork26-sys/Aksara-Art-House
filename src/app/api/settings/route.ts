import { NextResponse } from "next/server";
import { getAdminToken, verifyAdminToken } from "@/lib/admin-auth";
import { readSiteSetting, writeSiteSetting } from "@/lib/supabase-rest";

const DEFAULT_CONTACT = {
  studioName: "Aksara Art House",
  wa: "6281918344549",
  heroSubtitle: "Koleksi original oil on canvas, acrylic, dan mixed media dari studio Aksara Art House — karya yang lahir dari jiwa, untuk menghiasi ruang Anda.",
  statKarya: "48",
  statPameran: "12",
  statKolektor: "200+",
  statTahun: "7",
  transferInfo: "Transfer ke rekening resmi Aksara Art House. Admin akan mengirim detail rekening melalui WhatsApp setelah pesanan dibuat. Upload bukti transfer agar verifikasi lebih cepat.",
  qrisInfo: "Scan QRIS Aksara Art House, pastikan nama merchant dan nominal sudah sesuai, lalu upload bukti pembayaran.",
  codInfo: "Pembayaran dilakukan saat serah terima. Metode ini hanya berlaku untuk area Surabaya dan tetap menunggu konfirmasi admin.",
  dpInfo: "Bayar DP 50% terlebih dahulu. Admin akan mengirim instruksi DP dan jadwal pelunasan melalui WhatsApp.",
  auctionInfo: "Admin akan mengirim invoice pemenang lelang dan instruksi pembayaran melalui WhatsApp."
};

function normalizeContact(value: Record<string, unknown> | null) {
  return {
    studioName: String(value?.studioName || DEFAULT_CONTACT.studioName),
    wa: String(value?.wa || DEFAULT_CONTACT.wa),
    heroSubtitle: String(value?.heroSubtitle || DEFAULT_CONTACT.heroSubtitle),
    statKarya: String(value?.statKarya || DEFAULT_CONTACT.statKarya),
    statPameran: String(value?.statPameran || DEFAULT_CONTACT.statPameran),
    statKolektor: String(value?.statKolektor || DEFAULT_CONTACT.statKolektor),
    statTahun: String(value?.statTahun || DEFAULT_CONTACT.statTahun),
    transferInfo: String(value?.transferInfo || DEFAULT_CONTACT.transferInfo),
    qrisInfo: String(value?.qrisInfo || DEFAULT_CONTACT.qrisInfo),
    codInfo: String(value?.codInfo || DEFAULT_CONTACT.codInfo),
    dpInfo: String(value?.dpInfo || DEFAULT_CONTACT.dpInfo),
    auctionInfo: String(value?.auctionInfo || DEFAULT_CONTACT.auctionInfo)
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
