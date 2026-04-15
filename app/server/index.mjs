import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import prisma from './database/prisma.js';
import { fileURLToPath } from 'url';
import compression from 'compression';

// API Routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import userRoutes from './routes/users.js';
import orderRoutes from './routes/orders.js';
import settingsRoutes from './routes/settings.js';
import uploadRoutes from './routes/uploads.js';
import promotionRoutes from './routes/promotions.js';
import { addClient, removeClient } from './events.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize Vite or Static Middleware immediately
let vite;
if (!isProd) {
  vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });
} else {
  app.use(compression());
  app.use(express.static(path.resolve(__dirname, '../dist/client'), { index: false }));
}

// Static files for uploads
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/promotions', promotionRoutes);

// Vite middleware in dev
if (!isProd && vite) {
  app.use(vite.middlewares);
}

// SSE for order events
app.get('/api/orders/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write('retry: 5000\n\n');
  addClient(res);
  const keepAlive = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch {}
  }, 25000);
  req.on('close', () => {
    clearInterval(keepAlive);
    removeClient(res);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Sitemap generator
app.get('/sitemap.xml', async (req, res) => {
  try {
    const products = await prisma.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } });
    const categories = await prisma.category.findMany({ select: { slug: true, name: true } });
    const baseUrl = process.env.BASE_URL || 'https://tafchaa.com';

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
    xml += `  <url>\n    <loc>${baseUrl}</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

    categories.forEach(cat => {
      xml += `  <url>\n    <loc>${baseUrl}/shop/${cat.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    });

    products.forEach(prod => {
      const lastMod = prod.updatedAt.toISOString().split('T')[0];
      xml += `  <url>\n    <loc>${baseUrl}/product/${prod.slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    });

    xml += '</urlset>';
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).end();
  }
});

// SSR Middleware
app.use(async (req, res, next) => {
  const url = req.originalUrl;
  if (url.includes('.') || url.startsWith('/api/') || url.startsWith('/uploads/')) return next();
  
  try {
    let template, render;
    if (!isProd) {
      template = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render;
    } else {
      template = fs.readFileSync(path.resolve(__dirname, '../dist/client/index.html'), 'utf-8');
      const serverEntry = await import(path.resolve(__dirname, '../dist/server/entry-server.js'));
      render = serverEntry.render;
    }

    let preloadedData = {};
    try {
      preloadedData.settings = await prisma.siteSettings.findUnique({ where: { id: 'main' } });
      if (url.startsWith('/product/')) {
        const slug = url.split('/').pop();
        const product = await prisma.product.findUnique({ where: { slug }, include: { category: true } });
        if (product) {
          product.categoryName = product.category?.name;
          product.images = JSON.parse(product.images || '[]');
          preloadedData.product = product;
        }
      } else if (url.startsWith('/shop')) {
        preloadedData.categories = await prisma.category.findMany({ orderBy: { position: 'asc' } });
      }
    } catch (dbErr) {
      console.error('SSR Database pre-fetch error:', dbErr);
    }

    const { html: appHtml, helmet } = render(url, preloadedData);
    const html = template
      .replace(/<!--app-head-->/, (helmet?.title?.toString() || '') + (helmet?.meta?.toString() || ''))
      .replace(/<!--app-html-->/, () => `<script>window.__PRELOADED_DATA__ = ${JSON.stringify(preloadedData)}</script>${appHtml}`);

    res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
  } catch (e) {
    console.error(e.stack);
    res.status(500).end(e.stack);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
