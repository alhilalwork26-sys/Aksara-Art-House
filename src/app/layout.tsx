import type { Metadata } from "next";
import "./globals.css";
import { GoogleAnalytics } from "@/components/google-analytics";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Anima Libera Art | Marketplace Lukisan Original Surabaya",
    template: "%s | Anima Libera Art"
  },
  description: "Anima Libera Art: lukisan kontemporer eksklusif dengan medium lidi, untuk jiwa yang merdeka. Beli karya original, ikut lelang, dan konsultasi via WhatsApp.",
  keywords: ["lukisan lidi", "seni kontemporer", "lukisan kontemporer", "lukisan original", "beli lukisan", "galeri seni Surabaya", "Anima Libera Art", "lelang lukisan"],
  alternates: {
    canonical: SITE_URL
  },
  openGraph: {
    title: "Anima Libera Art",
    description: "Lukisan kontemporer eksklusif dengan medium lidi, untuk jiwa yang merdeka.",
    url: SITE_URL,
    siteName: "Anima Libera Art",
    type: "website",
    locale: "id_ID"
  },
  twitter: {
    card: "summary_large_image",
    title: "Anima Libera Art",
    description: "Lukisan kontemporer eksklusif dengan medium lidi, untuk jiwa yang merdeka."
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
