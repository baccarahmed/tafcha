import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

// Emblème circulaire de marque : badge noir + liseré or, coins transparents.
// Un seul asset pour toute la plateforme (onglet, icônes, OG, UI).
const SRC = 'public/images/q2m/logo-q2m-circle.png';
const SIZE = 64;
const APPLE_SIZE = 180;
const BG = '#090909';

const png = await sharp(SRC)
  .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
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

// Apple touch icon : fond opaque (iOS masque lui-meme les angles).
const apple = await sharp(SRC)
  .resize(APPLE_SIZE, APPLE_SIZE, { fit: 'contain', background: BG })
  .flatten({ background: BG })
  .png()
  .toBuffer();
await writeFile('src/app/apple-icon.png', apple);

console.log(
  'favicon.ico + icon.png + apple-icon.png ecrits (' + png.length + ' / ' + apple.length + ' octets)',
);
