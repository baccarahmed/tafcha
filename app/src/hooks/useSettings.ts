import { useState, useEffect, useContext, useRef } from 'react';
import { settingsAPI } from '@/services/api';
import { PreloadedDataContext } from '@/App';

interface SiteSettings {
  id: string;
  heroTitle: string;
  heroSubtitle: string;
  heroVideo: string | null;
  heroImage: string | null;
  siteBgColor?: string | null;
  sitePanelColor?: string | null;
  smokeyColor?: string | null;
  featuredCategories?: string[] | null;
  featuredLimit?: number | null;
  animatedBackground?: boolean | number | null;
  animatedBlur?: string | null;
  aboutText: string | null;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string | null;
  socialInstagram: string | null;
  socialFacebook: string | null;
  socialTwitter: string | null;
  socialYoutube: string | null;
  freeShippingThresholdDNR?: number | null;
  shippingCostDNR?: number | null;
  newsletterEnabled: boolean;
  maintenanceMode: boolean;
  announcementEnabled?: boolean | number | null;
  announcementText?: string | string[] | null;
  announcementBgColor?: string | null;
  announcementTextColor?: string | null;
  updatedAt: string;
}

// Cache global pour les settings
let globalSettingsCache: SiteSettings | null = null;
let globalCacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Promesse de requête en cours pour éviter les doublons
let pendingRequest: Promise<any> | null = null;

export function useSettings() {
  const preloaded = useContext(PreloadedDataContext);
  const [settings, setSettings] = useState<SiteSettings | null>(preloaded?.settings || null);
  const [isLoading, setIsLoading] = useState(!preloaded?.settings);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchSettings = async () => {
    // Utiliser le cache si disponible et valide
    const now = Date.now();
    if (globalSettingsCache && (now - globalCacheTimestamp) < CACHE_DURATION) {
      setSettings(globalSettingsCache);
      setIsLoading(false);
      return;
    }

    // Éviter les requêtes multiples simultanées
    if (isFetchingRef.current) {
      return;
    }

    // Si une requête est déjà en cours, attendre sa fin
    if (pendingRequest) {
      try {
        const data = await pendingRequest;
        setSettings(data.settings);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (preloaded?.settings && settings === preloaded.settings) {
      setIsLoading(false);
      return;
    }

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      
      // Créer une nouvelle requête
      pendingRequest = settingsAPI.get();
      const data = await pendingRequest;
      
      // Mettre à jour le cache global
      globalSettingsCache = data.settings;
      globalCacheTimestamp = now;
      
      setSettings(data.settings);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      isFetchingRef.current = false;
      pendingRequest = null;
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<SiteSettings>) => {
    const data = await settingsAPI.update(newSettings);
    
    // Mettre à jour le cache global
    globalSettingsCache = data.settings;
    globalCacheTimestamp = Date.now();
    
    setSettings(data.settings);
    return data.settings;
  };

  const clearCache = () => {
    globalSettingsCache = null;
    globalCacheTimestamp = 0;
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    isLoading,
    error,
    refetch: fetchSettings,
    updateSettings,
    clearCache,
  };
}
