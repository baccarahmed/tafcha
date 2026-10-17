-- Suivi de commande : historique horodate des transitions de statut + fenetre
-- de livraison automatique.
--
-- Jusqu'ici la timeline du compte client etait *deduite* du statut courant
-- (voir AccountPage avant ce lot) : on affichait l'avancement suppose, jamais
-- les dates reelles. `order_events` conserve chaque transition horodatee, ce
-- qui alimente une vraie timeline cote client sans toucher a la signature du
-- RPC `create_order_with_stock` (les triggers s'executent dans sa transaction).

CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_events_order_created ON public.order_events(order_id, created_at);

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

-- Lecture : le proprietaire de la commande ou un administrateur. Les ecritures
-- ne passent que par les triggers SECURITY DEFINER ci-dessous, donc aucun droit
-- d'ecriture n'est accorde (meme principe que les autres tables d'audit).
CREATE POLICY order_events_select_own ON public.order_events
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_events.order_id
        AND o.user_id = (SELECT auth.uid())
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.order_events FROM anon, authenticated;

-- Fenetre de livraison par defaut (5 a 10 jours) quand le checkout n'en fournit
-- pas. Les colonnes sont `text` (schema d'origine) : on stocke une date ISO.
CREATE OR REPLACE FUNCTION public.set_order_delivery_window()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.delivery_window_start IS NULL THEN
    NEW.delivery_window_start := (COALESCE(NEW.created_at, now()) + interval '5 days')::date::text;
  END IF;

  IF NEW.delivery_window_end IS NULL THEN
    NEW.delivery_window_end := (COALESCE(NEW.created_at, now()) + interval '10 days')::date::text;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_set_delivery_window
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_delivery_window();

-- Evenement initial a la creation : la commande demarre toujours en PENDING.
CREATE OR REPLACE FUNCTION public.log_order_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.order_events (order_id, status)
  VALUES (NEW.id, NEW.status);

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_log_created
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_created();

-- Un evenement par transition de statut (pas de doublon quand le statut est
-- reecrit a l'identique).
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.order_events (order_id, status)
  VALUES (NEW.id, NEW.status);

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_log_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.log_order_status_change();
