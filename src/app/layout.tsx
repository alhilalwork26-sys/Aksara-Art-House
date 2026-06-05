import type { Metadata } from "next";
import "./globals.css";
import { GoogleAnalytics } from "@/components/google-analytics";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Aksara Art House | Marketplace Lukisan Original Surabaya",
    template: "%s | Aksara Art House"
  },
  description: "Marketplace lukisan original dari Surabaya. Beli karya seni, ikut lelang, dan konsultasi koleksi langsung dengan Aksara Art House.",
  keywords: ["lukisan original", "beli lukisan", "galeri seni Surabaya", "Aksara Art House", "lelang lukisan", "marketplace seni"],
  alternates: {
    canonical: SITE_URL
  },
  openGraph: {
    title: "Aksara Art House",
    description: "Marketplace lukisan original dari Surabaya.",
    url: SITE_URL,
    siteName: "Aksara Art House",
    type: "website",
    locale: "id_ID"
  },
  twitter: {
    card: "summary_large_image",
    title: "Aksara Art House",
    description: "Marketplace lukisan original dari Surabaya."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
