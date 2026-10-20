-- Double authentification (TOTP, RFC 6238) pour les comptes administrateurs.
-- Correction VULN-001 de l'audit de securite : aucun MFA sur le back-office.
--
-- Conception :
-- * `secret` (cle TOTP) n'est JAMAIS lisible avec un jeton utilisateur : la
--   table est entierement REVOKEe a anon/authenticated sans aucune policy,
--   seul le serveur (client admin, cle API) y accede. Un voleur de mot de
--   passe — qui dispose pourtant d'une session InsForge valide — ne peut donc
--   pas lire la cle pour fabriquer lui-meme des codes.
-- * `admin_mfa_sessions` trace les navigateurs qui ont reussi le TOTP. Le
--   cookie httpOnly `q2m_mfa` ne contient qu'un jeton aleatoire ; on ne stocke
--   que son hash SHA-256, jamais le jeton en clair.
-- * enabled=false = cle generée mais non confirmee (etape d'activation en
--   cours). Tant que enabled n'est pas true, aucun MFA n'est impose.

CREATE TABLE IF NOT EXISTS public.admin_mfa (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_mfa_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_mfa_sessions_expires
  ON public.admin_mfa_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_admin_mfa_sessions_user
  ON public.admin_mfa_sessions(user_id);

ALTER TABLE public.admin_mfa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_mfa_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_mfa FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.admin_mfa_sessions FROM anon, authenticated, PUBLIC;
