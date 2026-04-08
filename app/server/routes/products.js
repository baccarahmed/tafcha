import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Helper to apply promotions to products
const applyPromotions = (products) => {
  const now = new Date().toISOString();
  const activePromotions = db.prepare(`
    SELECT * FROM promotions 
    WHERE active = 1 
    AND startDate <= ? 
    AND endDate >= ?
  `).all(now, now);

  activePromotions.forEach(p => {
    try {
      p.targets = JSON.parse(p.targets);
    } catch {
      p.targets = [];
    }
  });

  const productArray = Array.isArray(products) ? products : [products];

  productArray.forEach(product => {
    // Find applicable promotions
    const applicablePromos = activePromotions.filter(promo => {
      if (promo.type === 'category') {
        return promo.targets.includes(product.categoryId);
      } else if (promo.type === 'product') {
        return promo.targets.includes(product.id);
      }
      return false;
    });

    if (applicablePromos.length > 0) {
      // Use the best promotion (highest percentage)
      const bestPromo = applicablePromos.reduce((prev, current) => (prev.percentage > current.percentage) ? prev : current);
      
      // Store original price in comparePrice if not already there or if it's smaller
      if (!product.comparePrice || product.comparePrice < product.price) {
        product.comparePrice = product.price;
      }
      
      // Calculate discounted price
      product.price = Math.round(product.price * (1 - bestPromo.percentage / 100));
      product.activePromotion = {
        id: bestPromo.id,
        name: bestPromo.name,
        percentage: bestPromo.percentage,
        endDate: bestPromo.endDate
      };
    }
  });

  return products;
};

