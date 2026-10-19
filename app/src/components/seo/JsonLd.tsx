/**
 * Injecte une donnée structurée schema.org dans le HTML.
 * Composant serveur : le JSON est sérialisé au rendu, aucun JS client.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Durcissement pentest VULN-004 : JSON.stringify n'echappe pas `<`. Une
  // valeur contenant `</script><script>...` dans un champ serialise casserait
  // la balise et s'executerait. On remplace `<` par `\u003c` (equivalent JSON
  // valide) : le navigateur le re-decode a l'interieur du bloc de donnees, ou
  // il n'est jamais execute comme JS.
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  )
}