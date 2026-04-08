import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye
} from 'lucide-react';
import { productsAPI } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AdminLayout from '@/components/admin/AdminLayout';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  featured: boolean;
  active: boolean;
  images: string[];
  categoryName?: string;
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await productsAPI.getAll({ limit: 100 });
      setProducts(data.products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await productsAPI.delete(deleteId);
      setProducts(products.filter(p => p.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    }).format(price) + ' DNR';
  };

  return (
    <AdminLayout title="Products">
      <div className="flex flex-col gap-6">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#fff4e9]/40" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#2a3a4a] border border-[#fff4e9]/20 rounded-lg 
                       text-[#fff4e9] placeholder:text-[#fff4e9]/40 focus:outline-none focus:border-[#fff4e9]/40"
            />
          </div>
          <Link
            to="/admin/products/new"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-[#fff4e9] 
                     text-[#3d4d5d] rounded-lg font-medium hover:bg-[#f3e7d9] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fff4e9]"></div>
          </div>
        ) : (
          <div className="bg-[#2a3a4a] rounded-lg overflow-hidden border border-[#fff4e9]/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#fff4e9]/10 bg-[#fff4e9]/5">
                    <th className="px-6 py-4 text-sm font-medium text-[#fff4e9]">Product</th>
                    <th className="hidden md:table-cell px-6 py-4 text-sm font-medium text-[#fff4e9]">Category</th>
                    <th className="px-6 py-4 text-sm font-medium text-[#fff4e9]">Price</th>
                    <th className="hidden md:table-cell px-6 py-4 text-sm font-medium text-[#fff4e9]">Stock</th>
                    <th className="hidden md:table-cell px-6 py-4 text-sm font-medium text-[#fff4e9]">Status</th>
                    <th className="px-6 py-4 text-sm font-medium text-[#fff4e9] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#fff4e9]/10">
                  {filteredProducts.map((product) => (
                    <tr 
                      key={product.id} 
                      className="hover:bg-[#fff4e9]/5 transition-colors cursor-pointer md:cursor-default"
                      onClick={() => {
                        if (window.innerWidth < 768) {
                          // We don't have a specific "detail" dialog for products,
                          // but we can redirect to edit or show delete confirmation.
                          // Here we'll redirect to edit as it shows full details.
                          window.location.href = `/admin/products/edit/${product.id}`;
                        }
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-[#3d4d5d] overflow-hidden flex-shrink-0">
                            <img
                              src={product.images[0] || '/images/placeholder.jpg'}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-[#fff4e9] font-medium truncate">{product.name}</span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 text-[#fff4e9]/60">
                        {product.categoryName || 'Uncategorized'}
                      </td>
                      <td className="px-6 py-4 text-[#fff4e9]">
                        {formatPrice(product.price)}
                      </td>
                      <td className="hidden md:table-cell px-6 py-4 text-[#fff4e9]">
                        {product.stock}
                      </td>
                      <td className="hidden md:table-cell px-6 py-4">
                        <div className="flex gap-2">
                          {product.featured && (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                              Featured
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs rounded ${
                            product.active
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {product.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`/product/${product.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-[#fff4e9]/60 hover:text-[#fff4e9] hover:bg-[#fff4e9]/10 rounded transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          <Link
                            to={`/admin/products/edit/${product.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-[#fff4e9]/60 hover:text-[#fff4e9] hover:bg-[#fff4e9]/10 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(product.id);
                            }}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-[#2a3a4a] border-[#fff4e9]/20">
          <DialogHeader>
            <DialogTitle className="text-[#fff4e9]">Delete Product</DialogTitle>
            <DialogDescription className="text-[#fff4e9]/60">
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteId(null)}
              className="px-4 py-2 text-[#fff4e9]/60 hover:text-[#fff4e9] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