// Get all products
router.get('/', (req, res) => {
  try {
    const { category, featured, search, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT p.*, c.name as categoryName, c.slug as categorySlug
      FROM products p
      LEFT JOIN categories c ON p.categoryId = c.id
      WHERE p.active = 1
    `;
    const params = [];

    if (category) {
      query += ' AND c.slug = ?';
      params.push(category);
    }

    if (featured === 'true') {
      query += ' AND p.featured = 1';
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY p.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const products = db.prepare(query).all(...params);

    // Apply promotions
    applyPromotions(products);

    // Parse images JSON
    products.forEach(p => {
      if (p.images) {
        try {
          p.images = JSON.parse(p.images);
        } catch {
          p.images = [p.images];
        }
      } else {
        p.images = [];
      }
    });

    res.json({ products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get categories (ordered)
router.get('/categories/all', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY position ASC, name ASC').all();
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single product
router.get('/:slug', (req, res) => {
  try {
    const { slug } = req.params;
    
    const product = db.prepare(`
      SELECT p.*, c.name as categoryName, c.slug as categorySlug
      FROM products p
      LEFT JOIN categories c ON p.categoryId = c.id
      WHERE p.slug = ? AND p.active = 1
    `).get(slug);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Apply promotions
    applyPromotions(product);

    // Parse images JSON
    if (product.images) {
      try {
        product.images = JSON.parse(product.images);
      } catch {
        product.images = [product.images];
      }
    } else {
      product.images = [];
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product (admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const {
      name,
      description,
      price,
      comparePrice,
      stock,
      sku,
      categoryId,
      images,
      featured
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const id = uuidv4();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if slug exists
    const existing = db.prepare('SELECT * FROM products WHERE slug = ?').get(slug);
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

    db.prepare(`
      INSERT INTO products (id, name, slug, description, price, comparePrice, stock, sku, categoryId, images, featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      finalSlug,
      description || null,
      price,
      comparePrice || null,
      stock || 0,
      sku || null,
      categoryId || null,
      images ? JSON.stringify(images) : null,
      featured ? 1 : 0
    );

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.status(201).json({ message: 'Product created', product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Build update query dynamically
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
      
      // Update slug if name changes
      const newSlug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      fields.push('slug = ?');
      values.push(newSlug);
    }

    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }

    if (updates.price !== undefined) {
      fields.push('price = ?');
      values.push(updates.price);
    }

    if (updates.comparePrice !== undefined) {
      fields.push('comparePrice = ?');
      values.push(updates.comparePrice);
    }

    if (updates.stock !== undefined) {
      fields.push('stock = ?');
      values.push(updates.stock);
    }

    if (updates.sku !== undefined) {
      fields.push('sku = ?');
      values.push(updates.sku);
    }

    if (updates.categoryId !== undefined) {
      fields.push('categoryId = ?');
      values.push(updates.categoryId);
    }

    if (updates.images !== undefined) {
      fields.push('images = ?');
      values.push(JSON.stringify(updates.images));
    }

    if (updates.featured !== undefined) {
      fields.push('featured = ?');
      values.push(updates.featured ? 1 : 0);
    }

    if (updates.active !== undefined) {
      fields.push('active = ?');
      values.push(updates.active ? 1 : 0);
    }

    fields.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);

    const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json({ message: 'Product updated', product: updatedProduct });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Soft delete
    db.prepare('UPDATE products SET active = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create category (admin only)
router.post('/categories', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Nom de collection requis' });
    }
    const baseSlug = String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slug = baseSlug || `cat-${Date.now()}`;
    const exists = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
    if (exists) slug = `${baseSlug}-${Date.now()}`;
    const posRow = db.prepare('SELECT MAX(position) as maxp FROM categories').get();
    const position = (posRow?.maxp ?? -1) + 1;
    const id = uuidv4();
    db.prepare('INSERT INTO categories (id, name, slug, description, position) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, slug, description || null, position);
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.status(201).json({ message: 'Catégorie créée', category: cat });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Category details with products (admin only)
router.get('/categories/:id/details', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });
    const products = db.prepare(`
      SELECT id, name, slug, price, images
      FROM products
      WHERE categoryId = ?
      ORDER BY name ASC
    `).all(id).map(p => {
      let image;
      if (p.images) {
        try {
          const arr = JSON.parse(p.images);
          image = Array.isArray(arr) ? arr[0] : p.images;
        } catch {
          image = p.images;
        }
      }
      return { id: p.id, name: p.name, slug: p.slug, price: p.price, image };
    });
    res.json({ category: cat, products });
  } catch (error) {
    console.error('Get category details error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update category image (admin only)
router.put('/categories/:id/image', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'Image URL manquante' });
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });
    db.prepare('UPDATE categories SET image = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run(image, id);
    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json({ message: 'Image de catégorie mise à jour', category: updated });
  } catch (error) {
    console.error('Update category image error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update category (name/description)
router.put('/categories/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });
    const fields = [];
    const values = [];
    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
      // update slug to reflect name change
      const baseSlug = String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let slug = baseSlug || `cat-${Date.now()}`;
      const exists = db.prepare('SELECT id FROM categories WHERE slug = ? AND id != ?').get(slug, id);
      if (exists) slug = `${baseSlug}-${Date.now()}`;
      fields.push('slug = ?');
      values.push(slug);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description || null);
    }
    fields.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);
    db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json({ message: 'Catégorie mise à jour', category: updated });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Delete category (relink products)
router.delete('/categories/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!cat) return res.status(404).json({ error: 'Catégorie introuvable' });
    const tx = db.transaction((cid) => {
      db.prepare('UPDATE products SET categoryId = NULL, updatedAt = CURRENT_TIMESTAMP WHERE categoryId = ?').run(cid);
      db.prepare('DELETE FROM categories WHERE id = ?').run(cid);
    });
    tx(id);
    res.json({ message: 'Catégorie supprimée' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Update categories order (admin only)
router.put('/categories/order', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { order } = req.body; // array of category ids in desired order
    if (!Array.isArray(order)) return res.status(400).json({ error: 'Ordre invalide' });
    const update = db.prepare('UPDATE categories SET position = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?');
    const txn = db.transaction((ids) => {
      ids.forEach((id, index) => update.run(index, id));
    });
    txn(order);
    const categories = db.prepare('SELECT * FROM categories ORDER BY position ASC, name ASC').all();
    res.json({ message: 'Ordre des catégories mis à jour', categories });
  } catch (error) {
    console.error('Update categories order error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Product reviews
router.get('/reviews/:productId', (req, res) => {
  try {
    const { productId } = req.params;
    const reviews = db.prepare(`
      SELECT r.id, r.userId, r.productId, r.rating, r.comment, r.imageUrl, r.createdAt,
             u.firstName, u.lastName
      FROM reviews r
      LEFT JOIN users u ON r.userId = u.id
      WHERE r.productId = ?
      ORDER BY r.createdAt DESC
      LIMIT 100
    `).all(productId);
    res.json({ reviews });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reviews/:productId', authenticateToken, (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment, imageUrl, orderId } = req.body;
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) {
      return res.status(400).json({ error: 'Invalid rating' });
    }
    // Ensure user purchased this product and order is completed
    const owned = db.prepare(`
      SELECT 1
      FROM order_items oi
      JOIN orders o ON oi.orderId = o.id
      WHERE o.userId = ? AND oi.productId = ? AND o.status = 'completed'
      LIMIT 1
    `).get(req.user.id, productId);
    if (!owned) {
      return res.status(403).json({ error: 'You can only review purchased items' });
    }
    const id = uuidv4();
    db.prepare(`
      INSERT INTO reviews (id, userId, productId, orderId, rating, comment, imageUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, productId, orderId || null, r, comment || null, imageUrl || null);
    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
    res.status(201).json({ message: 'Review added', review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
