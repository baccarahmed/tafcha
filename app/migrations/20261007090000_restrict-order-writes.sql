-- Un client authentifie ne doit jamais pouvoir modifier une commande ni ses
-- lignes. Les montants sont recalcules par le serveur a la creation (et non
-- pris du navigateur), mais le paiement se faisant a la livraison, la policy
-- `FOR ALL ... USING (owner OR admin)` laissee en place permettait depuis la
-- REST API de passer total, unit_price, quantity, status ou payment_status a
-- n'importe quelle valeur sur ses propres lignes.
--
-- On conserve SELECT + INSERT pour le proprietaire : le checkout s'ecrit via
-- le client lie a la session. UPDATE est retire, DELETE n'avait pas de grant.
-- Les ecritures back-office passent par createAdminClient (project_admin),
-- qui n'est ni concerne par RLS ni par ces grants.
--
-- Consequence code : createOrderAction ne peut plus faire son nettoyage
-- d'annulation via le client de session ; il est passe sur le client admin.

REVOKE ALL PRIVILEGES ON public.orders, public.order_items FROM anon, authenticated;
GRANT SELECT, INSERT ON public.orders, public.order_items TO authenticated;

DROP POLICY IF EXISTS orders_owner_access ON public.orders;
DROP POLICY IF EXISTS order_items_owner_access ON public.order_items;

CREATE POLICY orders_owner_select ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY orders_owner_insert ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY order_items_owner_select ON public.order_items
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR public.is_admin());

CREATE POLICY order_items_owner_insert ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
