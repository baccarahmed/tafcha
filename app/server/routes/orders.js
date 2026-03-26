const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/db');
const events = require('../events');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Create order (authenticated users)
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      notes
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'Order items are required' });
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      const product = db.prepare('SELECT price, stock FROM products WHERE id = ?').get(item.productId);
      if (!product) {
        return res.status(404).json({ error: `Product ${item.productId} not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for product ${item.productId}` });
      }
      subtotal += product.price * item.quantity;
    }

    const s = db.prepare('SELECT freeShippingThresholdDNR, shippingCostDNR FROM site_settings WHERE id = ?').get('main');
    const threshold = (s && typeof s.freeShippingThresholdDNR === 'number') ? s.freeShippingThresholdDNR : 100;
    const shipCost = (s && typeof s.shippingCostDNR === 'number') ? s.shippingCostDNR : 10;
    const shipping = subtotal >= threshold ? 0 : shipCost;
    const tax = subtotal * 0.1;
    const total = subtotal + shipping + tax;

    const orderId = uuidv4();

    // Create order
    db.prepare(`
      INSERT INTO orders (id, userId, total, subtotal, shipping, tax, shippingAddress, billingAddress, paymentMethod, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId,
      req.user.id,
      total,
      subtotal,
      shipping,
      tax,
      JSON.stringify(shippingAddress),
      JSON.stringify(billingAddress),
      paymentMethod,
      notes || null
    );

    // Create order items and update stock
    for (const item of items) {
      const itemId = uuidv4();
      const product = db.prepare('SELECT price FROM products WHERE id = ?').get(item.productId);
      
      db.prepare(`
        INSERT INTO order_items (id, orderId, productId, quantity, price)
        VALUES (?, ?, ?, ?, ?)
      `).run(itemId, orderId, item.productId, item.quantity, product.price);

      // Update stock
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?')
        .run(item.quantity, item.productId);
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const orderItems = db.prepare(`
      SELECT oi.*, p.name, p.images
      FROM order_items oi
      JOIN products p ON oi.productId = p.id
      WHERE oi.orderId = ?
    `).all(orderId);

    const response = {
      message: 'Order created successfully',
      order: {
        ...order,
        items: orderItems
      }
    };
    events.broadcast('order_created', { id: orderId, status: 'pending' });
    res.status(201).json(response);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user orders
router.get('/my-orders', authenticateToken, (req, res) => {
  try {
    const orders = db.prepare(`
      SELECT * FROM orders WHERE userId = ? ORDER BY createdAt DESC
    `).all(req.user.id);

    // Get items for each order
    for (const order of orders) {
      const items = db.prepare(`
        SELECT oi.*, p.name, p.slug, p.images
        FROM order_items oi
        JOIN products p ON oi.productId = p.id
        WHERE oi.orderId = ?
      `).all(order.id);

      order.items = items.map(item => {
        if (item.images) {
          try {
            item.images = JSON.parse(item.images);
          } catch {
            item.images = [item.images];
          }
        }
        return item;
      });
    }

    res.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all orders (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT o.*, u.email, u.firstName, u.lastName
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.createdAt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const orders = db.prepare(query).all(...params);
    res.json({ orders });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single order
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    
    const order = db.prepare(`
      SELECT o.*, u.email, u.firstName, u.lastName
      FROM orders o
      LEFT JOIN users u ON o.userId = u.id
      WHERE o.id = ?
    `).get(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user owns this order or is admin
    if (order.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const items = db.prepare(`
      SELECT oi.*, p.name, p.slug, p.images
      FROM order_items oi
      JOIN products p ON oi.productId = p.id
      WHERE oi.orderId = ?
    `).all(id);

    order.items = items.map(item => {
      if (item.images) {
        try {
          item.images = JSON.parse(item.images);
        } catch {
          item.images = [item.images];
        }
      }
      return item;
    });

    res.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update order status (admin only)
router.put('/:id/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, deliveryWindowStart, deliveryWindowEnd } = req.body;

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (status) {
      db.prepare('UPDATE orders SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
        .run(status, id);
    }

    if (paymentStatus) {
      db.prepare('UPDATE orders SET paymentStatus = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
        .run(paymentStatus, id);
    }

    if (deliveryWindowStart !== undefined || deliveryWindowEnd !== undefined) {
      const fields = [];
      const values = [];
      if (deliveryWindowStart !== undefined) {
        fields.push('deliveryWindowStart = ?');
        values.push(deliveryWindowStart || null);
      }
      if (deliveryWindowEnd !== undefined) {
        fields.push('deliveryWindowEnd = ?');
        values.push(deliveryWindowEnd || null);
      }
      fields.push('updatedAt = CURRENT_TIMESTAMP');
      values.push(id);
      const q = `UPDATE orders SET ${fields.join(', ')} WHERE id = ?`;
      db.prepare(q).run(...values);
    }

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    events.broadcast('order_updated', { id, status: updatedOrder.status });
    res.json({ message: 'Order updated', order: updatedOrder });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/cancel', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Order cannot be cancelled now' });
    }
    db.prepare('UPDATE orders SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?').run('cancelled', id);
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    events.broadcast('order_updated', { id, status: updated.status });
    res.json({ message: 'Order cancelled', order: updated });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Confirm delivery (user marks as received with proof)
router.put('/:id/confirm-delivery', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { proofUrl } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.userId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    db.prepare('UPDATE orders SET status = ?, deliveryProofUrl = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?')
      .run('completed', proofUrl || null, id);
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    events.broadcast('order_updated', { id, status: updated.status });
    res.json({ message: 'Order marked as completed', order: updated });
  } catch (error) {
    console.error('Confirm delivery error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get order stats (admin only)
router.get('/stats/overview', authenticateToken, requireAdmin, (req, res) => {
  try {
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const totalRevenue = db.prepare('SELECT SUM(total) as total FROM orders').get().total || 0;
    const pendingOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE status = ?').get('pending').count;
    const completedOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE status = ?').get('completed').count;
    
    const todayOrders = db.prepare(`
      SELECT COUNT(*) as count FROM orders 
      WHERE createdAt >= datetime('now', 'start of day')
    `).get().count;

    const todayRevenue = db.prepare(`
      SELECT SUM(total) as total FROM orders 
      WHERE createdAt >= datetime('now', 'start of day')
    `).get().total || 0;

    res.json({
      stats: {
        totalOrders,
        totalRevenue,
        pendingOrders,
        completedOrders,
        todayOrders,
        todayRevenue
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
