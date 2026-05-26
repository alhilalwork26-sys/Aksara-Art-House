import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listArtworks } from "@/lib/supabase-rest";
import { artworkDescription, artworkSlug, artworkStatusLabel, artworkUrl, formatRupiah, SITE_URL } from "@/lib/seo";
import type { Artwork } from "@/lib/types";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function getArtwork(slug: string): Promise<Artwork | null> {
  const artworks = await listArtworks();
  return artworks.find((artwork) => artworkSlug(artwork) === slug || artwork.id === slug) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const artwork = await getArtwork(slug).catch(() => null);

  if (!artwork) {
    return {
      title: "Karya Tidak Ditemukan | Aksara Art House",
      robots: { index: false, follow: true }
    };
  }

  const description = artworkDescription(artwork).slice(0, 155);
  const url = artworkUrl(artwork);

  return {
    title: artwork.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: artwork.title,
      description,
      url,
      siteName: "Aksara Art House",
      type: "website",
      images: artwork.image_url ? [{ url: artwork.image_url, alt: artwork.title }] : undefined,
      locale: "id_ID"
    },
    twitter: {
      card: artwork.image_url ? "summary_large_image" : "summary",
      title: artwork.title,
      description,
      images: artwork.image_url ? [artwork.image_url] : undefined
    }
  };
}

export default async function ArtworkSeoPage({ params }: PageProps) {
  const { slug } = await params;
  const artwork = await getArtwork(slug).catch(() => null);
  if (!artwork) notFound();

  const details = [
    artwork.medium,
    artwork.year ? String(artwork.year) : null,
    artwork.width_cm && artwork.height_cm ? `${artwork.width_cm} x ${artwork.height_cm}${artwork.depth_cm ? ` x ${artwork.depth_cm}` : ""} cm` : null
  ].filter(Boolean);
  const isAvailable = artwork.status === "available";
  const isAuction = artwork.status === "auction";
  const marketplaceHref = `/marketplace.html?artwork=${encodeURIComponent(artwork.id)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: artwork.title,
    image: artwork.image_url ? [artwork.image_url] : undefined,
    description: artworkDescription(artwork),
    brand: { "@type": "Brand", name: "Aksara Art House" },
    category: artwork.category || "Original Artwork",
    material: artwork.medium || undefined,
    offers: {
      "@type": "Offer",
      url: artworkUrl(artwork),
      priceCurrency: "IDR",
      price: artwork.price,
      availability: isAvailable || isAuction ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "ArtGallery",
        name: "Aksara Art House",
        url: SITE_URL,
        address: "Jl. Penjaringan Asri VII No.43, Penjaringan Sari, Kec. Rungkut, Surabaya, Jawa Timur 60297"
      }
    }
  };

  return (
    <main className="artwork-seo-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav className="artwork-seo-nav" aria-label="Navigasi">
        <Link href="/marketplace.html">Aksara Art House</Link>
        <div>
          <Link href="/marketplace.html#gallery">Koleksi</Link>
          <Link href="/marketplace.html#auction">Lelang</Link>
        </div>
      </nav>

      <section className="artwork-seo-hero">
        <div className="artwork-seo-media">
          {artwork.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artwork.image_url} alt={artwork.title} />
          ) : (
            <div className="artwork-seo-placeholder" aria-label="Karya tanpa gambar">
              <span>{artwork.title}</span>
            </div>
          )}
        </div>

        <article className="artwork-seo-copy">
          <p className="artwork-seo-eyebrow">Karya Original Aksara Art House</p>
          <h1>{artwork.title}</h1>
          <p className="artwork-seo-artist">{artwork.artist || "Aksara Art House"}</p>
          <div className="artwork-seo-price">{formatRupiah(artwork.price)}</div>
          <div className={`artwork-seo-status status-${artwork.status}`}>{artworkStatusLabel(artwork.status)}</div>

          <p className="artwork-seo-description">
            {artwork.description || "Karya original Aksara Art House yang siap menjadi titik fokus ruang dan koleksi pribadi Anda."}
          </p>

          <dl className="artwork-seo-specs">
            <div>
              <dt>Medium</dt>
              <dd>{artwork.medium || "-"}</dd>
            </div>
            <div>
              <dt>Tahun</dt>
              <dd>{artwork.year || "-"}</dd>
            </div>
            <div>
              <dt>Ukuran</dt>
              <dd>{details[2] || "-"}</dd>
            </div>
            <div>
              <dt>Kategori</dt>
              <dd>{artwork.category || "-"}</dd>
            </div>
          </dl>

          <div className="artwork-seo-actions">
            {isAvailable ? <Link className="artwork-seo-primary" href={marketplaceHref}>Beli di Marketplace</Link> : null}
            {isAuction ? <Link className="artwork-seo-primary" href="/marketplace.html#auction">Ikut Lelang</Link> : null}
            <a className="artwork-seo-secondary" href={`https://wa.me/6281918344549?text=${encodeURIComponent(`Halo Aksara Art House, saya tertarik dengan karya "${artwork.title}".`)}`}>Konsultasi WhatsApp</a>
          </div>
        </article>
      </section>

      <section className="artwork-seo-trust">
        <div>
          <strong>Sertifikat Keaslian</strong>
          <span>Setiap karya original dilengkapi keterangan karya dari studio.</span>
        </div>
        <div>
          <strong>Ongkir Termasuk</strong>
          <span>Harga karya sudah termasuk pengiriman nasional sesuai kebijakan marketplace.</span>
        </div>
        <div>
          <strong>Galeri Surabaya</strong>
          <span>Konsultasi karya dan penempatan ruang bisa langsung via WhatsApp.</span>
        </div>
      </section>
    </main>
  );
}
