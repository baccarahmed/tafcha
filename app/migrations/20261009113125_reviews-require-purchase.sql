-- F-REV-1 (Moyenne) : un avis ne peut etre poste que par un client ayant une
-- commande PAYEE contenant le produit concerne.
-- Constat du pentest : la police reviews_insert_own ne verifiait que
-- user_id = auth.uid(), donc n'importe quel utilisateur authentifie pouvait
-- poster un avis sans jamais avoir achete le produit.
--
-- Correctif : la WITH CHECK exige une ligne de commande (order_items jointe a
-- orders) appartenant a l'appelant, pour ce meme produit, avec
-- payment_status = 'PAID'. Un index unique (user_id, product_id) empeche
-- d'accumuler plusieurs avis sur le meme produit. La mise a jour d'un avis
-- (reviews_update_own) et la suppression admin restent inchangees.

DROP POLICY IF EXISTS reviews_insert_own ON public.reviews;
CREATE POLICY reviews_insert_own ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE o.user_id = (SELECT auth.uid())
        AND oi.product_id = reviews.product_id
        AND o.payment_status = 'PAID'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS reviews_user_product_unique
  ON public.reviews (user_id, product_id);