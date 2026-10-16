import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

/**
 * Genere l'emblème circulaire de la marque a partir du logo carre sur fond noir.
 *
 * Le JPG fourni (1254x1254) est une marque centree sur un carre noir avec une
 * marge. On mesure la boite englobante de la marque, on recadre serre (marge
 * uniforme), on rend le tout circulaire (coins transparents) puis on ajoute un
 * fin liseré or. Résultat : un badge rond, fond noir réduit au minimum, qui se
 * compose proprement sur n'importe quel fond (chrome noir, surfaces thémées).
 *
 * Usage : node scripts/make-logo.mjs
 */
const SRC = 'public/images/q2m/logo q2m.jpg';
const OUT = 'public/images/q2m/logo-q2m-circle.png';
const SIZE = 512;
const GOLD = '#c9a45c';
const MARGIN_RATIO = 0.08;
const DIFF_THRESHOLD = 50;

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

// Le pixel de coin sert de reference de fond.
const bgR = data[0];
const bgG = data[1];
const bgB = data[2];

let minX = width;
let minY = height;
let maxX = 0;
let maxY = 0;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    const dr = data[i] - bgR;
    const dg = data[i + 1] - bgG;
    const db = data[i + 2] - bgB;
    if (dr * dr + dg * dg + db * db > DIFF_THRESHOLD * DIFF_THRESHOLD) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const boxW = maxX - minX + 1;
const boxH = maxY - minY + 1;
const margin = Math.round(Math.max(boxW, boxH) * MARGIN_RATIO);
const side = Math.min(Math.max(boxW, boxH) + margin * 2, Math.min(width, height));
const centerX = (minX + maxX) / 2;
const centerY = (minY + maxY) / 2;

const left = Math.round(Math.min(Math.max(centerX - side / 2, 0), width - side));
const top = Math.round(Math.min(Math.max(centerY - side / 2, 0), height - side));

const square = await sharp(SRC)
  .extract({ left, top, width: side, height: side })
  .resize(SIZE, SIZE, { fit: 'cover' })
  .png()
  .toBuffer();

const circleMask = Buffer.from(
  `<svg width="${SIZE}" height="${SIZE}"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="#ffffff"/></svg>`,
);

const ring = Buffer.from(
  `<svg width="${SIZE}" height="${SIZE}"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2 - 3}" fill="none" stroke="${GOLD}" stroke-width="6"/></svg>`,
);

const png = await sharp(square)
  .composite([
    { input: circleMask, blend: 'dest-in' },
    { input: ring, blend: 'over' },
  ])
  .png()
  .toBuffer();

await writeFile(OUT, png);
console.log(`logo circulaire ecrit : ${OUT} (${png.length} octets)`);
console.log(`boite marque ${boxW}x${boxH} @ (${minX},${minY}) -> recadre ${side}px`);
