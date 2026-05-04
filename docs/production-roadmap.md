# Roadmap Produksi Aksara Art House

Target: marketplace seni yang bisa dipakai publik, punya admin sungguhan, database aman, upload gambar rapi, checkout stabil, dan siap hosting.

## Keputusan Teknis

Stack yang direkomendasikan:

- Frontend/app: Next.js
- Bahasa utama: JavaScript atau TypeScript
- Database: Supabase Postgres
- Auth: Supabase Auth
- Storage gambar: Supabase Storage
- Payment gateway Indonesia: Midtrans atau Xendit
- Hosting: Vercel

Alasan memilih Supabase:

- Postgres matang dan siap produksi.
- Ada dashboard database, auth, storage, dan API otomatis.
- Cocok untuk marketplace kecil sampai menengah.
- Bisa tetap berkembang ke backend custom kalau traffic makin besar.

## Tahap 1 - Database

File schema ada di:

`supabase/schema.sql`

Langkah:

1. Buat project baru di Supabase.
2. Buka SQL Editor.
3. Jalankan isi `supabase/schema.sql`.
4. Buat bucket storage untuk gambar karya, misalnya `artworks`.
5. Simpan `SUPABASE_URL` dan `SUPABASE_ANON_KEY` ke `.env`.

## Tahap 2 - Migrasi Data

Data prototype kini diarahkan melalui `public/legacy-db-shim.js`. Script lama tetap memanggil API `localStorage`, tetapi untuk key Aksara berikut ini penyimpanan diarahkan ke endpoint server `/api/legacy-store` dan tabel Supabase `site_settings` dengan prefix `legacy:`.

Key yang dipindahkan:

- `aksara-paintings`
- `aksara-auctions`
- `aksara-orders`
- `aksara-user`
- `aksara-wishlist`
- `murni-admin-settings`

Strategi migrasi:

1. Gunakan bridge `/api/legacy-store` agar prototype tidak lagi menyimpan data marketplace di browser.
2. Setelah data stabil, konversi nilai `legacy:aksara-paintings`, `legacy:aksara-auctions`, dan `legacy:aksara-orders` ke tabel normal.
3. Insert ke tabel `artworks`, `auctions`, `orders`, dan `order_items`.
4. Setelah migrasi tabel normal selesai, lepaskan shim dan panggil tabel produksi langsung dari UI.

## Tahap 3 - Aplikasi Produksi

Fondasi Next.js sudah dibuat di folder `src/`:

- `src/app/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/api/orders/route.ts`
- `src/lib/supabase-rest.ts`

Halaman minimum:

- `/` - galeri/katalog marketplace
- `/artworks/[id]` - detail karya
- `/cart` - keranjang
- `/checkout` - checkout
- `/orders` - riwayat pesanan user
- `/admin` - dashboard admin
- `/admin/artworks` - kelola karya
- `/admin/orders` - kelola pesanan
- `/admin/auctions` - kelola lelang

## Tahap 4 - Pembayaran dan Operasional

Fitur produksi yang perlu ditambahkan:

- Nomor invoice otomatis.
- Status pembayaran.
- Upload bukti pembayaran jika belum pakai payment gateway.
- Integrasi Midtrans/Xendit untuk pembayaran otomatis.
- Biaya pengiriman atau konfirmasi ongkir manual.
- Email/WhatsApp notifikasi pesanan.
- Proteksi stok: karya yang sudah terjual tidak bisa checkout lagi.

## Catatan Keamanan

- Jangan simpan `SERVICE_ROLE_KEY` di frontend.
- Admin harus memakai Supabase Auth dan role `admin` di tabel `profiles`.
- Operasi admin harus melewati RLS policy atau server route.
- Gambar karya sebaiknya di Supabase Storage, bukan base64 di database.
