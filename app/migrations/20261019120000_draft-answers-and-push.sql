-- 1. Réponses collectées dans le formulaire produit interactif.
--
-- L'IA analyse la photo puis le bot pose des questions (prix, pointures,
-- catégorie). Les réponses sont stockées ici, champ par champ, jusqu'à ce
-- que le brouillon soit complet.

ALTER TABLE public.telegram_product_drafts
  ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Abonnements push navigateur (PWA installée en raccourci sur téléphone).
--
-- Le dashboard enregistre l'abonnement Push du navigateur ; à chaque nouvelle
-- commande le serveur envoie une notification push à tous les abonnements.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.push_subscriptions FROM anon, authenticated, PUBLIC;
