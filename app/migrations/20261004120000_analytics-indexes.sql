-- Index unique pour le filtre de periode de l'analytique des ventes.
--
-- `getSalesAnalytics()` filtre sur `created_at >= debut` puis ecarte les
-- commandes annulees, echouees ou remboursees. Les index existants
-- (`idx_orders_created_at`, `idx_orders_status`) ne couvrent chacun qu'une
-- partie du filtre : PostgreSQL ne peut les combiner, il balaie donc toute la
-- table a chaque changement de periode. L'index composite ci-dessous repond au
-- triple predicat en un seul parcours.
--
-- `products.sku` est deja UNIQUE (donc deja indexe) et la recherche par nom du
-- back-office se fait en memoire sur un catalogue de quelques centaines de
-- lignes : aucun index supplementaire n'est utile ici.
CREATE INDEX IF NOT EXISTS idx_orders_created_at_status
  ON public.orders(created_at DESC, status, payment_status);