import express from 'express';
import db from '../database/db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get site settings (public)
router.get('/', (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM site_settings WHERE id = ?').get('main');
    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update site settings (admin only)
router.put('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const {
      heroTitle,
      heroSubtitle,
      heroVideo,
      heroImage,
      siteBgColor,
      sitePanelColor,
      featuredCategories,
      featuredLimit,
      animatedBackground,
      animatedBlur,
      aboutText,
      contactEmail,
      contactPhone,
      contactAddress,
      socialInstagram,
      socialFacebook,
      socialTwitter,
      socialYoutube,
      newsletterEnabled,
      maintenanceMode,
      freeShippingThresholdDNR,
      shippingCostDNR,
      smokeyColor
    } = req.body;

    const fields = [];
    const values = [];

    if (heroTitle !== undefined) {
      fields.push('heroTitle = ?');
      values.push(heroTitle);
    }

    if (heroSubtitle !== undefined) {
      fields.push('heroSubtitle = ?');
      values.push(heroSubtitle);
    }

    if (heroVideo !== undefined) {
      fields.push('heroVideo = ?');
      values.push(heroVideo);
    }

    if (heroImage !== undefined) {
      fields.push('heroImage = ?');
      values.push(heroImage);
    }

    if (siteBgColor !== undefined) {
      fields.push('siteBgColor = ?');
      values.push(siteBgColor || null);
    }

    if (sitePanelColor !== undefined) {
      fields.push('sitePanelColor = ?');
      values.push(sitePanelColor || null);
    }

    if (featuredCategories !== undefined) {
      fields.push('featuredCategories = ?');
      try {
        const json = Array.isArray(featuredCategories) ? JSON.stringify(featuredCategories) : null;
        values.push(json);
      } catch {
        values.push(null);
      }
    }

    if (featuredLimit !== undefined) {
      const lim = Number.isFinite(Number(featuredLimit)) ? Math.max(1, Math.min(12, parseInt(featuredLimit))) : 3;
      fields.push('featuredLimit = ?');
      values.push(lim);
    }

    if (animatedBackground !== undefined) {
      fields.push('animatedBackground = ?');
      values.push(Boolean(animatedBackground) ? 1 : 0);
    }

    if (animatedBlur !== undefined) {
      const allowed = new Set(['none','sm','md','lg','xl','2xl','3xl']);
      const val = typeof animatedBlur === 'string' && allowed.has(animatedBlur) ? animatedBlur : 'sm';
      fields.push('animatedBlur = ?');
      values.push(val);
    }

    if (aboutText !== undefined) {
      fields.push('aboutText = ?');
      values.push(aboutText);
    }

    if (contactEmail !== undefined) {
      fields.push('contactEmail = ?');
      values.push(contactEmail);
    }

    if (contactPhone !== undefined) {
      fields.push('contactPhone = ?');
      values.push(contactPhone);
    }

    if (contactAddress !== undefined) {
      fields.push('contactAddress = ?');
      values.push(contactAddress);
    }

    if (socialInstagram !== undefined) {
      fields.push('socialInstagram = ?');
      values.push(socialInstagram);
    }

    if (socialFacebook !== undefined) {
      fields.push('socialFacebook = ?');
      values.push(socialFacebook);
    }

    if (socialTwitter !== undefined) {
      fields.push('socialTwitter = ?');
      values.push(socialTwitter);
    }

    if (socialYoutube !== undefined) {
      fields.push('socialYoutube = ?');
      values.push(socialYoutube);
    }

    if (newsletterEnabled !== undefined) {
      fields.push('newsletterEnabled = ?');
      values.push(newsletterEnabled ? 1 : 0);
    }

    if (maintenanceMode !== undefined) {
      fields.push('maintenanceMode = ?');
      values.push(maintenanceMode ? 1 : 0);
    }
    
    if (freeShippingThresholdDNR !== undefined) {
      const thr = Number.isFinite(Number(freeShippingThresholdDNR)) ? Math.max(0, parseFloat(freeShippingThresholdDNR)) : 100;
      fields.push('freeShippingThresholdDNR = ?');
      values.push(thr);
    }
    
    if (shippingCostDNR !== undefined) {
      const cost = Number.isFinite(Number(shippingCostDNR)) ? Math.max(0, parseFloat(shippingCostDNR)) : 10;
      fields.push('shippingCostDNR = ?');
      values.push(cost);
    }
    
    if (smokeyColor !== undefined) {
      fields.push('smokeyColor = ?');
      values.push(smokeyColor || null);
    }

    fields.push('updatedAt = CURRENT_TIMESTAMP');
    values.push('main');

    const query = `UPDATE site_settings SET ${fields.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);

    const settings = db.prepare('SELECT * FROM site_settings WHERE id = ?').get('main');
    res.json({ message: 'Settings updated', settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
