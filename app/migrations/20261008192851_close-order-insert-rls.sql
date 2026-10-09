-- Ferme le dernier trou RLS sur les commandes.
--
-- Contexte : 20261007090000 (restrict-order-writes) a retire UPDATE/DELETE
-- sur orders/order_items pour authenticated, mais les policies
-- `orders_owner_insert` / `order_items_owner_insert`
-- (WITH CHECK (user_id = auth.uid())) permettaient encore a tout membre
-- connecte de forger des commandes (status / payment_status / totaux
-- arbitraires) et des lignes (prix, quantites, order_id libre) directement
-- via la REST API, en contournant le checkout next.js qui, lui, recalcule
-- prix et stocks cote serveur.
--
-- On coupe l'INSERT a authenticated. Toute creation passe desormais par
-- createOrderAction via le client admin (non soumis a RLS), qui valide
-- adresse, produits, stocks, quantites, prix et applique un rate-limit.
-- SELECT est conserve : un client voit toujours ses propres commandes, un
-- admin lit tout.
--
-- Consequence code : createOrderAction n'utilise plus le client de session
-- pour ecrire ; il passe systematiquement par insforgeAdmin() (orders.ts).

REVOKE INSERT ON public.orders, public.order_items FROM authenticated;

DROP POLICY IF EXISTS orders_owner_insert ON public.orders;
DROP POLICY IF EXISTS order_items_owner_insert ON public.order_items;