import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'tafchaa.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize tables
function initDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      firstName TEXT,
      lastName TEXT,
      role TEXT DEFAULT 'customer',
      phone TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      postalCode TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      image TEXT,
      position INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Ensure 'position' column exists for older DBs
  try {
    const info = db.prepare(`PRAGMA table_info(categories)`).all();
    const hasPosition = info.some(c => c.name === 'position');
    if (!hasPosition) {
      db.exec(`ALTER TABLE categories ADD COLUMN position INTEGER DEFAULT 0`);
    }
  } catch (e) {
    // ignore
  }

  // Products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      comparePrice REAL,
      stock INTEGER DEFAULT 0,
      sku TEXT UNIQUE,
      categoryId TEXT,
      images TEXT,
      featured BOOLEAN DEFAULT 0,
      active BOOLEAN DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    )
  `);

  // Orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      userId TEXT,
      status TEXT DEFAULT 'pending',
      total REAL NOT NULL,
      subtotal REAL NOT NULL,
      shipping REAL NOT NULL,
      tax REAL,
      shippingAddress TEXT,
      billingAddress TEXT,
      paymentMethod TEXT,
      paymentStatus TEXT DEFAULT 'pending',
      deliveryWindowStart TEXT,
      deliveryWindowEnd TEXT,
      deliveryProofUrl TEXT,
      notes TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);
  try {
    const info = db.prepare(`PRAGMA table_info(orders)`).all();
    const hasStart = info.some(c => c.name === 'deliveryWindowStart');
    const hasEnd = info.some(c => c.name === 'deliveryWindowEnd');
    const hasProof = info.some(c => c.name === 'deliveryProofUrl');
    if (!hasStart) {
      db.exec(`ALTER TABLE orders ADD COLUMN deliveryWindowStart TEXT`);
    }
    if (!hasEnd) {
      db.exec(`ALTER TABLE orders ADD COLUMN deliveryWindowEnd TEXT`);
    }
    if (!hasProof) {
      db.exec(`ALTER TABLE orders ADD COLUMN deliveryProofUrl TEXT`);
    }
  } catch (e) {}

  // Order items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      productId TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (orderId) REFERENCES orders(id),
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `);

  // Site settings table (for dynamic content)
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id TEXT PRIMARY KEY DEFAULT 'main',
      heroTitle TEXT DEFAULT 'Jewelries That Radiates Charm',
      heroSubtitle TEXT DEFAULT 'Discover elegant, one-of-a-kind jewelry crafted to elevate your everyday moments and unforgettable occasions.',
      heroVideo TEXT,
      heroImage TEXT,
      siteBgColor TEXT DEFAULT '#ffffffff',
      sitePanelColor TEXT DEFAULT '#ffffffff',
      featuredCategories TEXT,
      featuredLimit INTEGER DEFAULT 3,
      aboutText TEXT,
      contactEmail TEXT,
      contactPhone TEXT,
      contactAddress TEXT,
      socialInstagram TEXT,
      socialFacebook TEXT,
      socialTwitter TEXT,
      socialYoutube TEXT,
      newsletterEnabled BOOLEAN DEFAULT 1,
      maintenanceMode BOOLEAN DEFAULT 0,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Ensure new columns exist for older DBs
  try {
    const info = db.prepare(`PRAGMA table_info(site_settings)`).all();
    const hasSiteBg = info.some(c => c.name === 'siteBgColor');
    const hasFeatured = info.some(c => c.name === 'featuredCategories');
    const hasPanel = info.some(c => c.name === 'sitePanelColor');
    const hasLimit = info.some(c => c.name === 'featuredLimit');
    const hasAnimated = info.some(c => c.name === 'animatedBackground');
    const hasAnimatedBlur = info.some(c => c.name === 'animatedBlur');
    const hasFreeShip = info.some(c => c.name === 'freeShippingThresholdDNR');
    const hasShipCost = info.some(c => c.name === 'shippingCostDNR');
    const hasSmokey = info.some(c => c.name === 'smokeyColor');
    if (!hasSiteBg) {
      db.exec(`ALTER TABLE site_settings ADD COLUMN siteBgColor TEXT DEFAULT '#3d4d5d'`);
    }
    if (!hasFeatured) {
      db.exec(`ALTER TABLE site_settings ADD COLUMN featuredCategories TEXT`);
    }
    if (!hasPanel) {
      db.exec(`ALTER TABLE site_settings ADD COLUMN sitePanelColor TEXT DEFAULT '#2a3a4a'`);
    }
    if (!hasLimit) {
      db.exec(`ALTER TABLE site_settings ADD COLUMN featuredLimit INTEGER DEFAULT 3`);
    }
    if (!hasAnimated) {
      db.exec(`ALTER TABLE site_settings ADD COLUMN animatedBackground BOOLEAN DEFAULT 0`);
    }
    if (!hasAnimatedBlur) {
      db.exec(`ALTER TABLE site_settings ADD COLUMN animatedBlur TEXT DEFAULT 'sm'`);
    }
    if (!hasFreeShip) {
      db.exec(`ALTER TABLE site_settings ADD COLUMN freeShippingThresholdDNR REAL DEFAULT 100`);
    }
    if (!hasShipCost) {
      db.exec(`ALTER TABLE site_settings ADD COLUMN shippingCostDNR REAL DEFAULT 10`);
    }
    if (!hasSmokey) {
      db.exec(`ALTER TABLE site_settings ADD COLUMN smokeyColor TEXT`);
    }
  } catch (e) {
    // ignore
  }

  // Cart table (for persistent cart)
  db.exec(`
    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      userId TEXT,
      sessionId TEXT,
      productId TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `);

  // Reviews table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      productId TEXT NOT NULL,
      orderId TEXT,
      rating INTEGER NOT NULL,
      comment TEXT,
      imageUrl TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `);

  // Insert default admin user if not exists
  const adminExists = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@tafcha.com');
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT INTO users (id, email, password, firstName, lastName, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), 'admin@tafcha.com', hashedPassword, 'Admin', 'Tafchaa', 'admin');
    console.log('Default admin created: admin@tafcha.com / admin123');
  }

  // Insert default site settings if not exists
  const settingsExist = db.prepare('SELECT * FROM site_settings WHERE id = ?').get('main');
  if (!settingsExist) {
    db.prepare(`
      INSERT INTO site_settings (id, heroTitle, heroSubtitle, contactEmail, contactPhone, siteBgColor, sitePanelColor, featuredCategories, featuredLimit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'main',
      'Jewelries That Radiates Charm',
      'Discover elegant, one-of-a-kind jewelry crafted to elevate your everyday moments and unforgettable occasions.',
      'hello@tafcha.com',
      '+216 99 888 777',
      '#3d4d5d',
      '#2a3a4a',
      JSON.stringify([]),
      3
    );
  }

  // Insert default categories
  const categories = [
    { id: uuidv4(), name: 'Minimalist Elegance', slug: 'minimalist-elegance', description: 'Clean, simple designs for everyday wear' },
    { id: uuidv4(), name: 'Bridal Bliss', slug: 'bridal-bliss', description: 'Elegant pieces for your special day' },
    { id: uuidv4(), name: 'Timeless Classics', slug: 'timeless-classics', description: 'Vintage-inspired jewelry that never goes out of style' }
  ];

  categories.forEach(cat => {
    const exists = db.prepare('SELECT * FROM categories WHERE slug = ?').get(cat.slug);
    if (!exists) {
      db.prepare('INSERT INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)')
        .run(cat.id, cat.name, cat.slug, cat.description);
    }
  });

  console.log('Database initialized successfully');
}

initDatabase();

export default db;
