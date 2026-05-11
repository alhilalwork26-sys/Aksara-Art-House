import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aksara Art House",
  description: "Marketplace seni original, kurasi karya, lelang, dan pemesanan koleksi.",
  openGraph: {
    title: "Aksara Art House",
    description: "Marketplace seni original dari Surabaya.",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
