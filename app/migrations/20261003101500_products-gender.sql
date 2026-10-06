-- Le back-office et la boutique ont besoin de filtrer les produits par genre,
-- mais la grille de categories du storefront pointe deja vers
-- /shop?gender=homme, /shop?gender=femme et /shop?gender=enfant.
--
-- Tant que la colonne n'existe pas, le filtre ne peut faire qu Chercher ces
-- mots dans le nom du produit, ce qui ne retourne jamais rien : aucun modele
-- ne porte ces mots. On stocke donc la donnee reellement.
--
-- NULL reste autorise : un produit sans genre cible reste vendable, il est
-- simplement absent du filtre par genre.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS gender text;

-- Contrainte ajoutee via DO pour rester idempotent si la colonne existe deja.
DO $outer$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_gender_check'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_gender_check
      CHECK (gender IS NULL OR gender IN ('homme', 'femme', 'enfant', 'unisexe'));
  END IF;
END;
$outer$;

-- Les 8 modeles existants sont des sneakers au genre non precise. On les
-- marque "unisexe" plutot que de leur inventer un genre, et on ne retient que
-- les valeurs reelles pour eviter de reecrire la colonne a chaque deploiement.
UPDATE public.products
SET gender = 'unisexe'
WHERE gender IS NULL;

CREATE INDEX IF NOT EXISTS products_gender_idx
  ON public.products (gender)
  WHERE gender IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_category_id_idx
  ON public.products (category_id)
  WHERE category_id IS NOT NULL;