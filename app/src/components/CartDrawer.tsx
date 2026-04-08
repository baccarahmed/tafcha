import { Link } from 'react-router-dom';
import { Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import SlideToConfirm from '@/components/ui/SlideToConfirm';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export default function CartDrawer() {
  const navigate = useNavigate();
  const { items, isOpen, closeCart, totalItems, totalPrice, updateQuantity, removeItem } = useCart();

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    }).format(price) + ' DNR';
  };

  return (
    <Sheet open={isOpen} onOpenChange={closeCart}>
      <SheetContent className="bg-transparent backdrop-blur-xl border-[#fff4e9]/20 w-full sm:max-w-md flex flex-col p-5">
        <SheetHeader className="border-b border-[#fff4e9]/10 pb-4">
          <SheetTitle className="text-[#fff4e9] font-display text-2xl flex items-center gap-3">
            <ShoppingBag className="w-6 h-6" />
            Your Cart ({totalItems})
          </SheetTitle>
          <SheetDescription className="sr-only">
            View the items in your shopping cart and proceed to checkout.
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <ShoppingBag className="w-16 h-16 text-[#fff4e9]/20 mb-4" />
            <h3 className="font-display text-xl text-[#fff4e9] mb-2">
              Your cart is empty
            </h3>
            <p className="text-[#fff4e9]/60 text-sm mb-6">
              Discover our beautiful collection and add something special.
            </p>
            <Link
              to="/shop"
              onClick={closeCart}
              className="btn-primary"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3 border border-[#fff4e9]/10 rounded-lg group"
                >
                  {/* Image */}
                  <Link
                    to={`/product/${item.slug}`}
                    onClick={closeCart}
                    className="w-20 h-20 flex-shrink-0 bg-[#fff4e9]/5 rounded overflow-hidden"
                  >
                    <img
                      src={item.image || '/images/placeholder.jpg'}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${item.slug}`}
                      onClick={closeCart}
                      className="block"
                    >
                      <h4 className="font-display text-[#fff4e9] truncate group-hover:text-[#f3e7d9] transition-colors">
                        {item.name}
                      </h4>
                    </Link>
                    <p className="text-[#fff4e9]/60 text-sm mb-2">
                      {formatPrice(item.price)}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-7 h-7 rounded border border-[#fff4e9]/30 flex items-center justify-center
                                   text-[#fff4e9]/60 hover:bg-[#fff4e9]/10 hover:text-[#fff4e9] transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-[#fff4e9] w-6 text-center text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-7 h-7 rounded border border-[#fff4e9]/30 flex items-center justify-center
                                   text-[#fff4e9]/60 hover:bg-[#fff4e9]/10 hover:text-[#fff4e9] transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-[#fff4e9]/40 hover:text-red-400 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-[#fff4e9]/10 pt-4 space-y-4">
              {/* Subtotal */}
              <div className="flex items-center justify-between text-[#fff4e9]">
                <span className="text-[#fff4e9]/60">Subtotal</span>
                <span className="font-display text-xl">{formatPrice(totalPrice)}</span>
              </div>

              <p className="text-xs text-[#fff4e9]/40">
                Shipping and taxes calculated at checkout.
              </p>

              {/* Buttons */}
              <div className="space-y-3">
                <SlideToConfirm 
                  onConfirm={handleCheckout}
                  text="   Slide to checkout"
                  confirmedText="Loading..."
                />
                <button
                  onClick={closeCart}
                  className="btn-primary block w-full text-center"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
