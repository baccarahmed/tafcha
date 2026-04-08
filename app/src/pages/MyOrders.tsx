import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { User, Package, Heart, ChevronRight, Truck, CheckCircle, Clock } from 'lucide-react';
import Navigation from '@/sections/Navigation';
import Footer from '@/sections/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useAuth } from '@/contexts/AuthContext';
import { ordersAPI, productsAPI } from '@/services/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  deliveryWindowStart?: string | null;
  deliveryWindowEnd?: string | null;
  items: {
    id: string;
    productId?: string;
    name: string;
    price: number;
    quantity: number;
    images?: string[];
    slug?: string;
  }[];
}

export default function MyOrders() {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [review, setReview] = useState<Record<string, { rating: number; comment: string; imageUrl?: string; uploading?: boolean }>>({});
  const [confirmArmed, setConfirmArmed] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await ordersAPI.getMyOrders();
        setOrders(data.orders);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
    const id = setInterval(fetchOrders, 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setConfirmArmed(false);
  }, [selectedOrder?.id]);

  useEffect(() => {
    const base = (import.meta as any).env?.VITE_API_URL || '';
    try {
      const es = new EventSource(`${base}/api/orders/events`);
      const onEvent = () => {
        ordersAPI.getMyOrders().then((data) => setOrders(data.orders)).catch(() => {});
      };
      es.addEventListener('order_created', onEvent);
      es.addEventListener('order_updated', onEvent);
      return () => es.close();
    } catch {
      // ignore
    }
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const menuItems = [
    { name: 'My Profile', icon: User, href: '/account' },
    { name: 'My Orders', icon: Package, href: '/account/orders', active: true },
    { name: 'Wishlist', icon: Heart, href: '/account/wishlist' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-blue-400" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-[#fff4e9]/40" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'shipped':
        return 'bg-blue-500/20 text-blue-400';
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-[#fff4e9]/10 text-[#fff4e9]/60';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    }).format(price) + ' DNR';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const cancelOrder = async (id: string) => {
    try {
      setIsCancelling(id);
      await ordersAPI.cancel(id);
      const data = await ordersAPI.getMyOrders();
      setOrders(data.orders);
      toast.success('Order cancelled');
      setSelectedOrder(null);
    } catch {
      toast.error('Failed to cancel order');
    } finally {
      setIsCancelling(null);
    }
  };

  return (
    <div className="min-h-screen bg-[--site-bg]">
      <Navigation />
      
      {/* Header */}
      <div className="pt-32 pb-12 section-padding border-b border-[#fff4e9]/10">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-4xl sm:text-5xl text-[#fff4e9] mb-2">
            My Orders
          </h1>
          <p className="text-[#fff4e9]/60">
            View and track your order history
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="py-12 section-padding">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <aside className="lg:col-span-1">
              <div className="border border-[#fff4e9]/10 rounded-lg p-4">
                <nav className="space-y-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          item.active
                            ? 'bg-[#fff4e9]/10 text-[#fff4e9]'
                            : 'text-[#fff4e9]/60 hover:bg-[#fff4e9]/5 hover:text-[#fff4e9]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {item.name}
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-[#fff4e9]/5 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="border border-[#fff4e9]/10 rounded-lg p-12 text-center">
                  <Package className="w-16 h-16 text-[#fff4e9]/20 mx-auto mb-4" />
                  <h2 className="font-display text-2xl text-[#fff4e9] mb-2">
                    No Orders Yet
                  </h2>
                  <p className="text-[#fff4e9]/60 mb-6">
                    You haven't placed any orders yet. Start shopping to see your orders here.
                  </p>
                  <Link to="/shop" className="btn-primary">
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-[#fff4e9]/10 rounded-lg p-6 cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      {/* Order Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 pb-4 border-b border-[#fff4e9]/10">
                        <div>
                          <p className="text-sm text-[#fff4e9]/60 mb-1">
                            Order #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-[#fff4e9]">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 mt-4 sm:mt-0">
                          <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                      {(order.deliveryWindowStart || order.deliveryWindowEnd) && (
                        <span className="px-3 py-1 rounded-full text-xs bg-[#fff4e9]/10 text-[#fff4e9]">
                          {order.deliveryWindowStart || '—'}{order.deliveryWindowEnd ? ` → ${order.deliveryWindowEnd}` : ''}
                        </span>
                      )}
                          <span className="font-display text-xl text-[#fff4e9]">
                            {formatPrice(order.total)}
                          </span>
                        </div>
                      </div>

                      {/* Order Items Preview */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex -space-x-3">
                          {order.items.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className="w-12 h-12 rounded-full border-2 border-[#fff4e9]/10 bg-[#fff4e9]/5 overflow-hidden"
                            >
                              <img
                                src={item.images?.[0] || '/images/placeholder.jpg'}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="w-12 h-12 rounded-full border-2 border-[#fff4e9]/10 bg-[#fff4e9]/5 flex items-center justify-center">
                              <span className="text-xs text-[#fff4e9]">
                                +{order.items.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-[#fff4e9]/60 text-sm">
                          {order.items.length} item{order.items.length > 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Actions déplacées dans le dialogue de détails */}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="bg-transparent backdrop-blur-xl border-[#fff4e9]/20 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#fff4e9] font-display text-2xl">
              Order Details
            </DialogTitle>
            <DialogDescription className="text-[#fff4e9]/60">
              View information about your order including items and total cost.
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="flex items-center justify-between pb-4 border-b border-[#fff4e9]/10">
                <div>
                  <p className="text-sm text-[#fff4e9]/60">
                    Order #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-[#fff4e9]">
                    {formatDate(selectedOrder.createdAt)}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusIcon(selectedOrder.status)}
                  {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                </span>
              </div>

              {/* Actions (annuler / confirmer réception) */}
              <div className="flex items-center gap-3">
                {selectedOrder.status === 'pending' && (
                  <button
                    onClick={() => cancelOrder(selectedOrder.id)}
                    disabled={isCancelling === selectedOrder.id}
                    className="px-4 py-2 border border-red-400/40 text-red-300 rounded hover:bg-red-500/10 transition-colors text-sm"
                  >
                    {isCancelling === selectedOrder.id ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                )}
                {['processing','shipped'].includes(selectedOrder.status) && (
                  <button
                    onClick={async () => {
                      if (!confirmArmed) {
                        toast.info('Please confirm receipt. You can also leave a review and a photo (optional). Click again to validate.');
                        setConfirmArmed(true);
                        return;
                      }
                      try {
                        await ordersAPI.confirmDelivery(selectedOrder.id, { proofUrl: '' });
                        const data = await ordersAPI.getMyOrders();
                        setOrders(data.orders);
                        toast.success('Delivery confirmed');
                        setSelectedOrder(null);
                      } catch {
                        toast.error('Failed to confirm delivery');
                      } finally {
                        setConfirmArmed(false);
                      }
                    }}
                    className="px-4 py-2 border border-green-400/40 text-green-300 rounded hover:bg-green-500/10 transition-colors text-sm"
                  >
                    {confirmArmed ? 'Confirm Now' : 'Confirm Delivery'}
                  </button>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className="text-sm text-[#fff4e9]/60 uppercase tracking-wider mb-4">
                  Items
                </h3>
                <div className="space-y-4">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex flex-col gap-3 border border-[#fff4e9]/10 rounded-lg p-3">
                      <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg bg-[#fff4e9]/5 overflow-hidden">
                        <img
                          src={item.images?.[0] || '/images/placeholder.jpg'}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-[#fff4e9] font-medium">{item.name}</p>
                        <p className="text-sm text-[#fff4e9]/60">
                          Qty: {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <p className="text-[#fff4e9] font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                      </div>
                      {(selectedOrder.status === 'completed' || confirmArmed) && (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#fff4e9]/60">Rating</span>
                            {[1,2,3,4,5].map((n) => (
                              <button
                                key={n}
                                onClick={() => setReview(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || { comment: '' }), rating: n } }))}
                                className={`px-2 py-1 rounded border ${((review[item.id]?.rating || 0) >= n) ? 'border-yellow-400 text-yellow-300' : 'border-[#fff4e9]/20 text-[#fff4e9]/60'}`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                          <textarea
                            placeholder="Your review (optional)"
                            value={review[item.id]?.comment || ''}
                            onChange={(e) => setReview(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || { rating: 0 }), comment: e.target.value } }))}
                            className="w-full px-3 py-2 bg-transparent border border-[#fff4e9]/20 rounded text-[#fff4e9] placeholder-[#fff4e9]/40"
                            rows={3}
                          />
                          <div className="flex items-center gap-3">
                            <label className="px-3 py-2 border border-[#fff4e9]/30 text-[#fff4e9] rounded cursor-pointer hover:bg-[#fff4e9]/10">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  setReview(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || { rating: 0, comment: '' }), uploading: true } }));
                                  try {
                                    const toDataUrl = (f: File) => new Promise<string>((resolve, reject) => {
                                      const reader = new FileReader();
                                      reader.onload = () => resolve(reader.result as string);
                                      reader.onerror = reject;
                                      reader.readAsDataURL(f);
                                    });
                                    const dataUrl = await toDataUrl(file);
                                    const up = await (await import('@/services/api')).uploadsAPI.upload(dataUrl);
                                    const url = up.url as string;
                                    setReview(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || { rating: 0, comment: '' }), imageUrl: url, uploading: false } }));
                                  } catch {
                                    setReview(prev => ({ ...prev, [item.id]: { ...(prev[item.id] || { rating: 0, comment: '' }), uploading: false } }));
                                    toast.error('Upload failed');
                                  } finally {
                                    if (e.target) e.target.value = '';
                                  }
                                }}
                              />
                              {review[item.id]?.uploading ? 'Uploading...' : 'Ajouter une photo'}
                            </label>
                            {review[item.id]?.imageUrl && (
                              <img src={review[item.id]?.imageUrl} alt="review" className="w-12 h-12 object-cover rounded border border-[#fff4e9]/20" />
                            )}
                            <button
                              onClick={async () => {
                                if (selectedOrder.status !== 'completed') {
                                  toast.info('Veuillez finaliser la confirmation pour envoyer votre avis.');
                                  return;
                                }
                                const r = review[item.id]?.rating || 0;
                                if (r < 1) {
                                  toast.error('Veuillez choisir une note');
                                  return;
                                }
                                try {
                                  await productsAPI.addReview(item.productId || '', {
                                    rating: r,
                                    comment: review[item.id]?.comment || '',
                                    imageUrl: review[item.id]?.imageUrl,
                                    orderId: selectedOrder.id,
                                  });
                                  toast.success('Avis ajouté');
                                  setReview(prev => ({ ...prev, [item.id]: { rating: 0, comment: '', imageUrl: undefined } }));
                                } catch {
                                  toast.error('Échec de l’envoi de l’avis');
                                }
                              }}
                              className="ml-auto px-3 py-2 bg-[#fff4e9] text-[#3d4d5d] rounded hover:bg-[#f3e7d9]"
                            >
                              Envoyer l’avis
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 border-t border-[#fff4e9]/10">
                <div className="flex items-center justify-between">
                  <span className="text-[#fff4e9]/60">Total</span>
                  <span className="font-display text-2xl text-[#fff4e9]">
                    {formatPrice(selectedOrder.total)}
                  </span>
                </div>
                {(selectedOrder.deliveryWindowStart || selectedOrder.deliveryWindowEnd) && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[#fff4e9]/60">Estimated Delivery</span>
                    <span className="text-[#fff4e9]">
                      {selectedOrder.deliveryWindowStart || '—'}{selectedOrder.deliveryWindowEnd ? ` → ${selectedOrder.deliveryWindowEnd}` : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
      <CartDrawer />
    </div>
  );
}
