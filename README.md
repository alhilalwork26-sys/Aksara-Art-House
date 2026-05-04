# Aksara Art House Marketplace

Website marketplace seni Aksara Art House. Versi saat ini masih berupa HTML, CSS, JavaScript, dan `localStorage`, tetapi proyek sudah mulai disiapkan menuju produksi dengan Supabase/Postgres.

## Halaman

- `src/app/page.tsx` - versi Next.js marketplace produksi awal.
- `src/app/admin/page.tsx` - dashboard admin produksi awal.
- `src/app/api/orders/route.ts` - endpoint checkout untuk menyimpan pesanan ke Supabase.
- `index.html` - halaman pembeli: beranda, galeri, detail karya, wishlist, keranjang, checkout, riwayat pesanan, lelang, dan kontak WhatsApp.
- `admin.html` - panel admin: dashboard, kelola karya, upload foto karya, kelola status pesanan, lelang, pengaturan, ekspor CSV/Excel.
- `murni-atelier-user-2.html` dan `murni-atelier-admin-2.html` - file import asli yang sudah disalin ke folder proyek.

## Menjalankan Aplikasi Next.js

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

Untuk build produksi:

```bash
npm run build
```

## Login Admin

- Prototype lama: username `admin`, password `admin123`.
- Next.js baru: isi `ADMIN_USERNAME` dan `ADMIN_PASSWORD` di `.env`. Jika `ADMIN_PASSWORD` kosong, proteksi basic auth admin tidak aktif.

Segera ganti dari menu Pengaturan saat dipakai untuk demo yang dibagikan ke orang lain.

## Yang Sudah Bisa Dipakai

- Katalog karya dengan filter kategori dan urutan harga/tahun.
- Detail karya dengan simulasi visual di ruangan.
- Wishlist dan keranjang.
- Checkout multi-step.
- Pesanan tersimpan di `localStorage` dan muncul di admin.
- Admin dapat menambah, mengedit, menghapus karya, mengubah status, dan upload foto.
- Karya berstatus `Lelang` otomatis masuk halaman lelang.
- Admin dapat ekspor pesanan ke CSV atau Excel.

## Prioritas Pengembangan Berikutnya

1. Jalankan schema database di `supabase/schema.sql`.
2. Pindahkan data dari `localStorage` ke Supabase.
3. Buat auth admin dan pelanggan dengan Supabase Auth.
4. Upload gambar ke Supabase Storage, bukan base64 di browser.
5. Checkout nyata: ongkir, invoice, bukti transfer, dan payment gateway.
6. Validasi stok agar karya yang sudah terjual tidak bisa dibeli ulang.
7. Halaman profil pelanggan dan detail status pengiriman.
8. SEO dasar, metadata sosial, dan gambar karya asli.

## File Produksi Awal

- `.env.example` - contoh konfigurasi environment.
- `supabase/schema.sql` - schema database Supabase/Postgres dengan tabel, enum, index, trigger, dan RLS policy.
- `supabase/seed.sql` - data awal opsional untuk mengisi beberapa karya contoh di database.
- `docs/production-roadmap.md` - rencana migrasi menuju aplikasi produksi.

## Penyimpanan Data Prototype

Tampilan lama tetap dipakai, tetapi data marketplace tidak lagi diarahkan ke browser `localStorage` secara langsung. File `public/legacy-db-shim.js` mengganti akses data untuk key Aksara agar lewat endpoint `/api/legacy-store`.

Jika `.env.local` sudah berisi kredensial Supabase, endpoint ini menyimpan data ke tabel `site_settings` dengan key seperti `legacy:aksara-paintings`, `legacy:aksara-orders`, dan `legacy:murni-admin-settings`.

Jika Supabase belum dikonfigurasi, halaman tetap bisa dibuka dengan data default, tetapi perubahan belum tersimpan permanen.
