import { Link, Navigate } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import Navigation from '@/sections/Navigation';
import Footer from '@/sections/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { MagneticButton } from '@/components/lightswind/magnetic-button';

export default function Wishlist() {
  const { isAuthenticated } = useAuth();
  const { items, removeItem } = useWishlist();
  const { addItem } = useCart();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
    }).format(price) + ' DNR';
  };

  const handleAddToCart = (productId: string) => {
    const item = items.find(i => i.productId === productId);
    if (!item) return;
    addItem({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: 1,
      image: item.image,
      slug: item.slug,
    });
  };

  return (
    <div className="min-h-screen bg-[--site-bg]">
      <Navigation />
      <div className="pt-32 pb-12 section-padding border-b border-[#fff4e9]/10">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-4xl sm:text-5xl text-[#fff4e9] mb-2">
            Wishlist
          </h1>
          <p className="text-[#fff4e9]/60">
            Vos articles enregistrés
          </p>
        </div>
      </div>

      <div className="py-12 section-padding">
        <div className="max-w-6xl mx-auto">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <Heart className="w-16 h-16 text-[#fff4e9]/20 mx-auto mb-4" />
              <h3 className="font-display text-xl text-[#fff4e9] mb-2">
                Votre wishlist est vide
              </h3>
              <p className="text-[#fff4e9]/60 mb-8">
                Parcourez la boutique et ajoutez vos favoris.
              </p>
              <Link to="/shop" className="btn-primary">
                Découvrir les produits
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map(item => (
                <div key={item.id} className="border border-[#fff4e9]/10 rounded-lg overflow-hidden bg-[--panel-bg]">
                  <Link to={item.slug ? `/product/${item.slug}` : '#'} className="block">
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img
                        src={item.image || '/images/placeholder.jpg'}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </Link>
                  <div className="p-4">
                    <h3 className="font-display text-lg text-[#fff4e9] mb-2">{item.name}</h3>
                    <div className="text-[#fff4e9] font-medium mb-4">{formatPrice(item.price)}</div>
                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                      <MagneticButton
                        onClick={() => handleAddToCart(item.productId)}
                        variant="shimmer"
                        size="sm"
                        className="h-10 px-4"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Ajouter au panier
                      </MagneticButton>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-full transition-colors self-center sm:self-auto"
                        title="Retirer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
      <CartDrawer />
    </div>
  );
}
