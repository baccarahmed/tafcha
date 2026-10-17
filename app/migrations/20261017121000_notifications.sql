-- Notifications in-app persistees + diffusion temps reel.
--
-- Deux audiences : les administrateurs (nouvelle commande, message de contact,
-- avis produit) et le client (confirmation + changements de statut). Chaque
-- notification est ecrite en base (source de verite, lue au chargement) puis
-- publiee sur le canal personnel `user:<id>:notifications` pour un affichage
-- immediat (cloche + toast) sans rechargement.
--
-- Les triggers SECURITY DEFINER sont les seuls a ecrire ici : les droits
-- d'INSERT sont retires a anon/authenticated (comme pour orders via le RPC).

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audience text NOT NULL CHECK (audience IN ('ADMIN', 'CUSTOMER')),
  kind text NOT NULL,
  title text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  href text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient_created
  ON public.notifications(recipient_id, created_at DESC);

CREATE INDEX idx_notifications_unread
  ON public.notifications(recipient_id)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Le destinataire lit et marque ses propres notifications (jamais celles d'un
-- autre). L'INSERT reste reserve aux triggers : aucun GRANT INSERT.
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));

CREATE POLICY notifications_delete_own ON public.notifications
  FOR DELETE TO authenticated
  USING (recipient_id = (SELECT auth.uid()));

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
REVOKE INSERT ON public.notifications FROM anon, authenticated;

-- Canaux temps reel : un canal personnel par utilisateur + un canal par
-- commande (suivi live sur la fiche commande).
INSERT INTO realtime.channels (pattern, description, enabled)
VALUES
  ('user:%:notifications', 'Notifications personnelles par utilisateur', true),
  ('order:%', 'Suivi de statut par commande', true)
ON CONFLICT (pattern) DO UPDATE
SET description = EXCLUDED.description,
    enabled = EXCLUDED.enabled;

-- Verrouillage des abonnements : un client ne peut s'abonner qu'a son propre
-- canal de notifications et qu'aux commandes qui lui appartiennent (un admin
-- peut suivre toutes les commandes).
ALTER TABLE realtime.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_subscribe_own
ON realtime.channels FOR SELECT TO authenticated
USING (
  pattern = 'user:%:notifications'
  AND substring(realtime.channel_name() FROM '^user:([0-9a-f-]{36}):notifications$')::uuid = (SELECT auth.uid())
);

CREATE POLICY orders_subscribe_own
ON realtime.channels FOR SELECT TO authenticated
USING (
  pattern = 'order:%'
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = substring(realtime.channel_name() FROM '^order:([0-9a-f-]{36})$')::uuid
      AND (o.user_id = (SELECT auth.uid()) OR public.is_admin())
  )
);

-- Helper unique : persiste une notification puis la publie sur le canal du
-- destinataire. Factorise les triggers de generation.
CREATE OR REPLACE FUNCTION public.push_notification(
  p_recipient uuid,
  p_audience text,
  p_kind text,
  p_title text,
  p_payload jsonb,
  p_href text,
  p_order_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
  v_payload jsonb := COALESCE(p_payload, '{}'::jsonb);
BEGIN
  INSERT INTO public.notifications (
    recipient_id, audience, kind, title, payload, href, order_id
  ) VALUES (
    p_recipient, p_audience, p_kind, p_title, v_payload, p_href, p_order_id
  )
  RETURNING id INTO v_id;

  PERFORM realtime.publish(
    'user:' || p_recipient::text || ':notifications',
    'notification',
    jsonb_build_object(
      'id', v_id,
      'audience', p_audience,
      'kind', p_kind,
      'title', p_title,
      'payload', v_payload,
      'href', p_href,
      'orderId', p_order_id,
      'createdAt', now()
    )
  );

  RETURN v_id;
END;
$$;

-- Fonction sensible (insert arbitraire pour n'importe quel destinataire) :
-- accessible uniquement depuis les triggers ci-dessous, pas depuis la REST API.
REVOKE EXECUTE ON FUNCTION public.push_notification(uuid, text, text, text, jsonb, text, uuid)
  FROM anon, authenticated, PUBLIC;

-- Nouvelle commande -> notifie chaque admin (+ confirmation au client connecte).
CREATE OR REPLACE FUNCTION public.notify_order_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin uuid;
  v_email text := COALESCE(NEW.shipping_address->>'email', '');
BEGIN
  FOR v_admin IN SELECT user_id FROM public.profiles WHERE role = 'ADMIN' LOOP
    PERFORM public.push_notification(
      v_admin, 'ADMIN', 'order_created', NULL,
      jsonb_build_object('orderId', NEW.id, 'total', NEW.total, 'email', v_email),
      '/dashboard/orders', NEW.id
    );
  END LOOP;

  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.push_notification(
      NEW.user_id, 'CUSTOMER', 'order_confirmation', NULL,
      jsonb_build_object('orderId', NEW.id, 'total', NEW.total),
      '/account', NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_notify_created
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_created();

-- Changement de statut -> notifie le client + publie sur le canal commande.
CREATE OR REPLACE FUNCTION public.notify_order_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM realtime.publish(
    'order:' || NEW.id::text,
    'status_changed',
    jsonb_build_object(
      'id', NEW.id,
      'status', NEW.status,
      'updatedAt', NEW.updated_at
    )
  );

  IF NEW.user_id IS NOT NULL THEN
    PERFORM public.push_notification(
      NEW.user_id, 'CUSTOMER', 'order_status_changed', NULL,
      jsonb_build_object(
        'orderId', NEW.id,
        'status', NEW.status,
        'previousStatus', OLD.status
      ),
      '/account', NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_notify_status
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_order_status_changed();

-- Nouveau message de contact -> notifie chaque admin.
CREATE OR REPLACE FUNCTION public.notify_contact_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin uuid;
BEGIN
  FOR v_admin IN SELECT user_id FROM public.profiles WHERE role = 'ADMIN' LOOP
    PERFORM public.push_notification(
      v_admin, 'ADMIN', 'contact_message', NULL,
      jsonb_build_object('name', NEW.name, 'email', NEW.email, 'subject', NEW.subject),
      NULL, NULL
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER contact_messages_notify
  AFTER INSERT ON public.contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_contact_message();

-- Nouvel avis produit -> notifie chaque admin.
CREATE OR REPLACE FUNCTION public.notify_product_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin uuid;
BEGIN
  FOR v_admin IN SELECT user_id FROM public.profiles WHERE role = 'ADMIN' LOOP
    PERFORM public.push_notification(
      v_admin, 'ADMIN', 'product_review', NULL,
      jsonb_build_object('productId', NEW.product_id, 'rating', NEW.rating),
      NULL, NULL
    );
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE TRIGGER reviews_notify_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_product_review();
