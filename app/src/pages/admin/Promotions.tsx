import { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Tag,
  Calendar,
  Clock,
  Percent,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { promotionsAPI, productsAPI } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AdminLayout from '@/components/admin/AdminLayout';
import { toast } from 'sonner';

interface Promotion {
  id: string;
  name: string;
  description: string;
  type: 'category' | 'product';
  targets: string[];
  percentage: number;
  startDate: string;
  endDate: string;
  active: boolean;
  announcementText?: string;
}

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Partial<Promotion> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [promosData, catsData, prodsData] = await Promise.all([
        promotionsAPI.getAll(),
        productsAPI.getCategories(),
        productsAPI.getAll({ limit: 1000 })
      ]);
      setPromotions(promosData.promotions);
      setCategories(catsData.categories);
      setProducts(prodsData.products);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingPromo?.name || !editingPromo?.percentage || !editingPromo?.startDate || !editingPromo?.endDate || !editingPromo?.targets?.length) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      if (editingPromo.id) {
        await promotionsAPI.update(editingPromo.id, editingPromo);
        toast.success('Promotion updated');
      } else {
        await promotionsAPI.create(editingPromo);
        toast.success('Promotion created');
      }
      fetchData();
      setIsOpen(false);
      setEditingPromo(null);
    } catch (error) {
      console.error('Save promo error:', error);
      toast.error('Failed to save promotion');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await promotionsAPI.delete(deleteId);
      toast.success('Promotion deleted');
      setPromotions(promotions.filter(p => p.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Delete promo error:', error);
      toast.error('Failed to delete promotion');
    }
  };

  const filteredPromotions = promotions.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatus = (promo: Promotion) => {
    const now = new Date();
    const start = new Date(promo.startDate);
    const end = new Date(promo.endDate);

    if (!promo.active) return { label: 'Inactive', color: 'text-red-400 bg-red-400/10' };
    if (now < start) return { label: 'Scheduled', color: 'text-blue-400 bg-blue-400/10' };
    if (now > end) return { label: 'Expired', color: 'text-gray-400 bg-gray-400/10' };
    return { label: 'Active', color: 'text-green-400 bg-green-400/10' };
  };

  return (
    <AdminLayout title="Promotions">
      <div className="flex flex-col gap-6">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#fff4e9]/40" />
            <input
              type="text"
              placeholder="Search promotions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#2a3a4a] border border-[#fff4e9]/20 rounded-lg 
                       text-[#fff4e9] placeholder:text-[#fff4e9]/40 focus:outline-none focus:border-[#fff4e9]/40"
            />
          </div>
          <button
            onClick={() => {
              setEditingPromo({
                type: 'category',
                targets: [],
                percentage: 10,
                active: true,
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              });
              setIsOpen(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-[#fff4e9] 
                     text-[#3d4d5d] rounded-lg font-medium hover:bg-[#f3e7d9] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Promotion
          </button>
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
                    <th className="px-6 py-4 text-sm font-medium text-[#fff4e9]">Promotion</th>
                    <th className="px-6 py-4 text-sm font-medium text-[#fff4e9]">Details</th>
                    <th className="px-6 py-4 text-sm font-medium text-[#fff4e9]">Period</th>
                    <th className="px-6 py-4 text-sm font-medium text-[#fff4e9]">Status</th>
                    <th className="px-6 py-4 text-sm font-medium text-[#fff4e9] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#fff4e9]/10">
                  {filteredPromotions.map((promo) => {
                    const status = getStatus(promo);
                    return (
                      <tr key={promo.id} className="hover:bg-[#fff4e9]/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-[#fff4e9]/10 flex items-center justify-center">
                              <Tag className="w-5 h-5 text-[#fff4e9]" />
                            </div>
                            <div>
                              <p className="text-[#fff4e9] font-medium">{promo.name}</p>
                              <p className="text-xs text-[#fff4e9]/50">{promo.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-[#fff4e9]">
                              <Percent className="w-3.5 h-3.5 text-[#fff4e9]/60" />
                              <span className="text-sm font-bold">{promo.percentage}%</span>
                            </div>
                            <div className="text-xs text-[#fff4e9]/60">
                              {promo.type === 'category' ? 'Categories: ' : 'Products: '}
                              {promo.targets.length} selected
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 text-xs text-[#fff4e9]/60">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(promo.startDate)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5" />
                              {formatDate(promo.endDate)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingPromo(promo);
                                setIsOpen(true);
                              }}
                              className="p-2 text-[#fff4e9]/60 hover:text-[#fff4e9] hover:bg-[#fff4e9]/10 rounded transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(promo.id)}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-[#2a3a4a] border-[#fff4e9]/20 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#fff4e9]">
              {editingPromo?.id ? 'Edit Promotion' : 'Create Promotion'}
            </DialogTitle>
            <DialogDescription className="text-[#fff4e9]/60">
              Set up a discount for specific categories or products.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#fff4e9]/80 mb-2">Name *</label>
                <input
                  type="text"
                  value={editingPromo?.name || ''}
                  onChange={(e) => setEditingPromo({ ...editingPromo, name: e.target.value })}
                  className="w-full px-4 py-2 bg-[#3d4d5d] border border-[#fff4e9]/20 rounded text-[#fff4e9]"
                  placeholder="e.g. Summer Sale"
                />
              </div>
              <div>
                <label className="block text-sm text-[#fff4e9]/80 mb-2">Description</label>
                <textarea
                  value={editingPromo?.description || ''}
                  onChange={(e) => setEditingPromo({ ...editingPromo, description: e.target.value })}
                  className="w-full px-4 py-2 bg-[#3d4d5d] border border-[#fff4e9]/20 rounded text-[#fff4e9] h-20"
                  placeholder="Details about the sale..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#fff4e9]/80 mb-2">Percentage (%) *</label>
                  <input
                    type="number"
                    value={editingPromo?.percentage || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, percentage: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-[#3d4d5d] border border-[#fff4e9]/20 rounded text-[#fff4e9]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#fff4e9]/80 mb-2">Status</label>
                  <button
                    onClick={() => setEditingPromo({ ...editingPromo, active: !editingPromo?.active })}
                    className={`w-full py-2 rounded border transition-colors ${
                      editingPromo?.active 
                        ? 'bg-green-500/20 border-green-500/40 text-green-400' 
                        : 'bg-red-500/20 border-red-500/40 text-red-400'
                    }`}
                  >
                    {editingPromo?.active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#fff4e9]/80 mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={editingPromo?.startDate?.split('T')[0] || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, startDate: e.target.value })}
                    className="w-full px-4 py-2 bg-[#3d4d5d] border border-[#fff4e9]/20 rounded text-[#fff4e9]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#fff4e9]/80 mb-2">End Date *</label>
                  <input
                    type="date"
                    value={editingPromo?.endDate?.split('T')[0] || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, endDate: e.target.value })}
                    className="w-full px-4 py-2 bg-[#3d4d5d] border border-[#fff4e9]/20 rounded text-[#fff4e9]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#fff4e9]/80 mb-2">Announcement Text</label>
                <input
                  type="text"
                  value={editingPromo?.announcementText || ''}
                  onChange={(e) => setEditingPromo({ ...editingPromo, announcementText: e.target.value })}
                  className="w-full px-4 py-2 bg-[#3d4d5d] border border-[#fff4e9]/20 rounded text-[#fff4e9]"
                  placeholder="e.g. 🔥 FLASH SALE! -30% ON ALL BRACELETS"
                />
              </div>
              <div>
                <label className="block text-sm text-[#fff4e9]/80 mb-2">Target Type *</label>
                <select
                  value={editingPromo?.type}
                  onChange={(e) => setEditingPromo({ ...editingPromo, type: e.target.value as any, targets: [] })}
                  className="w-full px-4 py-2 bg-[#3d4d5d] border border-[#fff4e9]/20 rounded text-[#fff4e9]"
                >
                  <option value="category">Whole Category</option>
                  <option value="product">Specific Products</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-[#fff4e9]/80">
              Select {editingPromo?.type === 'category' ? 'Categories' : 'Products'} *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-[#1a2a3a] rounded border border-[#fff4e9]/10">
              {(editingPromo?.type === 'category' ? categories : products).map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-xs text-[#fff4e9]/80 cursor-pointer hover:text-[#fff4e9]">
                  <input
                    type="checkbox"
                    checked={editingPromo?.targets?.includes(item.id)}
                    onChange={(e) => {
                      const targets = [...(editingPromo?.targets || [])];
                      if (e.target.checked) {
                        targets.push(item.id);
                      } else {
                        const idx = targets.indexOf(item.id);
                        if (idx > -1) targets.splice(idx, 1);
                      }
                      setEditingPromo({ ...editingPromo, targets });
                    }}
                    className="rounded border-[#fff4e9]/20 bg-transparent text-[#fff4e9]"
                  />
                  <span className="truncate">{item.name}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-[#fff4e9]/60 hover:text-[#fff4e9] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-[#fff4e9] text-[#3d4d5d] rounded-lg font-bold hover:bg-[#f3e7d9] transition-colors"
            >
              Save Promotion
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-[#2a3a4a] border-[#fff4e9]/20">
          <DialogHeader>
            <DialogTitle className="text-[#fff4e9]">Delete Promotion</DialogTitle>
            <DialogDescription className="text-[#fff4e9]/60">
              Are you sure you want to delete this promotion? This will revert all prices to original values.
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
