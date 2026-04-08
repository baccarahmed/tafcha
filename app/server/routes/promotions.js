import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all promotions (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const promotions = db.prepare('SELECT * FROM promotions ORDER BY createdAt DESC').all();
    promotions.forEach(p => {
      try {
        p.targets = JSON.parse(p.targets);
      } catch {
        p.targets = [];
      }
    });
    res.json({ promotions });
  } catch (error) {
    console.error('Get promotions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get active promotions (public)
router.get('/active', (req, res) => {
  try {
    const now = new Date().toISOString();
    const promotions = db.prepare(`
      SELECT * FROM promotions 
      WHERE active = 1 
      AND startDate <= ? 
      AND endDate >= ?
    `).all(now, now);
    
    promotions.forEach(p => {
      try {
        p.targets = JSON.parse(p.targets);
      } catch {
        p.targets = [];
      }
    });
    
    res.json({ promotions });
  } catch (error) {
    console.error('Get active promotions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create promotion (admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const {
      name,
      description,
      type,
      targets,
      percentage,
      startDate,
      endDate,
      announcementText,
      active
    } = req.body;

    if (!name || !type || !targets || !percentage || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO promotions (id, name, description, type, targets, percentage, startDate, endDate, announcementText, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      description || null,
      type,
      JSON.stringify(targets),
      percentage,
      startDate,
      endDate,
      announcementText || null,
      active !== undefined ? (active ? 1 : 0) : 1
    );

    const promotion = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id);
    res.status(201).json({ message: 'Promotion created', promotion });
  } catch (error) {
    console.error('Create promotion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update promotion (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const promotion = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id);
    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    const fields = [];
    const values = [];

    const allowedFields = ['name', 'description', 'type', 'targets', 'percentage', 'startDate', 'endDate', 'announcementText', 'active'];
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        if (field === 'targets') {
          values.push(JSON.stringify(updates[field]));
        } else if (field === 'active') {
          values.push(updates[field] ? 1 : 0);
        } else {
          values.push(updates[field]);
        }
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE promotions SET ${fields.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);

    const updated = db.prepare('SELECT * FROM promotions WHERE id = ?').get(id);
    res.json({ message: 'Promotion updated', promotion: updated });
  } catch (error) {
    console.error('Update promotion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete promotion (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM promotions WHERE id = ?').run(id);
    res.json({ message: 'Promotion deleted' });
  } catch (error) {
    console.error('Delete promotion error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
