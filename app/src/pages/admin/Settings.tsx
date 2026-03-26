import { useEffect, useRef, useState } from 'react';
import { Save, Type, Mail, Phone, MapPin, Instagram, Facebook, Twitter, Youtube, Image as ImageIcon, Upload, ArrowUp, ArrowDown, Edit2, Trash2, Plus } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import { uploadsAPI, productsAPI } from '@/services/api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminSettings() {
  const { settings, updateSettings, isLoading } = useSettings();
  
  const [formData, setFormData] = useState({
    heroTitle: '',
    heroSubtitle: '',
    heroVideo: '',
    heroImage: '',
    siteBgColor: '#3d4d5d',
    sitePanelColor: '#2a3a4a',
    smokeyColor: '',
    featuredLimit: 3,
    animatedBackground: false,
    animatedBlur: 'sm',
    aboutText: '',
    contactEmail: '',
    contactPhone: '',
    contactAddress: '',
    socialInstagram: '',
    socialFacebook: '',
    socialTwitter: '',
    socialYoutube: '',
    freeShippingThresholdDNR: 100,
    shippingCostDNR: 10,
  });
  const [featuredHome, setFeaturedHome] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const heroFileRef = useRef<HTMLInputElement | null>(null);
  const heroVideoInputRef = useRef<HTMLInputElement | null>(null);
  const [catImages, setCatImages] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Array<{id:string; name:string; image?:string}>>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [catUploading, setCatUploading] = useState<string | null>(null);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<{ name: string; description: string }>({ name: '', description: '' });
  const [catSavingId, setCatSavingId] = useState<string | null>(null);
  const [catDeletingId, setCatDeletingId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [details, setDetails] = useState<{
    category: { id: string; name: string; description?: string; image?: string; createdAt: string };
    products: Array<{ id: string; name: string; slug: string; price: number; image?: string }>
  } | null>(null);
  // create-new dialog state
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const newImageInputRef = useRef<HTMLInputElement | null>(null);

  const openDetails = async (id: string) => {
    setDetailsId(id);
    setDetailsLoading(true);
    try {
      const data = await productsAPI.getCategoryDetails(id) as {
        category: { id: string; name: string; description?: string; image?: string; createdAt: string };
        products: Array<{ id: string; name: string; slug: string; price: number; image?: string }>;
      };
      setDetails(data);
      const cat = data.category;
      setEditingCat({ name: cat.name, description: cat.description || '' });
      setEditingCatId(id);
    } catch {
      toast.error('Impossible de charger les détails');
      setDetailsId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openCreate = () => {
    setEditingCatId('new');
    setEditingCat({ name: '', description: '' });
    setNewImageFile(null);
    setNewImagePreview(null);
    setDetails(null);
    setDetailsId('new');
  };

  const onPickNewImage = (f: File) => {
    setNewImageFile(f);
    const reader = new FileReader();
    reader.onload = () => setNewImagePreview(String(reader.result || ''));
    reader.readAsDataURL(f);
  };

  useEffect(() => {
    if (settings) {
      setFormData({
        heroTitle: settings.heroTitle || '',
        heroSubtitle: settings.heroSubtitle || '',
        heroVideo: settings.heroVideo || '',
        heroImage: settings.heroImage || '',
        siteBgColor: settings.siteBgColor || '#3d4d5d',
        sitePanelColor: settings.sitePanelColor || '#2a3a4a',
        smokeyColor: settings.smokeyColor || '',
        featuredLimit: settings.featuredLimit ?? 3,
        animatedBackground: Boolean(settings.animatedBackground ?? false),
        animatedBlur: settings.animatedBlur || 'sm',
        aboutText: settings.aboutText || '',
        contactEmail: settings.contactEmail || '',
        contactPhone: settings.contactPhone || '',
        contactAddress: settings.contactAddress || '',
        socialInstagram: settings.socialInstagram || '',
        socialFacebook: settings.socialFacebook || '',
        socialTwitter: settings.socialTwitter || '',
        socialYoutube: settings.socialYoutube || '',
        freeShippingThresholdDNR: settings.freeShippingThresholdDNR ?? 100,
        shippingCostDNR: settings.shippingCostDNR ?? 10,
      });
      setFeaturedHome(Array.isArray(settings.featuredCategories) ? settings.featuredCategories : []);
    }
  }, [settings]);

  const refreshCategories = async () => {
    try {
      const data = await productsAPI.getCategories();
      const cats = data.categories as Array<{id:string; name:string; image?:string}>;
      setCategories(cats);
      setOrder(cats.map((c) => c.id));
      const imgs: Record<string, string> = {};
      cats.forEach((c) => { imgs[c.id] = c.image || ''; });
      setCatImages(imgs);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refreshCategories();
  }, []);

  const validateFile = (file: File) => {
    const okTypes = ['image/jpeg','image/png','image/webp'];
    if (!okTypes.includes(file.type)) {
      throw new Error('Format non supporté. Formats acceptés: JPG, PNG, WebP.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Fichier trop volumineux. Taille maximale: 5MB.');
    }
  };

  const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const uploadHeroImage = async (file: File) => {
    try {
      validateFile(file);
      setHeroUploading(true);
      const dataUrl = await fileToDataUrl(file);
      const resp = await uploadsAPI.upload(dataUrl);
      setFormData(prev => ({ ...prev, heroImage: resp.url }));
      toast.success('Visuel Hero téléversé');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec du téléversement');
    } finally {
      setHeroUploading(false);
    }
  };

  const uploadHeroVideo = async (file: File) => {
    try {
      if (file.type !== 'video/mp4') throw new Error('Format vidéo non supporté. MP4 requis.');
      if (file.size > 25 * 1024 * 1024) throw new Error('Vidéo trop volumineuse (25MB max).');
      setHeroUploading(true);
      const dataUrl = await fileToDataUrl(file);
      const resp = await uploadsAPI.upload(dataUrl);
      setFormData(prev => ({ ...prev, heroVideo: resp.url }));
      toast.success('Vidéo Hero téléversée');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec du téléversement vidéo');
    } finally {
      setHeroUploading(false);
    }
  };

  const uploadCategoryImage = async (id: string, file: File) => {
    try {
      validateFile(file);
      setCatUploading(id);
      const dataUrl = await fileToDataUrl(file);
      const resp = await uploadsAPI.upload(dataUrl);
      await productsAPI.updateCategoryImage(id, resp.url);
      setCatImages(prev => ({ ...prev, [id]: resp.url }));
      toast.success('Image de collection mise à jour');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec du téléversement');
    } finally {
      setCatUploading(null);
    }
  };

  const moveCategory = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    const newOrder = [...order];
    const [m] = newOrder.splice(from, 1);
    newOrder.splice(to, 0, m);
    setOrder(newOrder);
  };

  const saveOrder = async () => {
    try {
      await productsAPI.updateCategoriesOrder(order);
      toast.success('Ordre des collections enregistré');
    } catch {
      toast.error('Impossible d’enregistrer l’ordre');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateSettings({ ...formData, featuredCategories: featuredHome });
      toast.success('Settings saved successfully!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-[#2a3a4a] border border-[#fff4e9]/20 rounded text-[#fff4e9] \
                      placeholder-[#fff4e9]/40 focus:outline-none focus:border-[#fff4e9]/50 transition-colors";

  return (
    <AdminLayout title="Site Settings">
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fff4e9]"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
          {/* Hero Section */}
          <section className="bg-[--panel-bg] rounded-lg p-6 border border-[#fff4e9]/10">
            <h2 className="font-display text-xl text-[#fff4e9] mb-6 flex items-center gap-2">
              <Type className="w-5 h-5 text-[#fff4e9]/60" />
              Hero Section
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#fff4e9]/60 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.heroTitle}
                  onChange={(e) => setFormData({ ...formData, heroTitle: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-[#fff4e9]/60 mb-2">Subtitle</label>
                <textarea
                  value={formData.heroSubtitle}
                  onChange={(e) => setFormData({ ...formData, heroSubtitle: e.target.value })}
                  rows={3}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-[#fff4e9]/60 mb-2">Hero Video URL</label>
                <input
                  type="text"
                  value={formData.heroVideo}
                  onChange={(e) => setFormData({ ...formData, heroVideo: e.target.value })}
                  placeholder="/videos/hero-video.mp4 ou URL externe (mp4)"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Visuels Hero */}
          <section className="bg-[--panel-bg] rounded-lg p-6 border border-[#fff4e9]/10 space-y-4">
            <h2 className="font-display text-xl text-[#fff4e9] mb-2 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#fff4e9]/60" />
              Visuel Hero
            </h2>
            <div className="flex items-start gap-4">
              <div className="w-56 aspect-video bg-[--site-bg] rounded overflow-hidden ring-1 ring-[#fff4e9]/10 flex items-center justify-center">
                {formData.heroImage ? (
                  <img src={formData.heroImage} alt="Hero" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[#fff4e9]/40 text-sm">Aperçu indisponible</span>
                )}
              </div>
              <div className="space-y-2">
                <input ref={heroFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadHeroImage(f);
                }} />
                <button
                  type="button"
                  onClick={() => heroFileRef.current?.click()}
                  disabled={heroUploading}
                  className="px-4 py-2 bg-[#fff4e9] text-[#3d4d5d] rounded hover:bg-[#f3e7d9] transition-colors"
                >
                  {heroUploading ? 'Téléversement...' : (<span className="inline-flex items-center gap-2"><Upload className="w-4 h-4" />Téléverser</span>)}
                </button>
                <p className="text-xs text-[#fff4e9]/50">Formats: JPG, PNG, WebP — 5MB max</p>
                <div className="pt-2">
                  <input
                    ref={heroVideoInputRef}
                    type="file"
                    accept="video/mp4"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadHeroVideo(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => heroVideoInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#fff4e9]/10 text-[#fff4e9] rounded hover:bg-[#fff4e9]/20"
                  >
                    <Upload className="w-4 h-4" /> Téléverser une vidéo (MP4)
                  </button>
                  {formData.heroVideo && <p className="text-xs text-[#fff4e9]/60 truncate mt-1">Vidéo actuelle: {formData.heroVideo}</p>}
                </div>
              </div>
            </div>
          </section>

          {/* Collections (visuels + ordre) */}
          <section className="bg-[--panel-bg] rounded-lg p-6 border border-[#fff4e9]/10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-[#fff4e9]">Visuels Collections</h2>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#fff4e9] text-[#3d4d5d] rounded hover:bg-[#f3e7d9] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nouvelle collection
              </button>
            </div>
            <div className="bg-[#3d4d5d]/30 rounded p-3 border border-[#fff4e9]/10">
              <div className="text-sm text-[#fff4e9]/80 mb-2">Collections affichées sur la page d’accueil</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-[#fff4e9]">
                    <input
                      type="checkbox"
                      className="accent-[#fff4e9]"
                      checked={featuredHome.includes(c.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFeaturedHome(prev => checked ? [...new Set([...prev, c.id])] : prev.filter(id => id !== c.id));
                      }}
                    />
                    <span>{c.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-[#fff4e9]/50 mt-1">Ces collections seront mises en avant sur la page d’accueil.</p>
            </div>
            <div className="space-y-3">
              {order.map((id, index) => {
                const cat = categories.find(c => c.id === id);
                if (!cat) return null;
                return (
                  <div key={id} className="flex items-center gap-3 p-3 rounded bg-[--panel-bg] border border-[#fff4e9]/10">
                    <div className="w-16 h-16 rounded overflow-hidden bg-[#3d4d5d] ring-1 ring-[#fff4e9]/10 flex items-center justify-center">
                      {(catImages[id]) ? (
                        <img src={catImages[id]} alt={cat.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-[#fff4e9]/40" />
                      )}
                    </div>
                    <div className="flex-1">
                      {editingCatId === id ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input
                            value={editingCat.name}
                            onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                            className={inputClass}
                            placeholder="Nom"
                          />
                          <input
                            value={editingCat.description}
                            onChange={(e) => setEditingCat({ ...editingCat, description: e.target.value })}
                            className={inputClass}
                            placeholder="Description"
                          />
                        </div>
                      ) : (
                        <div className="text-[#fff4e9] font-medium">{cat.name}</div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          id={`cat-file-${id}`}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) uploadCategoryImage(id, f);
                          }}
                        />
                        <label
                          htmlFor={`cat-file-${id}`}
                          className={`px-3 py-1 rounded bg-[#fff4e9] text-[#3d4d5d] hover:bg-[#f3e7d9] cursor-pointer ${catUploading===id?'opacity-60 pointer-events-none':''}`}
                        >
                          {catUploading===id ? 'Téléversement...' : 'Remplacer l’image'}
                        </label>
                        {editingCatId === id ? (
                          <>
                            <button
                              type="button"
                              disabled={!editingCat.name || catSavingId===id}
                              onClick={async () => {
                                try {
                                  setCatSavingId(id);
                                  const updated = await productsAPI.updateCategory(id, { name: editingCat.name, description: editingCat.description || undefined });
                                  toast.success('Collection mise à jour');
                                  // refresh categories local
                                  const cats = categories.map(c => c.id === id ? { ...c, name: updated.category.name } : c);
                                  setCategories(cats);
                                  setEditingCatId(null);
                                } catch {
                                  toast.error('Échec de la mise à jour');
                                } finally {
                                  setCatSavingId(null);
                                }
                              }}
                              className="px-3 py-1 rounded bg-[#fff4e9]/10 text-[#fff4e9] hover:bg-[#fff4e9]/20"
                            >
                              Enregistrer
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCatId(null)}
                              className="px-3 py-1 rounded bg-[#fff4e9]/10 text-[#fff4e9] hover:bg-[#fff4e9]/20"
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openDetails(id)}
                              className="p-2 text-[#fff4e9]/60 hover:text-[#fff4e9] hover:bg-[#fff4e9]/10 rounded transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={catDeletingId===id}
                              onClick={async () => {
                                if (!confirm('Supprimer cette collection ? Les produits ne seront plus rattachés.')) return;
                                try {
                                  setCatDeletingId(id);
                                  await productsAPI.deleteCategory(id);
                                  const newCats = categories.filter(c => c.id !== id);
                                  setCategories(newCats);
                                  setOrder(order.filter(cid => cid !== id));
                                  const imgs = { ...catImages }; delete imgs[id]; setCatImages(imgs);
                                  toast.success('Collection supprimée');
                                } catch {
                                  toast.error('Échec de la suppression');
                                } finally {
                                  setCatDeletingId(null);
                                }
                              }}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <span className="text-xs text-[#fff4e9]/50">JPG, PNG, WebP • 5MB</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button type="button" onClick={() => moveCategory(index, index-1)} className="p-1 rounded bg-[#fff4e9]/10 hover:bg-[#fff4e9]/20">
                        <ArrowUp className="w-4 h-4 text-[#fff4e9]" />
                      </button>
                      <button type="button" onClick={() => moveCategory(index, index+1)} className="p-1 rounded bg-[#fff4e9]/10 hover:bg-[#fff4e9]/20">
                        <ArrowDown className="w-4 h-4 text-[#fff4e9]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveOrder}
                className="px-6 py-2 bg-[#fff4e9] text-[#3d4d5d] rounded hover:bg-[#f3e7d9] transition-colors"
              >
                Enregistrer l’ordre
              </button>
            </div>
          </section>

          {/* Apparence */}
          <section className="bg-[--panel-bg] rounded-lg p-6 border border-[#fff4e9]/10 space-y-4">
            <h2 className="font-display text-xl text-[#fff4e9] mb-2">Apparence</h2>
            <div className="flex items-center justify-between gap-3">
              <div>
                <label className="block text-sm text-[#fff4e9]/60 mb-1">Activer le fond animé</label>
                <p className="text-xs text-[#fff4e9]/50">Active le shader Smokey en arrière-plan.</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({...formData, animatedBackground: !formData.animatedBackground})}
                className={`toggle-switch ${formData.animatedBackground ? 'active' : ''}`}
                aria-pressed={formData.animatedBackground}
                title="Activer/Désactiver le fond animé"
              >
                <span className="toggle-knob" />
              </button>
            </div>
            <div>
              <label className="block text-sm text-[#fff4e9]/60 mb-2">Intensité du flou (fond animé)</label>
              <select
                value={formData.animatedBlur}
                onChange={(e) => setFormData({ ...formData, animatedBlur: e.target.value })}
                className={inputClass}
              >
                <option value="none">none</option>
                <option value="sm">sm</option>
                <option value="md">md</option>
                <option value="lg">lg</option>
                <option value="xl">xl</option>
                <option value="2xl">2xl</option>
                <option value="3xl">3xl</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#fff4e9]/60 mb-2">Couleur de fond du site</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.siteBgColor}
                  onChange={(e) => setFormData({ ...formData, siteBgColor: e.target.value })}
                  className="w-12 h-10 p-0 border border-[#fff4e9]/20 rounded bg-transparent"
                />
                <input
                  type="text"
                  value={formData.siteBgColor}
                  onChange={(e) => setFormData({ ...formData, siteBgColor: e.target.value })}
                  className={inputClass}
                  placeholder="#3d4d5d"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-[#fff4e9]/60 mb-2">Couleur du Smokey background</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.smokeyColor || ''}
                  onChange={(e) => setFormData({ ...formData, smokeyColor: e.target.value })}
                  className="w-12 h-10 p-0 border border-[#fff4e9]/20 rounded bg-transparent"
                />
                <input
                  type="text"
                  value={formData.smokeyColor || ''}
                  onChange={(e) => setFormData({ ...formData, smokeyColor: e.target.value })}
                  className={inputClass}
                  placeholder="Laisse vide pour utiliser la couleur Panel"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-[#fff4e9]/60 mb-2">Nombre de collections affichées en Home</label>
              <input
                type="number"
                min={1}
                max={12}
                value={formData.featuredLimit}
                onChange={(e) => setFormData({ ...formData, featuredLimit: Math.max(1, Math.min(12, parseInt(e.target.value || '1'))) })}
                className={inputClass}
              />
            </div>
          </section>
          
          {/* Shipping */}
          <section className="bg-[--panel-bg] rounded-lg p-6 border border-[#fff4e9]/10 space-y-4">
            <h2 className="font-display text-xl text-[#fff4e9] mb-2">Shipping</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-[#fff4e9]/60 mb-2">Free shipping threshold (DNR)</label>
                <input
                  type="number"
                  value={formData.freeShippingThresholdDNR}
                  onChange={(e) => setFormData({ ...formData, freeShippingThresholdDNR: Number(e.target.value) })}
                  className={inputClass}
                  placeholder="100"
                  min={0}
                />
              </div>
              <div>
                <label className="block text-sm text-[#fff4e9]/60 mb-2">Shipping cost (DNR)</label>
                <input
                  type="number"
                  value={formData.shippingCostDNR}
                  onChange={(e) => setFormData({ ...formData, shippingCostDNR: Number(e.target.value) })}
                  className={inputClass}
                  placeholder="10"
                  min={0}
                />
              </div>
            </div>
          </section>
          
          <Dialog open={!!detailsId} onOpenChange={(o) => !o && setDetailsId(null)}>
            <DialogContent className="bg-[--panel-bg] border-[#fff4e9]/20 max-w-3xl">
              <DialogHeader>
                <DialogTitle className="text-[#fff4e9]">
                  {detailsId === 'new' ? 'Nouvelle collection' : 'Détails de la collection'}
                </DialogTitle>
                <DialogDescription className="text-[#fff4e9]/60">
                  {detailsId === 'new' ? 'Renseignez les informations et ajoutez un visuel' : 'Modifier les informations et visualiser les produits rattachés'}
                </DialogDescription>
              </DialogHeader>
              {detailsId !== 'new' && (detailsLoading || !details) ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fff4e9]" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-24 rounded overflow-hidden bg-[--site-bg] ring-1 ring-[#fff4e9]/10 flex items-center justify-center">
                      {detailsId === 'new'
                        ? (newImagePreview
                            ? <img src={newImagePreview} alt="preview" className="w-full h-full object-cover" />
                            : <ImageIcon className="w-6 h-6 text-[#fff4e9]/40" />)
                        : (details && details.category.image
                            ? <img src={details.category.image} alt={details.category.name} className="w-full h-full object-cover" />
                            : <ImageIcon className="w-6 h-6 text-[#fff4e9]/40" />)
                      }
                    </div>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-[#fff4e9]/60 mb-1">Nom</label>
                        <input
                          value={editingCat.name}
                          onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-[#fff4e9]/60 mb-1">Description</label>
                        <input
                          value={editingCat.description}
                          onChange={(e) => setEditingCat({ ...editingCat, description: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      {detailsId !== 'new' && details && (
                        <>
                          <div className="text-sm text-[#fff4e9]/60">Créée le: <span className="text-[#fff4e9]">{new Date(details.category.createdAt).toLocaleString()}</span></div>
                          <div className="text-sm text-[#fff4e9]/60">Produits: <span className="text-[#fff4e9]">{details.products.length}</span></div>
                        </>
                      )}
                      <div className="md:col-span-2">
                        <input
                          ref={newImageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onPickNewImage(f);
                          }}
                        />
                        <button
                          type="button"
                          className="px-3 py-1 rounded bg-[#fff4e9]/10 text-[#fff4e9] hover:bg-[#fff4e9]/20"
                          onClick={() => newImageInputRef.current?.click()}
                        >
                          {detailsId === 'new' ? 'Choisir une image' : 'Remplacer l’image'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    {detailsId === 'new' ? (
                      <button
                        type="button"
                        disabled={!editingCat.name}
                        onClick={async () => {
                          try {
                            const created = await productsAPI.createCategory({ name: editingCat.name, description: editingCat.description || undefined });
                            const newId: string = created.category.id;
                            if (newImageFile) {
                              const dataUrl = await fileToDataUrl(newImageFile);
                              const up = await uploadsAPI.upload(dataUrl);
                              await productsAPI.updateCategoryImage(newId, up.url as string);
                            }
                            await refreshCategories();
                            toast.success('Collection créée');
                            setDetailsId(null);
                          } catch {
                            toast.error('Échec de la création');
                          }
                        }}
                        className="px-4 py-2 bg-[#fff4e9] text-[#3d4d5d] rounded hover:bg-[#f3e7d9] transition-colors"
                      >
                        Créer
                      </button>
                    ) : (
                      details && (
                        <button
                          type="button"
                          disabled={!editingCat.name || catSavingId===details.category.id}
                          onClick={async () => {
                            try {
                              setCatSavingId(details.category.id);
                              await productsAPI.updateCategory(details.category.id, { name: editingCat.name, description: editingCat.description || undefined });
                              toast.success('Collection mise à jour');
                              await refreshCategories();
                            } catch {
                              toast.error('Échec de la mise à jour');
                            } finally {
                              setCatSavingId(null);
                            }
                          }}
                          className="px-4 py-2 bg-[#fff4e9] text-[#3d4d5d] rounded hover:bg-[#f3e7d9] transition-colors"
                        >
                          Enregistrer
                        </button>
                      )
                    )}
                  </div>
                  {detailsId !== 'new' && details && (
                    <div>
                      <h3 className="text-[#fff4e9] font-medium mb-2">Produits</h3>
                      {details.products.length === 0 ? (
                        <p className="text-[#fff4e9]/60 text-sm">Aucun produit rattaché</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                          {details.products.map(p => (
                            <a key={p.id} href={`/product/${p.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-2 rounded bg-[#2f3f4f] border border-[#fff4e9]/10 hover:bg-[#fff4e9]/5 transition-colors">
                              <div className="w-10 h-10 rounded overflow-hidden bg-[#3d4d5d] flex-shrink-0">
                                {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
                              </div>
                              <div className="flex-1">
                                <div className="text-[#fff4e9] text-sm">{p.name}</div>
                                <div className="text-[#fff4e9]/60 text-xs">${p.price}</div>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Contact Information */}
          <section className="bg-[#2a3a4a] rounded-lg p-6 border border-[#fff4e9]/10">
            <h2 className="font-display text-xl text-[#fff4e9] mb-6 flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#fff4e9]/60" />
              Contact Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#fff4e9]/60 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-[#fff4e9]/60 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Phone
                </label>
                <input
                  type="text"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-[#fff4e9]/60 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Address
                </label>
                <textarea
                  value={formData.contactAddress}
                  onChange={(e) => setFormData({ ...formData, contactAddress: e.target.value })}
                  rows={2}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Social Media */}
          <section className="bg-[#2a3a4a] rounded-lg p-6 border border-[#fff4e9]/10">
            <h2 className="font-display text-xl text-[#fff4e9] mb-6 flex items-center gap-2">
              <Instagram className="w-5 h-5 text-[#fff4e9]/60" />
              Social Media Links
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#fff4e9]/60 mb-2 flex items-center gap-2">
                  <Instagram className="w-4 h-4" /> Instagram
                </label>
                <input
                  type="text"
                  value={formData.socialInstagram}
                  onChange={(e) => setFormData({ ...formData, socialInstagram: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-[#fff4e9]/60 mb-2 flex items-center gap-2">
                  <Facebook className="w-4 h-4" /> Facebook
                </label>
                <input
                  type="text"
                  value={formData.socialFacebook}
                  onChange={(e) => setFormData({ ...formData, socialFacebook: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-[#fff4e9]/60 mb-2 flex items-center gap-2">
                  <Twitter className="w-4 h-4" /> Twitter
                </label>
                <input
                  type="text"
                  value={formData.socialTwitter}
                  onChange={(e) => setFormData({ ...formData, socialTwitter: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-[#fff4e9]/60 mb-2 flex items-center gap-2">
                  <Youtube className="w-4 h-4" /> Youtube
                </label>
                <input
                  type="text"
                  value={formData.socialYoutube}
                  onChange={(e) => setFormData({ ...formData, socialYoutube: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 pb-12">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-3 bg-[#fff4e9] text-[#3d4d5d] rounded-lg 
                       font-medium hover:bg-[#f3e7d9] transition-all duration-300 
                       disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-[#3d4d5d]/30 border-t-[#3d4d5d] rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </AdminLayout>
  );
}
