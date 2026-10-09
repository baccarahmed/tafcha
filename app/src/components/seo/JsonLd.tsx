/**
 * Injecte une donnée structurée schema.org dans le HTML.
 * Composant serveur : le JSON est sérialisé au rendu, aucun JS client.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}