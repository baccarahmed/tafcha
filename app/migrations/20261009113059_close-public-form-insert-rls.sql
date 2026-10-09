-- F-SPAM-1 (Moyenne) : ferme les INSERT REST publics sur les formulaires.
-- Constat du pentest : insforge accordait INSERT anon/authenticated sur
-- contact_messages et newsletter_subscribers (+ policies RLS a WITH CHECK true),
-- permettant de contourner le rate-limit applicatif (5/min) via REST direct.
--
-- Correctif : reveque l'INSERT pour anon/authenticated et retire les policies
-- d'insertion. L'app ecrit desormais via les server actions catalog.ts avec un
-- client project_admin (insforgeAdmin), insensible a ces revokes. Les lectures
-- restent reservees aux admins via les policies existantes (admin_read).

REVOKE INSERT ON public.contact_messages, public.newsletter_subscribers FROM anon, authenticated;

DROP POLICY IF EXISTS contact_messages_insert ON public.contact_messages;
DROP POLICY IF EXISTS newsletter_insert ON public.newsletter_subscribers;