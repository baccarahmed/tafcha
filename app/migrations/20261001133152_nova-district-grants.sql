REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.categories, public.products, public.site_settings, public.promotions, public.reviews TO anon, authenticated;

GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT INSERT ON public.newsletter_subscribers TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;

GRANT SELECT, INSERT ON public.profiles TO authenticated;
GRANT UPDATE (first_name, last_name, phone, address, city, country, postal_code) ON public.profiles TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.order_items TO authenticated;

GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;
GRANT SELECT, DELETE ON public.newsletter_subscribers TO authenticated;