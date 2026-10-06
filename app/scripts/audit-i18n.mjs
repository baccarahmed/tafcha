/**
 * Audit i18n : compare les cles utilisees dans le code aux cles livrees.
 *
 * Trois formes d'appel coexistent dans le projet :
 *   const t = useTranslations('home')
 *   const { tNav } = useTranslations('nav')
 *   const t = await getTranslations({ locale, namespace: 'drops' })
 *
 * On releve le namespace au point d'affectation, pas dans le fichier entier :
 * un fichier peut utiliser deux namespaces et une heuristique par fichier
 * attribuerait le mauvais a l'un des deux.
 *
 * Usage : node scripts/audit-i18n.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(ROOT, 'src')
const MESSAGES = join(ROOT, 'messages')
const LOCALES = ['fr', 'en', 'ar']

/** Repertoire un fichier .ts / .tsx. */
function walk(dir) {
  const out = []

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)

    if (statSync(full).isDirectory()) {
      out.push(...walk(full))
      continue
    }

    if (/\.tsx?$/.test(entry) && !entry.endsWith('.d.ts')) {
      out.push(full)
    }
  }

  return out
}

/**
 * Relit les affectations de traducteur et renvoie { nomVariable -> namespace }.
 */
function translators(source) {
  const found = new Map()

  // Cible = un identifiant ou un objet { a, b }, puis le namespace en position
  // d'argument direct ou via la propriete `namespace`.
  const assignment =
    /(?:const|let)\s+(\{[^}]+\}|[A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:use|get)Translations\(\s*(?:(['"])([\w.]+)\2|\{[^}]*?namespace:\s*(['"])([\w.]+)\4)/g

  for (const m of source.matchAll(assignment)) {
    const [, target, , directNs, , objectNs] = m
    const ns = directNs ?? objectNs
    if (!ns) continue

    const names =
      target.startsWith('{')
        ? target
            .slice(1, -1)
            .split(',')
            .map((part) => part.trim().split(/[:=]/)[0].trim())
            .filter(Boolean)
        : [target]

    for (const name of names) {
      if (name) found.set(name, ns)
    }
  }

  return found
}

const messages = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    JSON.parse(readFileSync(join(MESSAGES, `${locale}.json`), 'utf8')),
  ]),
)

/** Une cle est resolvable si elle aboutit a une chaine. */
function resolve(messagesTree, dottedKey) {
  return dottedKey
    .split('.')
    .reduce((node, part) => (node == null ? undefined : node[part]), messagesTree)
}

const missing = new Map()

for (const file of walk(SRC)) {
  const source = readFileSync(file, 'utf8')
  const rel = relative(ROOT, file)

  for (const [varName, ns] of translators(source)) {
    const uses = new RegExp(`\\b${varName}\\(\\s*(['"\`])((?:\\\\.|(?!\\1)[^\\\\])*)\\1`, 'g')

    for (const use of source.matchAll(uses)) {
      const key = use[2]
      // Cles dynamiques : le nom reel n'est connu qu'a l'execution.
      if (key.includes('${')) continue

      const absent = LOCALES.filter((locale) => {
        const value = resolve(messages[locale], `${ns}.${key}`)
        return typeof value !== 'string'
      })

      if (absent.length === 0) continue

      const id = `${ns}.${key}`

      if (!missing.has(id)) {
        missing.set(id, { ns, key, locales: new Set(), files: new Set() })
      }

      missing.get(id).locales = new Set([...missing.get(id).locales, ...absent])
      missing.get(id).files.add(rel)
    }
  }
}

if (missing.size === 0) {
  console.log('OK — aucune cle manquante.')
  process.exit(0)
}

const byNamespace = new Map()

for (const [id, info] of missing) {
  if (!byNamespace.has(info.ns)) byNamespace.set(info.ns, [])
  byNamespace.get(info.ns).push({ id, ...info })
}

console.log(`\n${missing.size} cle(s) manquante(s)\n`)

for (const [ns, items] of [...byNamespace].sort()) {
  console.log(`\x1b[1m${ns}  (${items.length})\x1b[0m`)

  for (const item of items.sort((a, b) => a.key.localeCompare(b.key))) {
    console.log(`  ${item.id}`)
    console.log(`    manquante(s) : ${[...item.locales].sort().join(', ')}`)
    console.log(`    utilisee(s) dans : ${[...item.files].join(', ')}`)
  }

  console.log('')
}
