import express from 'express';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// POST /api/uploads
// Body: { data: 'data:image/png;base64,...' } or { data: 'data:video/mp4;base64,...' }
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || typeof data !== 'string') {
      return res.status(400).json({ error: 'Invalid upload data' });
    }

    const imgMatch = data.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i);
    const vidMatch = data.match(/^data:(video\/mp4);base64,(.+)$/i);

    const uploadsDir = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    if (!imgMatch && !vidMatch) {
      return res.status(400).json({ error: 'Unsupported format. Only images (png,jpg,webp) and video/mp4 are accepted' });
    }

    // IMAGE PIPELINE
    if (imgMatch) {
      const b64 = imgMatch[3];
      let buffer;
      try {
        buffer = Buffer.from(b64, 'base64');
      } catch {
        return res.status(400).json({ error: 'Invalid base64 data' });
      }
      const base = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const outWebp = path.join(uploadsDir, `${base}.webp`);
      await sharp(buffer)
        .rotate()
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(outWebp);
      const url = `/uploads/${path.basename(outWebp)}`;
      return res.status(201).json({ url });
    }

    // VIDEO PIPELINE (mp4)
    if (vidMatch) {
      const b64 = vidMatch[2];
      let buffer;
      try {
        buffer = Buffer.from(b64, 'base64');
      } catch {
        return res.status(400).json({ error: 'Invalid base64 data' });
      }
      // Additional guard (express.json already limits to 25MB)
      if (buffer.length > 25 * 1024 * 1024) {
        return res.status(413).json({ error: 'Video too large (max 25MB)' });
      }
      const base = `vid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const outMp4 = path.join(uploadsDir, `${base}.mp4`);
      fs.writeFileSync(outMp4, buffer);
      const url = `/uploads/${path.basename(outMp4)}`;
      return res.status(201).json({ url });
    }

    return res.status(400).json({ error: 'Unsupported content' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Échec du téléversement' });
  }
});

export default router;
