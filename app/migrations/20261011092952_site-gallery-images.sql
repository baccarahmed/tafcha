-- Galerie orbitale de la vitrine (section sous « Authenticité garantie »).
-- La colonne stocke un tableau JSON d'URLs servies par la CDN du bucket
-- `product-images` (dossier `gallery/`), plus les visuels locaux par defaut.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS gallery_images jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.site_settings
SET gallery_images = '[
  "/images/q2m/b094bfa2-b381-4969-8162-ae434c8f6be0.jpg",
  "/images/q2m/002c1589-a290-4e47-b515-0002bc0fd98a.jpg"
]'::jsonb
WHERE id = 'main'
  AND (gallery_images IS NULL OR gallery_images = '[]'::jsonb);
