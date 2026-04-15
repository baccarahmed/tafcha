import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../database/prisma.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all promotions (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const promotions = await prisma.promotion.findMany({ orderBy: { createdAt: 'desc' } });
    const formatted = promotions.map(p => ({
      ...p,
      targets: p.targets ? JSON.parse(p.targets) : []
    }));
    res.json({ promotions: formatted });
  } catch (error) {
    console.error('Get promotions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get active promotions (public)
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
    
    const formatted = promotions.map(p => ({
      ...p,
      targets: p.targets ? JSON.parse(p.targets) : []
    }));
    
    res.json({ promotions: formatted });
  } catch (error) {
    console.error('Get active promotions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create promotion (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name, description, type, targets, percentage, startDate, endDate, announcementText, active
    } = req.body;

    if (!name || !type || !targets || !percentage || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const promotion = await prisma.promotion.create({
      data: {
        id: uuidv4(),
        name,
        description,
        type: type.toUpperCase(),
        targets: JSON.stringify(targets),
        percentage: parseFloat(percentage),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        announcementText,
        active: active !== undefined ? !!active : true
      },
    });

    res.status(201).json({ message: 'Promotion created', promotion });
  } catch (error) {
    console.error('Create promotion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update promotion (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const data = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.type !== undefined) data.type = updates.type.toUpperCase();
    if (updates.targets !== undefined) data.targets = JSON.stringify(updates.targets);
    if (updates.percentage !== undefined) data.percentage = parseFloat(updates.percentage);
    if (updates.startDate !== undefined) data.startDate = new Date(updates.startDate);
    if (updates.endDate !== undefined) data.endDate = new Date(updates.endDate);
    if (updates.announcementText !== undefined) data.announcementText = updates.announcementText;
    if (updates.active !== undefined) data.active = !!updates.active;

    const updated = await prisma.promotion.update({
      where: { id },
      data,
    });

    res.json({ message: 'Promotion updated', promotion: updated });
  } catch (error) {
    console.error('Update promotion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete promotion (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.promotion.delete({ where: { id } });
    res.json({ message: 'Promotion deleted' });
  } catch (error) {
    console.error('Delete promotion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
