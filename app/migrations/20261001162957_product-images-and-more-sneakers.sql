-- Every product ships a real product photo in products.images (jsonb array of URLs).
-- The storefront falls back to the procedural SneakerVisual when the array is empty.

UPDATE public.products SET images = '["https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20product%20photograph%20of%20a%20silver%20and%20grey%20mesh%20running%20sneaker%2C%20side%20profile%2C%20studio%20softbox%20lighting%2C%20pure%20black%20seamless%20background%2C%20glossy%20metallic%20silver%20upper%2C%20white%20foam%20midsole%2C%20ultra%20sharp%20detail%2C%20centered%2C%20square%20crop&image_size=square_hd"]'::jsonb
WHERE slug = 'aero-flux-runner-silver';

UPDATE public.products SET images = '["https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20product%20photograph%20of%20a%20futuristic%20technical%20runner%20sneaker%20with%20neon%20volt%20yellow%20green%20accents%2C%20dark%20charcoal%20upper%2C%20side%20profile%2C%20studio%20softbox%20lighting%2C%20pure%20black%20seamless%20background%2C%20ultra%20sharp%20detail%2C%20centered%2C%20square%20crop&image_size=square_hd"]'::jsonb
WHERE slug = 'kinetic-arc-01-volt';

UPDATE public.products SET images = '["https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20product%20photograph%20of%20an%20all%20black%20low%20top%20suede%20sneaker%2C%20matte%20black%20upper%2C%20side%20profile%2C%20studio%20softbox%20lighting%2C%20pure%20black%20seamless%20background%2C%20ultra%20sharp%20detail%2C%20centered%2C%20square%20crop&image_size=square_hd"]'::jsonb
WHERE slug = 'alley-runner-blackout';

-- The footwear-only catalog was down to three pairs; restock it.
INSERT INTO public.products
  (name, slug, sku, brand, description, colorway, palette, hover_palette, price, stock, category_id, images, sizes, featured, active, is_new_drop)
VALUES
  ('Vector Runner - Cement', 'vector-runner-cement', 'ND-0521', 'NOVA DISTRICT',
   'Runner basique en suède et mesh, semelle EVAInject rebondissante.',
   'Cement / Chalk', 'void', 'onyx', 175.00, 14,
   (SELECT id FROM public.categories WHERE slug = 'sneakers'),
   '["https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20product%20photograph%20of%20a%20grey%20cement%20suede%20and%20mesh%20runner%20sneaker%2C%20side%20profile%2C%20studio%20softbox%20lighting%2C%20pure%20black%20seamless%20background%2C%20ultra%20sharp%20detail%2C%20centered%2C%20square%20crop&image_size=square_hd"]'::jsonb,
   '[{"size": 40, "stock": 3}, {"size": 41, "stock": 4}, {"size": 42, "stock": 2}, {"size": 43, "stock": 3}, {"size": 44, "stock": 2}]'::jsonb,
   false, true, false),

  ('Flux High - Bone', 'flux-high-bone', 'ND-0533', 'NOVA DISTRICT',
   'High top minimal en cuir pleine fleur, collar rembourré.',
   'Bone / Off White', 'bone', 'onyx', 210.00, 9,
   (SELECT id FROM public.categories WHERE slug = 'sneakers'),
   '["https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20product%20photograph%20of%20an%20off%20white%20bone%20leather%20high%20top%20sneaker%2C%20minimal%20clean%20design%2C%20side%20profile%2C%20studio%20softbox%20lighting%2C%20pure%20black%20seamless%20background%2C%20ultra%20sharp%20detail%2C%20centered%2C%20square%20crop&image_size=square_hd"]'::jsonb,
   '[{"size": 40, "stock": 2}, {"size": 41, "stock": 3}, {"size": 42, "stock": 2}, {"size": 43, "stock": 2}]'::jsonb,
   false, true, false),

  ('District Low - Olive', 'district-low-olive', 'ND-0544', 'NOVA DISTRICT',
   'Low top militaire en toile et suède, languette cousue main.',
   'Olive / Black', 'onyx', 'volt', 155.00, 18,
   (SELECT id FROM public.categories WHERE slug = 'sneakers'),
   '["https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20product%20photograph%20of%20an%20olive%20green%20military%20low%20top%20sneaker%2C%20canvas%20and%20suede%2C%20side%20profile%2C%20studio%20softbox%20lighting%2C%20pure%20black%20seamless%20background%2C%20ultra%20sharp%20detail%2C%20centered%2C%20square%20crop&image_size=square_hd"]'::jsonb,
   '[{"size": 40, "stock": 5}, {"size": 41, "stock": 6}, {"size": 42, "stock": 4}, {"size": 43, "stock": 3}]'::jsonb,
   false, true, false),

  ('Nova Court - White', 'nova-court-white', 'ND-0558', 'NOVA DISTRICT',
   'Basket court en cuir pleine fleur, semelle gomme naturelle.',
   'White / Gum', 'bone', 'onyx', 130.00, 22,
   (SELECT id FROM public.categories WHERE slug = 'sneakers'),
   '["https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20product%20photograph%20of%20a%20white%20leather%20low%20top%20court%20sneaker%20with%20gum%20rubber%20sole%2C%20side%20profile%2C%20studio%20softbox%20lighting%2C%20pure%20black%20seamless%20background%2C%20ultra%20sharp%20detail%2C%20centered%2C%20square%20crop&image_size=square_hd"]'::jsonb,
   '[{"size": 40, "stock": 6}, {"size": 41, "stock": 6}, {"size": 42, "stock": 5}, {"size": 43, "stock": 5}]'::jsonb,
   false, true, true),

  ('Onyx Trail - Safety', 'onyx-trail-safety', 'ND-0570', 'NOVA DISTRICT',
   'Trail technique, crampons aggressifs et membrane imperméable.',
   'Black / Safety Orange', 'onyx', 'ember', 195.00, 11,
   (SELECT id FROM public.categories WHERE slug = 'sneakers'),
   '["https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20product%20photograph%20of%20a%20black%20trail%20running%20sneaker%20with%20safety%20orange%20accents%20and%20rugged%20lugged%20sole%2C%20side%20profile%2C%20studio%20softbox%20lighting%2C%20pure%20black%20seamless%20background%2C%20ultra%20sharp%20detail%2C%20centered%2C%20square%20crop&image_size=square_hd"]'::jsonb,
   '[{"size": 41, "stock": 2}, {"size": 42, "stock": 4}, {"size": 43, "stock": 3}, {"size": 44, "stock": 2}]'::jsonb,
   false, true, true);

UPDATE public.products
SET drop_ends_at = now() + interval '5 days'
WHERE slug IN ('nova-court-white', 'onyx-trail-safety');