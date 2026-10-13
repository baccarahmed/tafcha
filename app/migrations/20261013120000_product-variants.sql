-- Variantes de couleur produit.
--
-- Un « modele » regroupe plusieurs fiches produit, une par coloris. Le modele
-- lui-meme est une fiche ordinaire (`parent_id IS NULL`) ; ses coloris sont des
-- fiches filles qui pointent vers lui via `parent_id`. Le stock, le prix et les
-- pointures restent propres a chaque coloris : la ligne parente n'est qu'un
-- point de regroupement et une page produit, jamais un stock partage.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.products(id) ON DELETE SET NULL;

-- Empeche une fiche de se declarer sa propre variante (cycle trivial).
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_no_self_parent;

ALTER TABLE public.products
  ADD CONSTRAINT products_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id);

-- Le chargement des variantes d'un modele filtre sur `parent_id` : index dedie.
CREATE INDEX IF NOT EXISTS idx_products_parent_id ON public.products(parent_id);
