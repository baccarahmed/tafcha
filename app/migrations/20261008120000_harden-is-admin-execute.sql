-- L'advisor signale public.is_admin() comme « dangerous-function » (SECURITY
-- DEFINER, callable par anon et authenticated).
--
-- Analyse : le SECURITY DEFINER est indispensable ici. is_admin() lit
-- public.profiles, dont la policy profiles_select_own appelle elle-meme
-- is_admin() ; en SECURITY INVOKER la lecture relancerait la policy et
-- provoquerait une recursion RLS. Et toutes les policies qui appellent
-- is_admin() sont `TO authenticated` (cf. 20261001133153_nova-district-rls.sql
-- et 20261007090000_restrict-order-writes.sql) : anon ne l'evalue jamais.
--
-- On retire donc l'EXECUTE a anon et a PUBLIC (grant implicite de PostgreSQL
-- sur toute fonction nouvelle), et on le garde pour authenticated, seul role
-- qui en a besoin. SECURITY DEFINER + search_path pinne restent en place,
-- conformement au pattern recommande pour les helpers RLS.

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
