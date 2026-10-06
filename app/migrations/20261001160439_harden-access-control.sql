-- InsForge grants anon/authenticated blanket DML on public tables. RLS was the only
-- thing stopping writes, so any missing policy would have become a full write hole.
-- Reset the ACL to the exact surface the app needs. Admin flows go through
-- createAdminClient (project_admin), which is unaffected by these revokes.

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Public catalogue: readable by everyone.
GRANT SELECT ON public.categories, public.products, public.promotions, public.site_settings
  TO anon, authenticated;

-- Public forms: writable by anyone, readable only by admins (RLS enforces the read side).
GRANT INSERT ON public.contact_messages, public.newsletter_subscribers
  TO anon, authenticated;

-- Reviews: public read, owner write.
GRANT INSERT, UPDATE ON public.reviews TO authenticated;

-- Profiles: owner reads and edits their own row. role, id, user_id and timestamps
-- stay off the grant list so a customer can never mint themselves an admin row.
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT (user_id, first_name, last_name, phone, address, city, country, postal_code)
  ON public.profiles TO authenticated;
GRANT UPDATE (first_name, last_name, phone, address, city, country, postal_code)
  ON public.profiles TO authenticated;

-- Commerce rows: owner access only, admin access comes from the project_admin client.
GRANT SELECT, INSERT, UPDATE ON public.orders, public.order_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;

-- profiles_insert_own allowed any role value; pin it so the INSERT grant above
-- cannot be used for privilege escalation.
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND role = 'CUSTOMER');

DROP POLICY IF EXISTS reviews_insert_own ON public.reviews;
CREATE POLICY reviews_insert_own ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));