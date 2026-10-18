-- Brouillons de produits IA en attente de confirmation Telegram.
--
-- L'admin envoie une photo au bot, l'IA analyse et remplit un brouillon,
-- le bot envoie le formulaire à Telegram, et l'admin confirme ou annule.
-- Le brouillon est stocké ici avec son statut.

CREATE TABLE IF NOT EXISTS public.telegram_product_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id bigint NOT NULL,
  -- URL de l'image uploadée dans le storage
  image_url text NOT NULL,
  -- Brouillon IA (ProductDraft sérialisé)
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Référence produit créée après confirmation
  product_id uuid,
  product_slug text,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_telegram_product_drafts_pending
  ON public.telegram_product_drafts(chat_id, created_at DESC)
  WHERE status = 'PENDING';

ALTER TABLE public.telegram_product_drafts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.telegram_product_drafts FROM anon, authenticated, PUBLIC;

-- Confirmations de commandes en attente.
--
-- Chaque nouvelle commande crée une entrée ici. Le bot envoie un message
-- Telegram avec les détails de la commande et des boutons Confirmer/Annuler.
-- Si l'admin confirme, les coordonnées du client sont envoyées en message.

CREATE TABLE IF NOT EXISTS public.telegram_order_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  chat_id bigint NOT NULL,
  -- Coordonnées du client (envoyées après confirmation)
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_address text,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_telegram_order_confirmations_pending
  ON public.telegram_order_confirmations(order_id, created_at DESC)
  WHERE status = 'PENDING';

ALTER TABLE public.telegram_order_confirmations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.telegram_order_confirmations FROM anon, authenticated, PUBLIC;
