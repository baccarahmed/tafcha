// Génère les icônes PWA (192, 512, maskable) à partir du favicon SVG.
// Usage : node scripts/gen-pwa-icons.mjs
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const SVG = await import('node:fs').then((fs) =>
  fs.readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
)

const OUT = new URL('../public/icons/', import.meta.url)
await mkdir(OUT, { recursive: true })

const svgBuf = Buffer.from(SVG)

// Icônes pleines (fond transparent conservé du SVG).
await sharp(svgBuf, { density: 300 })
  .resize(192, 192)
  .png()
  .toFile(fileURLToPath(new URL('icon-192.png', OUT)))

await sharp(svgBuf, { density: 300 })
  .resize(512, 512)
  .png()
  .toFile(fileURLToPath(new URL('icon-512.png', OUT)))

// Icône maskable : le logo recentré sur un fond plein, avec zone de sécurité
// (padding ~20 %) pour que le système d'exploitation ne rogne pas le logo.
const inner = await sharp(svgBuf, { density: 300 })
  .resize(320, 320)
  .png()
  .toBuffer()

await sharp({
  create: { width: 512, height: 512, channels: 4, background: '#3d4d5d' },
})
  .composite([{ input: inner, gravity: 'centre' }])
  .png()
  .toFile(fileURLToPath(new URL('icon-maskable-512.png', OUT)))

console.log('PWA icons generated in public/icons/')
