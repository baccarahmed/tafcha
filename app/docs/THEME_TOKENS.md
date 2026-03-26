# Theme Tokens

- --site-bg: Couleur de fond globale du site (Admin → Settings → “Couleur de fond du site”).
- --panel-bg: Couleur de fond des panneaux, cartes, menus (Admin → Settings → “Couleur de fond des panneaux”).

## Bonnes pratiques

- Utiliser `bg-[--site-bg]` pour les sections “plein écran” ou les surfaces de page.
- Utiliser `bg-[--panel-bg]` pour les widgets, cartes, panneaux, menus et en-têtes.
- Pour les overlays/gradients, préférer `var(--site-bg)` dans les styles inline si nécessaire.

## Exemples

- Sections: `<section className="bg-[--site-bg]">...`
- Cartes: `<div className="bg-[--panel-bg]">...`
- Dégradés: `style={{ background: \`linear-gradient(to top, var(--site-bg) 0%, ...)\` }}`
