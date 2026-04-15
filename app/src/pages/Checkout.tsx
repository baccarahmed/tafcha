import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/sections/Navigation';
import Footer from '@/sections/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useCart } from '@/contexts/CartContext';
import { ordersAPI } from '@/services/api';
import { useSettings } from '@/hooks/useSettings';
import { toast } from 'sonner';
import SlideToConfirm from '@/components/ui/SlideToConfirm';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, totalItems, totalPrice, clearCart } = useCart();
  const { settings } = useSettings();
  const [isPlacing, setIsPlacing] = useState(false);
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [shipping, setShipping] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    phone: '',
  });
  const [billing, setBilling] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    phone: '',
  });
  const [paymentMethod] = useState('cod');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (items.length === 0) {
      navigate('/shop', { replace: true });
    }
  }, [items.length, navigate]);

  const canPlaceOrder = useMemo(() => {
    const s = shipping;
    const b = useSameAddress ? shipping : billing;
    const required = [s.firstName, s.lastName, s.address, s.city, s.country, s.postalCode, b.firstName, b.lastName, b.address, b.city, b.country, b.postalCode];
    return required.every(Boolean) && items.length > 0 && !isPlacing;
  }, [shipping, billing, useSameAddress, items.length, isPlacing]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    }).format(price) + ' DNR';
  };

  const handlePlaceOrder = async () => {
    if (!canPlaceOrder) return;
    setIsPlacing(true);
    try {
      const payload: Record<string, unknown> = {
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress: shipping,
        billingAddress: useSameAddress ? shipping : billing,
        paymentMethod,
        notes: notes || undefined,
      };
      const res = await ordersAPI.create(payload);
      clearCart();
      toast.success('Order placed successfully');
      navigate('/account/orders');
      return res;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Order failed');
    } finally {
      setIsPlacing(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 bg-transparent border border-[#fff4e9]/20 rounded text-[#fff4e9] placeholder-[#fff4e9]/40 focus:outline-none focus:border-[#fff4e9]/50 transition-colors';
  const labelClass = 'block text-sm text-[#fff4e9]/60 mb-2';
  const sectionClass = 'bg-[#2a3a4a]/50 rounded-lg p-6 border border-[#fff4e9]/10 space-y-4';

  return (
    <div className="min-h-screen bg-[--site-bg]">
      <Navigation />
      <div className="pt-32 pb-16 section-padding">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-display text-4xl sm:text-5xl text-[#fff4e9] mb-2">Checkout</h1>
          <p className="text-[#fff4e9]/60 mb-8">Complete your order by providing the necessary information</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section className="bg-[#2a3a4a]/50 rounded-lg p-6 border border-[#fff4e9]/10 space-y-4">
                <h2 className="text-[#fff4e9] font-medium border-b border-[#fff4e9]/10 pb-4 mb-4">Shipping Address</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>First Name</label>
                    <input value={shipping.firstName} onChange={e => setShipping({ ...shipping, firstName: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Last Name</label>
                    <input value={shipping.lastName} onChange={e => setShipping({ ...shipping, lastName: e.target.value })} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Address</label>
                  <input value={shipping.address} onChange={e => setShipping({ ...shipping, address: e.target.value })} className={inputClass} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>City</label>
                    <input value={shipping.city} onChange={e => setShipping({ ...shipping, city: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Country</label>
                    <input value={shipping.country} onChange={e => setShipping({ ...shipping, country: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Postal Code</label>
                    <input value={shipping.postalCode} onChange={e => setShipping({ ...shipping, postalCode: e.target.value })} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input value={shipping.phone} onChange={e => setShipping({ ...shipping, phone: e.target.value })} className={inputClass} />
                </div>
              </section>

              <section className={sectionClass}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[#fff4e9] font-medium">Billing Address</h2>
                  <label className="flex items-center gap-2 text-sm text-[#fff4e9]/80">
                    <input type="checkbox" checked={useSameAddress} onChange={e => setUseSameAddress(e.target.checked)} className="w-4 h-4" />
                    Same as shipping
                  </label>
                </div>
                {!useSameAddress && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>First Name</label>
                        <input value={billing.firstName} onChange={e => setBilling({ ...billing, firstName: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Last Name</label>
                        <input value={billing.lastName} onChange={e => setBilling({ ...billing, lastName: e.target.value })} className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Address</label>
                      <input value={billing.address} onChange={e => setBilling({ ...billing, address: e.target.value })} className={inputClass} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass}>City</label>
                        <input value={billing.city} onChange={e => setBilling({ ...billing, city: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Country</label>
                        <input value={billing.country} onChange={e => setBilling({ ...billing, country: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Postal Code</label>
                        <input value={billing.postalCode} onChange={e => setBilling({ ...billing, postalCode: e.target.value })} className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Phone</label>
                      <input value={billing.phone} onChange={e => setBilling({ ...billing, phone: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                )}
              </section>

              <section className={sectionClass}>
                <h2 className="text-[#fff4e9] font-medium border-b border-[#fff4e9]/10 pb-4 mb-4">Payment</h2>
                <div className="px-4 py-3 rounded border border-[#fff4e9]/30 text-[#fff4e9]">
                  Method: Cash on Delivery (COD)
                </div>
                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className={inputClass} placeholder="Instructions for delivery..." />
                </div>
              </section>
            </div>

            <aside className="lg:col-span-1">
              <div className="bg-[#2a3a4a]/50 rounded-lg p-6 border border-[#fff4e9]/10 sticky top-28">
                <h3 className="text-[#fff4e9] font-medium mb-4">Summary</h3>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
                  {items.map(i => (
                    <div key={i.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded bg-[#fff4e9]/5 overflow-hidden">
                          <img src={i.image || '/images/placeholder.jpg'} alt={i.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-[#fff4e9]">
                          <p className="text-sm">{i.name}</p>
                          <p className="text-xs text-[#fff4e9]/60">x{i.quantity}</p>
                        </div>
                      </div>
                      <span className="text-[#fff4e9]">{formatPrice(i.price * i.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm text-[#fff4e9]/70 mb-1">
                  <span>Subtotal</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-[#fff4e9]/70 mb-1">
                  <span>Shipping</span>
                  <span>
                    {formatPrice(
                      totalPrice >= (settings?.freeShippingThresholdDNR ?? 100)
                        ? 0
                        : (settings?.shippingCostDNR ?? 10)
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-[#fff4e9]/70 mb-4">
                  <span>Taxes</span>
                  <span>{formatPrice(totalPrice * 0.1)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#fff4e9]/10 pt-4 mb-6">
                  <span className="text-[#fff4e9]/80">Total</span>
                  <span className="font-display text-2xl text-[#fff4e9]">
                    {formatPrice(
                      totalPrice
                      + (totalPrice >= (settings?.freeShippingThresholdDNR ?? 100) ? 0 : (settings?.shippingCostDNR ?? 10))
                      + totalPrice * 0.1
                    )}
                  </span>
                </div>
                <div className="w-full">
                  {isPlacing ? (
                    <div className="w-full h-16 flex items-center justify-center rounded-full bg-[#fff4e9]/10 border border-[#fff4e9]/20">
                      <span className="w-6 h-6 border-2 border-[#fff4e9] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <SlideToConfirm 
                      onConfirm={handlePlaceOrder}
                      disabled={!canPlaceOrder}
                      text={`   Slide to place order`}
                      confirmedText="Placing order..."
                    />
                  )}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      <Footer />
      <CartDrawer />
    </div>
  );
}
