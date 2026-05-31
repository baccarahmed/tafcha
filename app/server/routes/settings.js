import express from 'express';
import prisma from '../database/prisma.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Server cache for settings
let settingsCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Get site settings (public)
router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    
    // Use cache if available and valid
    if (settingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return res.json({ settings: settingsCache });
    }
    
    // Fetch from database
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'main' } });
    
    if (settings) {
      try {
        if (settings.featuredCategories) settings.featuredCategories = JSON.parse(settings.featuredCategories);
        if (settings.announcementText) settings.announcementText = JSON.parse(settings.announcementText);
      } catch (e) {
        console.error('Error parsing settings JSON fields:', e);
      }
    }

    // Cache the result
    settingsCache = settings;
    cacheTimestamp = now;
    
    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update site settings (admin only)
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    const data = {};

    const booleanFields = ['announcementEnabled', 'animatedBackground', 'newsletterEnabled', 'maintenanceMode'];
    booleanFields.forEach(field => {
      if (updates[field] !== undefined) data[field] = !!updates[field];
    });

    if (updates.announcementText !== undefined) {
      data.announcementText = Array.isArray(updates.announcementText) 
        ? JSON.stringify(updates.announcementText) 
        : JSON.stringify([updates.announcementText]);
    }

    const stringFields = [
      'announcementBgColor', 'announcementTextColor', 'heroTitle', 'heroSubtitle', 
      'heroVideo', 'heroImage', 'siteBgColor', 'sitePanelColor', 'animatedBlur', 
      'aboutText', 'contactEmail', 'contactPhone', 'contactAddress', 
      'socialInstagram', 'socialFacebook', 'socialTwitter', 'socialYoutube', 'smokeyColor'
    ];
    stringFields.forEach(field => {
      if (updates[field] !== undefined) data[field] = updates[field];
    });

    if (updates.featuredCategories !== undefined) {
      data.featuredCategories = Array.isArray(updates.featuredCategories) 
        ? JSON.stringify(updates.featuredCategories) 
        : null;
    }

    if (updates.featuredLimit !== undefined) {
      data.featuredLimit = Math.max(1, Math.min(12, parseInt(updates.featuredLimit) || 3));
    }

    if (updates.freeShippingThresholdDNT !== undefined) {
      data.freeShippingThresholdDNT = Math.max(0, parseFloat(updates.freeShippingThresholdDNT) || 100);
    }
    if (updates.shippingCostDNT !== undefined) {
      data.shippingCostDNT = Math.max(0, parseFloat(updates.shippingCostDNT) || 10);
    }

    console.log('Updating settings with data:', JSON.stringify(data, null, 2));

    const settings = await prisma.siteSettings.upsert({
      where: { id: 'main' },
      update: data,
      create: {
        id: 'main',
        ...data
      },
    });

    if (settings) {
      try {
        if (settings.featuredCategories && typeof settings.featuredCategories === 'string') 
          settings.featuredCategories = JSON.parse(settings.featuredCategories);
        if (settings.announcementText && typeof settings.announcementText === 'string') 
          settings.announcementText = JSON.parse(settings.announcementText);
      } catch (e) {
        console.error('Error parsing updated settings JSON fields:', e);
      }
    }

    // Invalidate cache after update
    settingsCache = null;
    cacheTimestamp = 0;

    res.json({ message: 'Settings updated', settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
