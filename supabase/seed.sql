-- Optional starter data for Aksara Art House
-- Run after supabase/schema.sql if you want demo artworks in the production database.

insert into public.artworks (
  title,
  artist,
  category,
  status,
  medium,
  year,
  price,
  width_cm,
  height_cm,
  depth_cm,
  description,
  colors,
  tags,
  is_featured
) values
(
  'Senja di Prambanan',
  'Murni Rahayu',
  'landscape',
  'available',
  'Oil on Canvas',
  2024,
  4500000,
  90,
  70,
  3.5,
  'Keagungan Prambanan saat matahari terbenam, dengan cahaya keemasan dan langit ungu kemerahan.',
  array['#C4722A','#8B4E2E','#F5A65B','#1A1A2E','#E8975A'],
  array['landscape','oil','2024'],
  true
),
(
  'Rindu yang Membara',
  'Murni Rahayu',
  'abstrak',
  'auction',
  'Acrylic on Canvas',
  2024,
  3200000,
  80,
  80,
  4,
  'Ekspresi rindu lewat guratan merah dan oranye yang dinamis.',
  array['#8B2E2E','#D4521A','#F08030','#2C1810','#C44A2A'],
  array['abstrak','acrylic','2024'],
  true
),
(
  'Perempuan dan Hujan',
  'Murni Rahayu',
  'figuratif',
  'available',
  'Mixed Media',
  2023,
  6800000,
  100,
  120,
  3,
  'Figur perempuan dalam hujan sebagai simbol ketabahan dan ketenangan jiwa.',
  array['#3A4A5C','#6A8A9C','#C4A882','#2C3040','#8AAAB8'],
  array['figuratif','mixed media','2023'],
  false
),
(
  'Gadis Batik',
  'Murni Rahayu',
  'figuratif',
  'available',
  'Oil on Canvas',
  2025,
  5500000,
  70,
  100,
  3,
  'Potret gadis muda dengan batik kawung, lembut dan penuh detail.',
  array['#1A1010','#4A3020','#8A6040','#C49870','#D4B888'],
  array['figuratif','oil','2025'],
  true
);

-- Buat record lelang untuk "Rindu yang Membara"
insert into public.auctions (artwork_id, status, start_bid, current_bid, min_step, starts_at, ends_at)
select
  id,
  'active',
  3200000,
  3200000,
  100000,
  now(),
  now() + interval '7 days'
from public.artworks
where title = 'Rindu yang Membara';

