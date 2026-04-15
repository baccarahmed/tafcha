import jwt from 'jsonwebtoken';
import db from '../database/db.js';

export const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('CRITICAL ERROR: JWT_SECRET environment variable is not defined!');
  process.exit(1);
}

// Use a development-only fallback if not in production
const effectiveSecret = JWT_SECRET || 'dev-secret-key-change-me-in-production';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  // Also check cookies
  if (!token && req.cookies) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, effectiveSecret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    },
    effectiveSecret,
    { expiresIn: '7d' }
  );
};

export default {
  authenticateToken,
  requireAdmin,
  generateToken,
  JWT_SECRET: effectiveSecret
};
