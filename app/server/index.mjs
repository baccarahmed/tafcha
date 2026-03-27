import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import db from './database/db.js';
import { fileURLToPath } from 'url';
import compression from 'compression';

// API Routes
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import userRoutes from './routes/users.js';
import orderRoutes from './routes/orders.js';
import settingsRoutes from './routes/settings.js';
import uploadRoutes from './routes/uploads.js';
import { addClient, removeClient } from './events.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors());
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
  app.use(vite.middlewares);
} else {
  app.use(compression());
  app.use(express.static(path.resolve(__dirname, '../dist/client'), { index: false }));
}

// Static files for uploads (must be after headers middleware if any)
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/uploads', uploadRoutes);

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
app.get('/sitemap.xml', (req, res) => {
  try {
    const products = db.prepare('SELECT slug, updatedAt FROM products WHERE active = 1').all();
    const categories = db.prepare('SELECT slug FROM categories').all();
    const baseUrl = process.env.BASE_URL || 'https://tafcha.com';

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    const staticPages = ['', '/shop', '/about', '/contact'];
    staticPages.forEach(page => {
      xml += `  <url>\n    <loc>${baseUrl}${page}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${page === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
    });

    // Categories
    categories.forEach(cat => {
      xml += `  <url>\n    <loc>${baseUrl}/shop/${cat.slug}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    });

    // Products
    products.forEach(prod => {
      const lastMod = prod.updatedAt ? new Date(prod.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      xml += `  <url>\n    <loc>${baseUrl}/product/${prod.slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    });

    xml += '</urlset>';
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).end();
  }
});

// SSR Handler (exclude /api routes)
app.get(/^(?!\/api).*/, async (req, res) => {
  const url = req.originalUrl;
  console.log(`SSR request for URL: ${url}`);

  try {
    // Ensure vite is ready in dev
    if (!isProd && !vite) {
      await setupVite();
    }

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

    // Pre-fetch data for SSR
      let preloadedData = null;
      if (url.startsWith('/product/')) {
        const slug = url.split('/').pop();
        const product = db.prepare('SELECT * FROM products WHERE slug = ?').get(slug);
        if (product) {
          const category = db.prepare('SELECT name FROM categories WHERE id = ?').get(product.categoryId);
          product.categoryName = category?.name;
          product.images = JSON.parse(product.images || '[]');
          preloadedData = { product };
        }
      } else if (url.startsWith('/shop')) {
        const categories = db.prepare('SELECT * FROM categories ORDER BY position ASC').all();
        preloadedData = { categories };
      }

      const { html: appHtml, helmet } = render(url, preloadedData);
      console.log('SSR Render complete. URL:', url);
      
      const helmetTitle = helmet?.title?.toString() || '';
      const helmetMeta = helmet?.meta?.toString() || '';
      const helmetLink = helmet?.link?.toString() || '';
      const helmetScript = helmet?.script?.toString() || '';

      const html = template
        .replace(/<!--app-head-->/, helmetTitle + helmetMeta + helmetLink + helmetScript)
        .replace(/<!--app-html-->/, () => 
          `<script>window.__PRELOADED_DATA__ = ${JSON.stringify(preloadedData)}</script>${appHtml}`
        );

    res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
  } catch (e) {
    if (!isProd && vite) vite.ssrFixStacktrace(e);
    console.error(e.stack);
    res.status(500).end(e.stack);
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});

export default app;


