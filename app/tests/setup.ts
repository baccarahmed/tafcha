// Variables d'environnement de test : evite qu'un module serveur lance une
// erreur de configuration a l'import. Aucun appel reseau n'est effectue.
process.env.NEXT_PUBLIC_INSFORGE_URL ??= 'http://localhost:0'
process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ??= 'test-anon'
process.env.INSFORGE_URL ??= 'http://localhost:0'
process.env.INSFORGE_API_KEY ??= 'test-admin'
