import { useEffect, useState } from 'react';
import { ordersAPI } from '@/services/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { 
  IconPackage,
  IconCheck,
  IconClock,
  IconTruck
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface OrderAddress {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  images?: string[];
}

interface OrderData {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  status: string;
  total: number;
  createdAt: string;
  shippingAddress?: string | OrderAddress;
  billingAddress?: string | OrderAddress;
  items?: OrderItem[];
  deliveryProofUrl?: string;
  deliveryWindowStart?: string;
  deliveryWindowEnd?: string;
  email?: string;
  phone?: string;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<OrderData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      fetchOrders();
    }, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const base = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '';
    try {
      const es = new EventSource(`${base}/api/orders/events`);
      es.addEventListener('order_created', () => fetchOrders());
      es.addEventListener('order_updated', () => fetchOrders());
      return () => es.close();
    } catch (e) {
      console.error('EventSource failed:', e);
    }
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await ordersAPI.getAll();
      setOrders(data.orders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      if (!selectedId) return;
      try {
        const data = await ordersAPI.getById(selectedId);
        // Parse adresses JSON éventuelles
        const o = { ...data.order } as OrderData;
        if (typeof o.shippingAddress === 'string') {
          try { o.shippingAddress = JSON.parse(o.shippingAddress); } catch (e) { console.error('Parse shipping address failed', e); }
        }
        if (typeof o.billingAddress === 'string') {
          try { o.billingAddress = JSON.parse(o.billingAddress); } catch (e) { console.error('Parse billing address failed', e); }
        }
        setSelected(o);
      } catch (e) {
        console.error('Failed to load order', e);
      }
    };
    load();
  }, [selectedId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <IconCheck className="w-4 h-4 text-green-400" />;
      case 'shipped': return <IconTruck className="w-4 h-4 text-blue-400" />;
      default: return <IconClock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
    }).format(price) + ' DNR';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const [etaStart, setEtaStart] = useState('');
  const [etaEnd, setEtaEnd] = useState('');

  const confirmOrder = async (id: string) => {
    try {
      setIsUpdating(true);
      await ordersAPI.updateStatusWithEta(id, { status: 'processing', deliveryWindowStart: etaStart || null, deliveryWindowEnd: etaEnd || null });
      toast.success('Commande confirmée');
      await fetchOrders();
      setSelectedId(null);
      setEtaStart('');
      setEtaEnd('');
    } catch (e) {
      console.error('Update status failed', e);
      toast.error('Échec de la mise à jour');
    } finally {
      setIsUpdating(false);
    }
  };

  const rejectOrder = async (id: string) => {
    try {
      setIsUpdating(true);
      await ordersAPI.updateStatus(id, { status: 'cancelled' });
      toast.success('Commande rejetée');
      await fetchOrders();
      setSelectedId(null);
    } catch (e) {
      console.error('Update status failed', e);
      toast.error('Échec de la mise à jour');
    } finally {
      setIsUpdating(false);
    }
  };

  const detailAddress = (addr?: { firstName?: string; lastName?: string }) =>
    addr ? [addr.firstName, addr.lastName].filter(Boolean).join(' ') : '';

  return (
    <AdminLayout title="Orders">
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fff4e9]"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-[#2a3a4a] rounded-lg border border-[#fff4e9]/10">
          <IconPackage className="w-12 h-12 text-[#fff4e9]/20 mx-auto mb-4" />
          <p className="text-[#fff4e9]/60">No orders found</p>
        </div>
      ) : (
        <div className="bg-[#2a3a4a] rounded-lg overflow-hidden border border-[#fff4e9]/10">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#fff4e9]/10 bg-[#fff4e9]/5">
                <th className="px-6 py-4 text-sm font-medium text-[#fff4e9]">Order ID</th>
                <th className="px-6 py-4 text-sm font-medium text-[#fff4e9]">Customer</th>
                <th className="px-6 py-4 text-sm font-medium text-[#fff4e9]">Date</th>
                <th className="px-6 py-4 text-sm font-medium text-[#fff4e9]">Total</th>
                <th className="px-6 py-4 text-sm font-medium text-[#fff4e9]">Status</th>
                <th className="px-6 py-4 text-sm font-medium text-[#fff4e9] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#fff4e9]/10">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-[#fff4e9]/5 transition-colors">
                  <td className="px-6 py-4 text-[#fff4e9] font-mono text-xs">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[#fff4e9]">{order.userName || 'Customer'}</p>
                    <p className="text-xs text-[#fff4e9]/50">{order.userEmail}</p>
                  </td>
                  <td className="px-6 py-4 text-[#fff4e9]/60">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-[#fff4e9] font-medium">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      <span className="text-xs text-[#fff4e9] capitalize">{order.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedId(order.id)}
                        className="px-3 py-1 text-xs rounded border border-[#fff4e9]/30 text-[#fff4e9]/80 hover:text-[#fff4e9]"
                      >
                        Voir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selectedId} onOpenChange={() => setSelectedId(null)}>
        <DialogContent className="bg-[#2a3a4a] border-[#fff4e9]/20 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#fff4e9]">Détails de la commande</DialogTitle>
            <DialogDescription className="text-[#fff4e9]/60">
              Informations client, adresses et articles
            </DialogDescription>
          </DialogHeader>
          {!selected ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fff4e9]" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#fff4e9]/60 mb-2">Début livraison</label>
                  <input
                    type="date"
                    value={etaStart}
                    onChange={(e) => setEtaStart(e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-[#fff4e9]/20 rounded text-[#fff4e9]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#fff4e9]/60 mb-2">Fin livraison</label>
                  <input
                    type="date"
                    value={etaEnd}
                    onChange={(e) => setEtaEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-transparent border border-[#fff4e9]/20 rounded text-[#fff4e9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="space-y-2">
                  <h3 className="text-[#fff4e9] font-medium">Livraison</h3>
                  <p className="text-sm text-[#fff4e9]">{detailAddress(selected.shippingAddress as OrderAddress)}</p>
                  <p className="text-sm text-[#fff4e9]/70">{(selected.shippingAddress as OrderAddress)?.address}</p>
                  <p className="text-sm text-[#fff4e9]/70">
                    {[(selected.shippingAddress as OrderAddress)?.city, (selected.shippingAddress as OrderAddress)?.postalCode, (selected.shippingAddress as OrderAddress)?.country].filter(Boolean).join(', ')}
                  </p>
                  {(selected.shippingAddress as OrderAddress)?.phone && (
                    <p className="text-sm text-[#fff4e9]/70">Tél: {(selected.shippingAddress as OrderAddress).phone}</p>
                  )}
                </section>
                <section className="space-y-2">
                  <h3 className="text-[#fff4e9] font-medium">Facturation</h3>
                  <p className="text-sm text-[#fff4e9]">{detailAddress(selected.billingAddress as OrderAddress)}</p>
                  <p className="text-sm text-[#fff4e9]/70">{(selected.billingAddress as OrderAddress)?.address}</p>
                  <p className="text-sm text-[#fff4e9]/70">
                    {[(selected.billingAddress as OrderAddress)?.city, (selected.billingAddress as OrderAddress)?.postalCode, (selected.billingAddress as OrderAddress)?.country].filter(Boolean).join(', ')}
                  </p>
                  {(selected.billingAddress as OrderAddress)?.phone && (
                    <p className="text-sm text-[#fff4e9]/70">Tél: {(selected.billingAddress as OrderAddress).phone}</p>
                  )}
                </section>
              </div>

              <div>
                <h3 className="text-sm text-[#fff4e9]/60 uppercase tracking-wider mb-3">Articles</h3>
                <div className="space-y-3">
                  {(selected.items || []).map((it: OrderItem) => (
                    <div key={it.id} className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded bg-[#fff4e9]/5 overflow-hidden">
                        <img src={it.images?.[0] || '/images/placeholder.jpg'} alt={it.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[#fff4e9]">{it.name}</p>
                        <p className="text-xs text-[#fff4e9]/60">Qty: {it.quantity}</p>
                      </div>
                      <div className="text-[#fff4e9]">{formatPrice(it.price * it.quantity)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#fff4e9]/10 pt-4">
                <span className="text-[#fff4e9]/80">Total</span>
                <span className="font-display text-xl text-[#fff4e9]">{formatPrice(selected.total)}</span>
              </div>

              {selected.deliveryProofUrl && (
                <div className="pt-2">
                  <h4 className="text-sm text-[#fff4e9]/60 uppercase tracking-wider mb-2">Preuve de livraison</h4>
                  <div className="w-full max-w-xs rounded border border-[#fff4e9]/10 overflow-hidden">
                    <img src={selected.deliveryProofUrl} alt="Preuve de livraison" className="w-full h-auto object-cover" />
                  </div>
                </div>
              )}

              {(selected.deliveryWindowStart || selected.deliveryWindowEnd) && (
                <div className="flex items-center justify-between">
                  <span className="text-[#fff4e9]/60">Livraison estimée</span>
                  <span className="text-[#fff4e9]">
                    {selected.deliveryWindowStart || '—'}{selected.deliveryWindowEnd ? ` → ${selected.deliveryWindowEnd}` : ''}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => selected && rejectOrder(selected.id)}
                  disabled={isUpdating}
                  className="px-4 py-2 rounded border border-red-400/40 text-red-300 hover:bg-red-500/10"
                >
                  Rejeter
                </button>
                <button
                  onClick={() => selected && confirmOrder(selected.id)}
                  disabled={isUpdating}
                  className="px-4 py-2 rounded bg-[#fff4e9] text-[#3d4d5d] hover:bg-[#f3e7d9]"
                >
                  Confirmer
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
