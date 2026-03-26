import { useState, useEffect } from 'react';
import { settingsAPI } from '@/services/api';

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
  updatedAt: string;
}

export function useSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await settingsAPI.get();
      setSettings(data.settings);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<SiteSettings>) => {
    const data = await settingsAPI.update(newSettings);
    setSettings(data.settings);
    return data.settings;
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
  };
}
