-- F-STORE-1 (HAUTE) : ferme les ecritures storage pour anon/authenticated.
-- Constat du pentest : storage.objects sans RLS (relrowsecurity=false, 0 police)
-- permettait a tout utilisateur authentifie (CUSTOMER lambda) de creer un objet
-- publiquement lisible dans le bucket product-images.
--
-- Correctif : active RLS, ne laisse AUCUNE police INSERT/UPDATE/DELETE pour
-- anon/authenticated (default-deny), et n'autorise qu'une lecture publique sur
-- le bucket product-images. Les telechargements directs d'un bucket public sont
-- servis avec acces root (bypass RLS) par conception ; la police SELECT couvre
-- les requetes list/metadata via le user API.
--
-- Les workflows admin (client project_admin/apiKey) contournent RLS et restent
-- fonctionnels pour l'administration des images produits.

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS storage_objects_owner_select ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_insert ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_update ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_delete ON storage.objects;

CREATE POLICY storage_objects_public_read ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (bucket = 'product-images');

GRANT SELECT ON storage.objects TO anon, authenticated;
GRANT USAGE ON SCHEMA storage TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON storage.objects FROM anon, authenticated;