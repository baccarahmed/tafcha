CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);

CREATE INDEX idx_categories_position ON public.categories(position);

CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_active_featured ON public.products(active, featured);
CREATE INDEX idx_products_release_date ON public.products(release_date DESC);
CREATE INDEX idx_products_new_drop ON public.products(is_new_drop);

CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX idx_order_items_user_id ON public.order_items(user_id);

CREATE INDEX idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX idx_cart_items_session_id ON public.cart_items(session_id);

CREATE INDEX idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX idx_reviews_product_id ON public.reviews(product_id);

CREATE INDEX idx_promotions_active_dates ON public.promotions(active, start_date, end_date);

CREATE INDEX idx_contact_messages_handled ON public.contact_messages(handled, created_at DESC);