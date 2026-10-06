INSERT INTO public.categories (name, slug, description, position) VALUES
  ('Sneakers', 'sneakers', 'Runners, silhouettes et paires authentifiees.', 1),
  ('Streetwear', 'streetwear', 'Vestes, pantalons et couches pensees comme une armure leger.', 2),
  ('Accessoires', 'accessoires', 'Les details qui changent une silhouette complete.', 3)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.products
  (name, slug, sku, brand, description, colorway, palette, hover_palette, price, compare_price, stock, category_id, sizes, featured, active, release_date, is_new_drop, drop_ends_at)
SELECT v.name, v.slug, v.sku, v.brand, v.description, v.colorway, v.palette, v.hover_palette, v.price, v.compare_price, v.stock,
  c.id, v.sizes::jsonb, v.featured, true, v.release_date::timestamptz, v.is_new_drop, v.drop_ends_at::timestamptz
FROM (VALUES
  ('Aero Flux Runner - Silver', 'aero-flux-runner-silver', 'ND-0241', 'NOVA DISTRICT',
   'Runner en mesh balistique et semelle double densite. Usure certifiee conforme.',
   'Silver / Bone', 'void', 'onyx', 189.00, NULL, 12, 'sneakers',
   '[{"size":40,"stock":4},{"size":41,"stock":6},{"size":42,"stock":8},{"size":43,"stock":5},{"size":44,"stock":3},{"size":45,"stock":2}]',
   true, '2026-09-12', true, '2026-10-20T20:00:00Z'),

  ('Vector Shell Jacket - Obsidian', 'vector-shell-jacket-obsidian', 'ND-0188', 'NOVA DISTRICT',
   'Veste 3 couches, coutures etanches et details refletissants.',
   'Obsidian Black', 'void', 'onyx', 240.00, NULL, 8, 'streetwear',
   '[{"size":"S","stock":3},{"size":"M","stock":5},{"size":"L","stock":4},{"size":"XL","stock":2}]',
   true, '2026-08-28', true, '2026-10-28T20:00:00Z'),

  ('District Wide Cargo - Ash', 'district-wide-cargo-ash', 'ND-0305', 'NOVA DISTRICT',
   'Cargo large taille, tissu technique et six poches plaquees.',
   'Ash Grey', 'onyx', 'void', 145.00, NULL, 20, 'streetwear',
   '[{"size":28,"stock":6},{"size":30,"stock":8},{"size":32,"stock":9},{"size":34,"stock":7},{"size":36,"stock":4}]',
   true, '2026-09-02', false, NULL),

  ('Halo Mesh LS - Bone', 'halo-mesh-ls-bone', 'ND-0297', 'NOVA DISTRICT',
   'Long sleeve mesh teinte os, coupe oversize et col montant.',
   'Bone', 'light', 'bone', 95.00, 120.00, 30, 'streetwear',
   '[{"size":"S","stock":9},{"size":"M","stock":12},{"size":"L","stock":11},{"size":"XL","stock":6}]',
   true, '2026-07-19', false, NULL),

  ('Kinetic ARC/01 - Volt', 'kinetic-arc-01-volt', 'ND-0412', 'NOVA x KINETIC',
   'NOVA x KINETIC. Plaque carbone apparente, edition numerotee limitee a 300 paires.',
   'Volt / Carbon', 'volt', 'crimson', 225.00, NULL, 300, 'sneakers',
   '[{"size":40,"stock":60},{"size":41,"stock":70},{"size":42,"stock":80},{"size":43,"stock":55},{"size":44,"stock":35}]',
   true, '2026-10-01', true, '2026-10-15T20:00:00Z'),

  ('Alley Runner - Blackout', 'alley-runner-blackout', 'ND-0155', 'NOVA DISTRICT',
   'Silhouette basse tout noir, semelle gum et lacets refletissants.',
   'Blackout', 'onyx', 'void', 165.00, NULL, 6, 'sneakers',
   '[{"size":40,"stock":2},{"size":41,"stock":3},{"size":42,"stock":4},{"size":43,"stock":2},{"size":44,"stock":1}]',
   false, '2026-06-30', false, NULL),

  ('Reflector Cap 01', 'reflector-cap-01', 'ND-0370', 'NOVA DISTRICT',
   'Casquette 6 panneaux avec bandeau refletissant ton sur ton.',
   'Black / Reflective', 'onyx', 'void', 45.00, NULL, 50, 'accessoires',
   '[{"size":"One Size","stock":50}]',
   false, '2026-05-14', false, NULL),

  ('District Sling - Onyx', 'district-sling-onyx', 'ND-0388', 'NOVA DISTRICT',
   'Sac bandouliere compact, format tactile et fermeture zippee.',
   'Onyx', 'onyx', 'void', 70.00, NULL, 25, 'accessoires',
   '[{"size":"One Size","stock":25}]',
   false, '2026-05-14', false, NULL)
) AS v(name, slug, sku, brand, description, colorway, palette, hover_palette, price, compare_price, stock, category_slug, sizes, featured, release_date, is_new_drop, drop_ends_at)
JOIN public.categories c ON c.slug = v.category_slug
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.site_settings (
  id, hero_title, hero_subtitle, site_bg_color, site_panel_color,
  featured_categories, featured_limit, contact_email, contact_phone, contact_address,
  social_instagram, announcement_text, announcement_bg_color, announcement_text_color,
  free_shipping_threshold_dnt, shipping_cost_dnt
) VALUES (
  'main',
  'La ville ne dort jamais.',
  'NOVA/01 explore le mouvement apres minuit : volumes protecteurs, matieres refletissantes, energie brute.',
  '#080909',
  '#1A1C1C',
  '["sneakers","streetwear","accessoires"]'::jsonb,
  4,
  'contact@novadistrict.fr',
  '+33 1 00 00 00 00',
  '218 Neon Alley, Paris',
  '@novadistrict',
  '["LIVRAISON OFFERTE DES 120 EUR","RETOURS SOUS 30 JOURS","DROP 01 - EN LIGNE"]'::jsonb,
  '#CCFF00',
  '#080909',
  120.00,
  10.00
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.promotions (name, description, type, targets, percentage, start_date, end_date, announcement_text)
SELECT 'Welcome 10% Off', '10% off your first order.', 'PRODUCT', '["*"]'::jsonb, 10.00, now(), now() + interval '30 days', 'Welcome! Use code WELCOME10 for 10% off'
WHERE NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Welcome 10% Off');

INSERT INTO public.promotions (name, description, type, targets, percentage, start_date, end_date)
SELECT 'Launch Edit -15%', '15% off the launch selection.', 'CATEGORY', '["streetwear"]'::jsonb, 15.00, now(), now() + interval '14 days'
WHERE NOT EXISTS (SELECT 1 FROM public.promotions WHERE name = 'Launch Edit -15%');