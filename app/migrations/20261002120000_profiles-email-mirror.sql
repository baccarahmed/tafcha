-- Le back-office doit afficher l'adresse des comptes, mais public.profiles ne
-- portait que le user_id : aucune colonne email, et auth.users n'est pas exposé
-- par la couche REST publique. On denormalise donc l'email dans profiles et on
-- l'entretient depuis auth.users.
--
-- Objectif de sécurité : la colonne reste en lecture seule pour les clients.
-- Elle n'est ni dans le GRANT INSERT ni dans le GRANT UPDATE de
-- harden-access-control.sql, donc un utilisateur authentifié ne peut ni la
-- fournir a l'inscription ni la modifier apres coup.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

-- Remplissage initial.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.user_id
  AND p.email IS DISTINCT FROM u.email;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_key
  ON public.profiles (email)
  WHERE email IS NOT NULL;

-- Entretien : creation, puis changement d'adresse.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $fn$
DECLARE
  full_name text;
BEGIN
  full_name := COALESCE(NULLIF(NEW.profile ->> 'name', ''), split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.profile ->> 'first_name',
      (regexp_match(full_name, '^(\S+)'))[1]
    ),
    COALESCE(
      NEW.profile ->> 'last_name',
      NULLIF((regexp_match(full_name, '^\S+\s+(.+)$'))[1], '')
    )
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();

  RETURN NEW;
END;
$fn$;

-- Un trigger distinct pour les mises a jour d'email : AFTER INSERT ne se
-- rejoue pas quand l'utilisateur change d'email.
--
-- CREATE OR REPLACE TRIGGER et non DROP + CREATE : le role qui applique les
-- migrations (project_admin) n'est pas proprietaire de auth.users, et DROP
-- TRIGGER exige la propriete de la table alors que CREATE TRIGGER se contente
-- du privilege TRIGGER.
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $fn$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email,
      updated_at = now()
  WHERE user_id = NEW.id
    AND email IS DISTINCT FROM NEW.email;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email();
