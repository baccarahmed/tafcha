import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { productsAPI, uploadsAPI } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  comparePrice?: number;
  stock: number;
  sku?: string;
  categoryId?: string;
  images?: string[];
  featured: boolean;
}

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    comparePrice: '',
    stock: '',
    sku: '',
    categoryId: '',
    images: [] as string[],
    featured: false,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditMode);
  const [error, setError] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await productsAPI.getCategories();
      setCategories(data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  const fetchProduct = useCallback(async () => {
    try {
      const data = await productsAPI.getAll({ limit: 100 });
      const product = (data.products as Product[]).find((p) => p.id === id);
      
      if (product) {
        setFormData({
          name: product.name,
          description: product.description || '',
          price: product.price.toString(),
          comparePrice: product.comparePrice?.toString() || '',
          stock: product.stock.toString(),
          sku: product.sku || '',
          categoryId: product.categoryId || '',
          images: product.images || [],
          featured: product.featured,
        });
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setIsFetching(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCategories();
    if (isEditMode) {
      fetchProduct();
    }
  }, [fetchCategories, fetchProduct, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        comparePrice: formData.comparePrice ? parseFloat(formData.comparePrice) : undefined,
        stock: parseInt(formData.stock),
      };

      if (isEditMode) {
        await productsAPI.update(id!, productData);
      } else {
        await productsAPI.create(productData);
      }

      navigate('/admin/products');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  const addImage = () => {
    if (newImageUrl && !formData.images.includes(newImageUrl)) {
      setFormData({
        ...formData,
        images: [...formData.images, newImageUrl],
      });
      setNewImageUrl('');
    }
  };

  const removeImage = (url: string) => {
    setFormData({
      ...formData,
      images: formData.images.filter((img) => img !== url),
    });
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setIsUploading(true);
    try {
      const toDataUrl = (f: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });
      const dataUrl = await toDataUrl(file);
      const resp = await uploadsAPI.upload(dataUrl);
      const url = resp.url as string;
      setFormData((prev) => ({ ...prev, images: [...prev.images, url] }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const inputClass = "w-full px-4 py-3 bg-[#2a3a4a]/50 border border-[#fff4e9]/20 rounded-lg text-[#fff4e9] \
                      placeholder-[#fff4e9]/40 focus:outline-none focus:border-[#fff4e9]/50 transition-colors";

  return (
    <AdminLayout title={isEditMode ? 'Edit Product' : 'Add New Product'}>
      {isFetching ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fff4e9]"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-4xl space-y-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <section className="bg-[#2a3a4a]/50 rounded-lg p-6 border border-[#fff4e9]/10 space-y-4">
            <div>
              <label className="block text-sm text-[#fff4e9]/60 mb-2">Product Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputClass}
                placeholder="e.g. Diamond Necklace"
              />
            </div>
            <div>
              <label className="block text-sm text-[#fff4e9]/60 mb-2">Description</label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className={inputClass}
                placeholder="Describe your product..."
              />
            </div>
          </section>

          {/* Pricing & Inventory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-[#2a3a4a]/50 rounded-lg p-6 border border-[#fff4e9]/10 space-y-4">
              <h3 className="text-[#fff4e9] font-medium border-b border-[#fff4e9]/10 pb-4 mb-4">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#fff4e9]/60 mb-2">Price (DNR)</label>
                  <input
                    type="number"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className={inputClass}
                    placeholder="0 DNR"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#fff4e9]/60 mb-2">Compare Price (DNR)</label>
                  <input
                    type="number"
                    value={formData.comparePrice}
                    onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
                    className={inputClass}
                    placeholder="0 DNR"
                  />
                </div>
              </div>
            </section>

            <section className="bg-[#2a3a4a]/50 rounded-lg p-6 border border=[#fff4e9]/10 space-y-4">
              <h3 className="text-[#fff4e9] font-medium border-b border-[#fff4e9]/10 pb-4 mb-4">Inventory</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#fff4e9]/60 mb-2">Stock</label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#fff4e9]/60 mb-2">SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className={inputClass}
                    placeholder="Unique identifier"
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Organization */}
          <section className="bg-[#2a3a4a]/50 rounded-lg p-6 border border-[#fff4e9]/10 space-y-4">
            <h3 className="text-[#fff4e9] font-medium border-b border-[#fff4e9]/10 pb-4 mb-4">Organization</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-[#fff4e9]/60 mb-2">Category</label>
                <select
                  required
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-8">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-5 h-5 rounded border-[#fff4e9]/20 bg-[#2a3a4a]/50 text-[#fff4e9] focus:ring-0"
                />
                <label htmlFor="featured" className="text-sm text-[#fff4e9]/80 cursor-pointer">
                  Featured Product
                </label>
              </div>
            </div>
          </section>

          {/* Images */}
          <section className="bg-[#2a3a4a]/50 rounded-lg p-6 border border-[#fff4e9]/10 space-y-4">
            <h3 className="text-[#fff4e9] font-medium border-b border-[#fff4e9]/10 pb-4 mb-4">Images</h3>
            <div className="flex flex-col gap-3">
              {uploadError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded text-sm">
                  {uploadError}
                </div>
              )}
              <div className="flex gap-2">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className={inputClass}
                placeholder="Enter image URL"
              />
              <button
                type="button"
                onClick={addImage}
                className="px-4 py-2 bg-[#fff4e9]/10 text-[#fff4e9] rounded-lg hover:bg-[#fff4e9]/20 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileSelected} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[#fff4e9] text-[#3d4d5d] rounded-lg hover:bg-[#f3e7d9] transition-colors"
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
              {formData.images.map((url, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-[#3d4d5d] group">
                  <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full 
                             opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-4 pb-12">
            <button
              type="button"
              onClick={() => navigate('/admin/products')}
              className="px-8 py-3 text-[#fff4e9]/60 hover:text-[#fff4e9] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-8 py-3 bg-[#fff4e9] text-[#3d4d5d] rounded-lg 
                       font-medium hover:bg-[#f3e7d9] transition-all duration-300 
                       disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading && <div className="w-4 h-4 border-2 border-[#3d4d5d]/30 border-t-[#3d4d5d] rounded-full animate-spin" />}
              {isEditMode ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      )}
    </AdminLayout>
  );
}
