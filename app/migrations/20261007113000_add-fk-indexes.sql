-- Index sur les colonnes de cles etrangeres non indexees.
--
-- Le scan advisor a releve deux FK sans index : chaque jointure ou
-- suppression en cascade par product_id / order_id force un scan
-- sequentiel de la table fille. Le volume actuel est faible mais ce
-- sont les acces les plus frequents du catalogue (panier, avis).

CREATE INDEX IF NOT EXISTS idx_cart_items_product_id
  ON public.cart_items (product_id);

CREATE INDEX IF NOT EXISTS idx_reviews_order_id
  ON public.reviews (order_id);