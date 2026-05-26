import type { Artwork } from "@/lib/types";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || "https://aksaraarthouse.com").replace(/\/$/, "");

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

export function artworkSlug(artwork: Pick<Artwork, "id" | "title">) {
  return `${slugify(artwork.title || "karya")}-${artwork.id}`;
}

export function artworkUrl(artwork: Pick<Artwork, "id" | "title">) {
  return `${SITE_URL}/karya/${artworkSlug(artwork)}`;
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

export function artworkStatusLabel(status: Artwork["status"]) {
  if (status === "available") return "Tersedia";
  if (status === "auction") return "Lelang";
  if (status === "sold") return "Terjual";
  return "Tidak tersedia";
}

export function artworkDescription(artwork: Artwork) {
  const details = [
    artwork.medium,
    artwork.year ? String(artwork.year) : "",
    artwork.width_cm && artwork.height_cm ? `${artwork.width_cm} x ${artwork.height_cm} cm` : ""
  ].filter(Boolean);

  return [
    artwork.description,
    `${artwork.title} oleh ${artwork.artist || "Aksara Art House"}`,
    details.length ? details.join(" · ") : "",
    `Status: ${artworkStatusLabel(artwork.status)}.`
  ]
    .filter(Boolean)
    .join(" ");
}
