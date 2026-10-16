-- Commande atomique : creation de la commande, de ses lignes et decrement des
-- stocks dans UNE seule transaction.
--
-- Avant, createOrderAction lisait le stock, le validait, inserait la commande
-- puis decroissait le stock en best-effort : deux checkouts concurrents
-- pouvaient lire le meme stock et le survendre (read-modify-write non atomique),
-- et une panne entre l'insert et le decrement laissait le stock non mis a jour.
--
-- Ici le SELECT ... FOR UPDATE verrouille la ligne produit : le second appel
-- attend, relit le stock decremente et refusera la commande si la quantite n'est
-- plus disponible. Toute RAISE EXCEPTION annule l'ensemble (commande, lignes et
-- decrements deja effectues), donc jamais de commande sans stock engage.
--
-- Les montants (sous-total, livraison, total) et les prix unitaires restent
-- calcules cote application (promotions incluses) : la fonction persiste et
-- verrouille, elle ne recalcule pas les prix.

CREATE OR REPLACE FUNCTION public.create_order_with_stock(
  p_user_id uuid,
  p_payment_method text,
  p_subtotal numeric,
  p_shipping numeric,
  p_tax numeric,
  p_total numeric,
  p_shipping_address jsonb,
  p_notes text,
  p_items jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_size text;
  v_stock integer;
  v_active boolean;
  v_sizes jsonb;
  v_size_stock integer;
  v_has_size boolean;
BEGIN
  IF p_items IS NULL
     OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'empty' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.orders (
    user_id, status, payment_status, payment_method,
    subtotal, shipping, tax, total, shipping_address, notes
  ) VALUES (
    p_user_id, 'PENDING', 'PENDING', p_payment_method,
    p_subtotal, p_shipping, p_tax, p_total, p_shipping_address, p_notes
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;
    v_size := NULLIF(btrim(v_item->>'size'), '');

    IF v_quantity IS NULL OR v_quantity < 1 THEN
      RAISE EXCEPTION 'invalid' USING ERRCODE = 'P0001';
    END IF;

    -- Verrou de ligne : serialise les commandes concurrentes sur le produit.
    SELECT stock, active, sizes
      INTO v_stock, v_active, v_sizes
      FROM public.products
      WHERE id = v_product_id
      FOR UPDATE;

    IF NOT FOUND OR v_active IS NOT TRUE THEN
      RAISE EXCEPTION 'unavailable' USING ERRCODE = 'P0001';
    END IF;

    IF v_stock < v_quantity THEN
      RAISE EXCEPTION 'outOfStock' USING ERRCODE = 'P0001';
    END IF;

    -- Rupture au niveau de la pointure demandee (si le produit en declare).
    IF v_size IS NOT NULL
       AND v_sizes IS NOT NULL
       AND jsonb_typeof(v_sizes) = 'array'
       AND jsonb_array_length(v_sizes) > 0 THEN
      SELECT (elem->>'stock')::integer
        INTO v_size_stock
        FROM jsonb_array_elements(v_sizes) AS elem
        WHERE (elem->>'size') = v_size
        LIMIT 1;

      v_has_size := FOUND;

      IF NOT v_has_size OR v_size_stock IS NULL OR v_size_stock < v_quantity THEN
        RAISE EXCEPTION 'outOfStock' USING ERRCODE = 'P0001';
      END IF;

      v_sizes := (
        SELECT jsonb_agg(
          CASE WHEN (elem->>'size') = v_size
            THEN jsonb_set(elem, '{stock}', to_jsonb(GREATEST(0, (elem->>'stock')::integer - v_quantity)))
            ELSE elem
          END)
        FROM jsonb_array_elements(v_sizes) AS elem
      );
    END IF;

    UPDATE public.products
      SET stock = GREATEST(0, v_stock - v_quantity),
          sizes = v_sizes,
          updated_at = now()
      WHERE id = v_product_id;

    INSERT INTO public.order_items (order_id, product_id, user_id, quantity, price, size)
      VALUES (
        v_order_id,
        v_product_id,
        p_user_id,
        v_quantity,
        (v_item->>'price')::numeric,
        v_size
      );
  END LOOP;

  RETURN v_order_id;
END;
$$;

-- Seul le client admin (project_admin, proprietaire de la fonction) doit
-- pouvoir creer une commande : on coupe l'acces public comme pour is_admin().
REVOKE EXECUTE ON FUNCTION public.create_order_with_stock(
  uuid, text, numeric, numeric, numeric, numeric, jsonb, text, jsonb
) FROM PUBLIC, anon, authenticated;
