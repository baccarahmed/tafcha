import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../database/db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { search, role, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT id, email, firstName, lastName, role, phone, address, city, country, createdAt
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (email LIKE ? OR firstName LIKE ? OR lastName LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const users = db.prepare(query).all(...params);
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single user (admin only)
router.get('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    
    const user = db.prepare(`
      SELECT id, email, firstName, lastName, role, phone, address, city, country, postalCode, createdAt
      FROM users WHERE id = ?
    `).get(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, phone, address, city, country, postalCode } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare(`
      UPDATE users 
      SET firstName = ?, lastName = ?, role = ?, phone = ?, address = ?, city = ?, country = ?, postalCode = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(firstName, lastName, role, phone, address, city, country, postalCode, id);

    const updatedUser = db.prepare(`
      SELECT id, email, firstName, lastName, role, phone, address, city, country, postalCode, createdAt
      FROM users WHERE id = ?
    `).get(id);

    res.json({ message: 'User updated', user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user stats (admin only)
router.get('/stats/overview', authenticateToken, requireAdmin, (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const customers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('customer').count;
    const admins = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin').count;
    const newThisMonth = db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE createdAt >= datetime('now', 'start of month')
    `).get().count;

    res.json({
      stats: {
        totalUsers,
        customers,
        admins,
        newThisMonth
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
