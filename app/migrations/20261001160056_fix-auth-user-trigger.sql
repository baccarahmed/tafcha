-- InsForge stores sign-up metadata in auth.users.profile (jsonb), not in a
-- raw_user_meta_data column. The original trigger referenced the Supabase column
-- name, which made every sign-up fail with
-- `record "new" has no field "raw_user_meta_data"`.
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

  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.profile ->> 'first_name',
      (regexp_match(full_name, '^(\S+)'))[1]
    ),
    COALESCE(
      NEW.profile ->> 'last_name',
      NULLIF((regexp_match(full_name, '^\S+\s+(.+)$'))[1], '')
    )
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$fn$;