import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../database/prisma.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Helper to apply promotions to products
const applyPromotions = async (products) => {
  const now = new Date();
  const activePromotions = await prisma.promotion.findMany({
    where: {
      active: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });

  activePromotions.forEach(p => {
    try {
      p.targets = JSON.parse(p.targets);
    } catch {
      p.targets = [];
    }
  });

  const productArray = Array.isArray(products) ? products : [products];

  productArray.forEach(product => {
    const applicablePromos = activePromotions.filter(promo => {
      if (promo.type === 'CATEGORY') {
        return promo.targets.includes(product.categoryId);
      } else if (promo.type === 'PRODUCT') {
        return promo.targets.includes(product.id);
      }
      return false;
    });

    if (applicablePromos.length > 0) {
      const bestPromo = applicablePromos.reduce((prev, current) => (prev.percentage > current.percentage) ? prev : current);
      
      if (!product.comparePrice || product.comparePrice < product.price) {
        product.comparePrice = product.price;
      }
      
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
router.get('/', async (req, res) => {
  try {
    const { category, featured, search, limit = 50, offset = 0 } = req.query;
    
    const where = { active: true };

    if (category) {
      where.category = { slug: category };
    }

    if (featured === 'true') {
      where.featured = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    // Flatten category info to match old structure
    const formattedProducts = products.map(p => ({
      ...p,
      categoryName: p.category?.name,
      categorySlug: p.category?.slug,
      images: p.images ? JSON.parse(p.images) : [],
    }));

    await applyPromotions(formattedProducts);

    res.json({ products: formattedProducts });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get categories (ordered)
router.get('/categories/all', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: [
        { position: 'asc' },
        { name: 'asc' },
      ],
    });
    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single product
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const product = await prisma.product.findUnique({
      where: { slug, active: true },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const formattedProduct = {
      ...product,
      categoryName: product.category?.name,
      categorySlug: product.category?.slug,
      images: product.images ? JSON.parse(product.images) : [],
    };

    await applyPromotions(formattedProduct);

    res.json({ product: formattedProduct });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
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
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const existing = await prisma.product.findUnique({ where: { slug: baseSlug } });
    const finalSlug = existing ? `${baseSlug}-${Date.now()}` : baseSlug;

    const product = await prisma.product.create({
      data: {
        id,
        name,
        slug: finalSlug,
        description,
        price: parseFloat(price),
        comparePrice: comparePrice ? parseFloat(comparePrice) : null,
        stock: parseInt(stock) || 0,
        sku,
        categoryId,
        images: images ? JSON.stringify(images) : null,
        featured: !!featured,
      },
    });

    res.status(201).json({ message: 'Product created', product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update product (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const data = {};
    if (updates.name !== undefined) {
      data.name = updates.name;
      data.slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.price !== undefined) data.price = parseFloat(updates.price);
    if (updates.comparePrice !== undefined) data.comparePrice = updates.comparePrice ? parseFloat(updates.comparePrice) : null;
    if (updates.stock !== undefined) data.stock = parseInt(updates.stock);
    if (updates.sku !== undefined) data.sku = updates.sku;
    if (updates.categoryId !== undefined) data.categoryId = updates.categoryId;
    if (updates.images !== undefined) data.images = JSON.stringify(updates.images);
    if (updates.featured !== undefined) data.featured = !!updates.featured;
    if (updates.active !== undefined) data.active = !!updates.active;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data,
    });

    res.json({ message: 'Product updated', product: updatedProduct });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete product (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.product.update({
      where: { id },
      data: { active: false },
    });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create category (admin only)
router.post('/categories', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Collection name is required' });
    
    const baseSlug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const exists = await prisma.category.findUnique({ where: { slug: baseSlug } });
    const slug = exists ? `${baseSlug}-${Date.now()}` : baseSlug;
    
    const maxPos = await prisma.category.aggregate({ _max: { position: true } });
    const position = (maxPos._max.position ?? -1) + 1;

    const category = await prisma.category.create({
      data: {
        id: uuidv4(),
        name,
        slug,
        description,
        position,
      },
    });

    res.status(201).json({ message: 'Category created', category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
