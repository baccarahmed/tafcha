-- Journal et confirmations du bot Telegram.
--
-- La meme table sert deux besoins :
--  * porter une confirmation — le `callback_data` d'un bouton inline est limite
--    a 64 octets, donc la proposition d'action est persistee ici et le bouton
--    ne transporte que son id ; le webhook relit la ligne au clic, ce qui
--    permet aussi de verifier que le clic vient du bon chat ;
--  * journaliser — qui a demande quoi, quand, et avec quel resultat. C'est la
--    seule trace dont dispose l'exploitation, les boutons Telegram etant
--    ephemers.
--
-- Aucun acces client : la table n'est lue et ecrite que par le service role
-- (le Route Handler `/api/telegram`). RLS activee sans aucune policy, et
-- `REVOKE` explicite car les droits sont accordes table par table dans
-- `20261001133152_nova-district-grants.sql`.

CREATE TABLE IF NOT EXISTS public.telegram_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id bigint NOT NULL,
  -- Commande tapee par l'admin (`/ship ...`) : utile pour l'audit.
  command text NOT NULL,
  -- Cle du registre d'actions (`order.update`, `product.patch`, ...).
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Resume deja echappe, affiche tel quel dans la confirmation.
  summary text NOT NULL,
  danger text NOT NULL DEFAULT 'normal'
    CHECK (danger IN ('normal', 'destructive')),
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPLIED', 'CANCELLED', 'FAILED', 'EXPIRED')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_telegram_actions_created
  ON public.telegram_actions(created_at DESC);

-- Seules les propositions en attente sont relues par un id : index partiel.
CREATE INDEX IF NOT EXISTS idx_telegram_actions_pending
  ON public.telegram_actions(chat_id, created_at DESC)
  WHERE status = 'PENDING';

ALTER TABLE public.telegram_actions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.telegram_actions FROM anon, authenticated, PUBLIC;
