-- Compteur de debit partage entre toutes les instances serverless.
-- Correction VULN-002 de l'audit de securite : le rate-limit etait en memoire
-- par instance, donc inoperant sur Vercel (chaque lambda a sa propre Map).
--
-- Un seul appel SQL atomique (`INSERT ... ON CONFLICT DO UPDATE ... RETURNING`)
-- compte la tentative et retourne la decision. Toutes les instances partagent
-- le meme compteur, avec une fenetre glissante par cle.
--
-- La table et la fonction sont inaccessibles a anon/authenticated : le
-- rate-limit est appele uniquement cote serveur via le client admin (comme
-- create_order_with_stock). Sans EXECUTE, un attaquant ne peut pas creer de
-- lignes arbitraires ni observer les cles (qui contiennent des e-mails).
--
-- Nettoyage : ~2 % des appels purgent les fenetres expirees depuis plus d'un
-- jour, ce qui borne la taille de la table.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text PRIMARY KEY,
  hits integer NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.rate_limits FROM anon, authenticated, PUBLIC;

CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  p_key text,
  p_max integer,
  p_window_ms integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hits integer;
  v_start timestamptz;
  v_now timestamptz := now();
  v_window_end timestamptz;
  v_window_sec double precision := p_window_ms::double precision / 1000.0;
BEGIN
  IF p_key IS NULL OR length(p_key) = 0 OR length(p_key) > 200 THEN
    RAISE EXCEPTION 'invalid' USING ERRCODE = 'P0001';
  END IF;
  IF p_max IS NULL OR p_max < 1 OR p_window_ms IS NULL
     OR p_window_ms < 1000 OR p_window_ms > 86400000 THEN
    RAISE EXCEPTION 'invalid' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.rate_limits (key, hits, window_start)
  VALUES (p_key, 1, v_now)
  ON CONFLICT (key) DO UPDATE
    SET hits = CASE
          WHEN public.rate_limits.window_start + make_interval(secs => v_window_sec) <= v_now
          THEN 1
          ELSE public.rate_limits.hits + 1
        END,
        window_start = CASE
          WHEN public.rate_limits.window_start + make_interval(secs => v_window_sec) <= v_now
          THEN v_now
          ELSE public.rate_limits.window_start
        END
  RETURNING hits, window_start INTO v_hits, v_start;

  v_window_end := v_start + make_interval(secs => v_window_sec);

  -- Purge best-effort des fenetres expirees (borne la croissance).
  IF random() < 0.02 THEN
    DELETE FROM public.rate_limits
    WHERE window_start < v_now - interval '1 day';
  END IF;

  IF v_hits > p_max THEN
    RETURN jsonb_build_object(
      'ok', false,
      'remaining', 0,
      'retryAfter',
        GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_window_end - v_now))))::integer
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'remaining', GREATEST(0, p_max - v_hits),
    'retryAfter', 0
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rate_limit_hit(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
