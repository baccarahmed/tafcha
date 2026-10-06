-- NOVA DISTRICT is a footwear-only store. Drop the streetwear and accessories
-- products, then the two categories that become empty.
DELETE FROM public.products WHERE slug IN (
  'vector-shell-jacket-obsidian',
  'district-wide-cargo-ash',
  'halo-mesh-ls-bone',
  'reflector-cap-01',
  'district-sling-onyx'
);

DELETE FROM public.categories WHERE slug IN ('streetwear', 'accessoires');

-- The hero copy and category counts still advertise the removed ranges.
UPDATE public.site_settings
SET hero_subtitle = 'Des sneakers premium, sélectionnées à Paris. Runners, silhouettes rétro et drops limités — disponibilité comptée.',
    updated_at = now()
WHERE id = 'main';

UPDATE public.promotions
SET description = 'Early access sur les drops hebdomadaires'
WHERE name = 'DROPZONE';