import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const SRC = 'public/images/q2m/logo q2m.png';
const SIZE = 64;

// Fond sombre de marque + logo negatif (traits clairs) pour rester lisible
// sur les onglets clairs comme sombres.
const bg = await sharp({
  create: {
    width: SIZE,
    height: SIZE,
    channels: 4,
    background: { r: 15, g: 15, b: 15, alpha: 1 },
  },
})
  .png()
  .toBuffer();

const logo = await sharp(SRC)
  .negate({ alpha: false })
  .resize(SIZE - 16, SIZE - 16, { fit: 'contain' })
  .png()
  .toBuffer();

const png = await sharp(bg)
  .composite([{ input: logo, gravity: 'centre' }])
  .png()
  .toBuffer();

// ICO (entree PNG, supportee depuis Vista).
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type icon
header.writeUInt16LE(1, 4); // count

const entry = Buffer.alloc(16);
entry.writeUInt8(SIZE, 0); // width (64)
entry.writeUInt8(SIZE, 1); // height
entry.writeUInt8(0, 2); // palette
entry.writeUInt8(0, 3); // reserved
entry.writeUInt16LE(1, 4); // planes
entry.writeUInt16LE(32, 6); // bpp
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(22, 12); // offset

await writeFile('src/app/favicon.ico', Buffer.concat([header, entry, png]));
await writeFile('src/app/icon.png', png);
console.log('favicon.ico + icon.png ecrits (' + png.length + ' octets)');
