import type { PromoCode } from "@/lib/types";

export function validatePromoPayload(input: Partial<PromoCode>): string | null {
  const type = input.discount_type;
  const value = Number(input.discount_value);
  const minPurchase = Number(input.min_purchase ?? 0);
  const maxUses = input.max_uses === null || input.max_uses === undefined ? null : Number(input.max_uses);

  if (type && type !== "percentage" && type !== "fixed") {
    return "Tipe diskon tidak valid.";
  }

  if (input.discount_value !== undefined) {
    if (!Number.isFinite(value) || value <= 0) return "Nilai diskon harus lebih besar dari 0.";
    if (type === "percentage" && value > 100) return "Diskon persentase maksimal 100%.";
  }

  if (input.min_purchase !== undefined && (!Number.isFinite(minPurchase) || minPurchase < 0)) {
    return "Minimum pembelian tidak boleh negatif.";
  }

  if (maxUses !== null && (!Number.isFinite(maxUses) || maxUses < 1)) {
    return "Kuota promo harus minimal 1 atau dikosongkan.";
  }

  if (input.valid_from && input.valid_until) {
    const start = new Date(input.valid_from);
    const end = new Date(input.valid_until);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Tanggal promo tidak valid.";
    if (start > end) return "Tanggal mulai promo tidak boleh setelah tanggal selesai.";
  }

  return null;
}
