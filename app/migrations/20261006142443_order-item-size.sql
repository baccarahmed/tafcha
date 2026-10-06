-- Le panier distingue deux paires du meme modele par la taille : sans cette
-- colonne, la ligne de commande perd l'information dont l'expedition a besoin.
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS size text;
