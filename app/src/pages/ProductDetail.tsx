import { useEffect, useState, useMemo, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, ArrowLeft, Check, Heart } from 'lucide-react';
import Navigation from '@/sections/Navigation';
import Footer from '@/sections/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { productsAPI } from '@/services/api';
import { useSettings } from '@/hooks/useSettings';
import { Helmet } from 'react-helmet-async';
import { PreloadedDataContext } from '@/App';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number;
  stock: number;
  images: string[];
  categoryName?: string;
  categorySlug?: string;
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const preloadedData = useContext(PreloadedDataContext);
  
  // Initialize from preloaded data if available and slug matches
  const initialProduct = preloadedData?.product?.slug === slug ? preloadedData.product : null;
  
  const [product, setProduct] = useState<Product | null>(initialProduct);
  const [isLoading, setIsLoading] = useState(!initialProduct);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isAdded, setIsAdded] = useState(false);
  const { addItem } = useCart();
  const { addItem: addWish, removeItem: removeWish, hasItem } = useWishlist();
  const [isWished, setIsWished] = useState(false);
  const { settings } = useSettings();

  const seoDescription = useMemo(() => {
    if (!product?.description) return "Découvrez ce produit exclusif sur Tafchaa.";
    // Limit to 150-160 characters as requested
    const desc = product.description.replace(/<[^>]*>?/gm, ''); // Remove any HTML tags if present
    return desc.substring(0, 155).trim() + (desc.length > 155 ? '...' : '');
  }, [product]);

  const jsonLd = useMemo(() => {
    if (!product) return null;
    return {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.name,
      "image": product.images.map(img => img.startsWith('http') ? img : `https://tafchaa.com${img}`),
      "description": product.description,
      "sku": product.id,
      "brand": {
        "@type": "Brand",
        "name": "Tafchaa"
      },
      "offers": {
        "@type": "Offer",
        "url": `https://tafchaa.com/product/${product.slug}`,
        "priceCurrency": "DNR",
        "price": product.price,
        "itemCondition": "https://schema.org/NewCondition",
        "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": "Tafchaa"
        }
      }
    };
  }, [product]);

  useEffect(() => {
    // Only fetch if we don't have preloaded product or if slug changed
    if (product?.slug === slug) return;

    const fetchProduct = async () => {
      try {
        setIsLoading(true);
        const data = await productsAPI.getBySlug(slug!);
        setProduct(data.product);
      } catch (error) {
        console.error('Failed to fetch product:', error);
        navigate('/shop');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [slug, navigate, product?.slug]);

  const handleAddToCart = () => {
    if (!product) return;

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.images?.[0],
      slug: product.slug,
    });

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  useEffect(() => {
    if (product) {
      setIsWished(hasItem(product.id));
    } else {
      setIsWished(false);
    }
  }, [product, hasItem]);

  const toggleWishlist = () => {
    if (!product) return;
    if (hasItem(product.id)) {
      removeWish(product.id);
      setIsWished(false);
    } else {
      addWish({
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0],
        slug: product.slug,
      });
      setIsWished(true);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
    }).format(price) + ' DNR';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[--site-bg]">
        <Helmet>
          <title>Chargement... | Tafchaa</title>
          <meta name="description" content="Découvrez nos bijoux d'exception sur Tafchaa." />
        </Helmet>
        <Navigation />
        <div className="pt-32 section-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="aspect-square bg-[#fff4e9]/5 rounded-lg animate-pulse" />
            <div className="space-y-4">
              <div className="h-8 bg-[#fff4e9]/5 rounded w-3/4 animate-pulse" />
              <div className="h-6 bg-[#fff4e9]/5 rounded w-1/4 animate-pulse" />
              <div className="h-32 bg-[#fff4e9]/5 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[--site-bg]">
      <Helmet>
        <title>{`${product.name} | ${product.categoryName || 'Boutique'} | Tafchaa`}</title>
        <meta name="description" content={seoDescription} />
        <meta property="og:title" content={`${product.name} | ${product.categoryName || 'Boutique'} | Tafchaa`} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={product.images?.[0]} />
        <meta property="og:url" content={`https://tafchaa.com/product/${product.slug}`} />
        <meta property="og:type" content="product" />
        <link rel="canonical" href={`https://tafchaa.com/product/${product.slug}`} />
        {jsonLd && (
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
        )}
      </Helmet>
      <Navigation />
      
      <div className="pt-32 pb-16 section-padding">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#fff4e9]/60 hover:text-[#fff4e9] transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square bg-[#fff4e9]/5 rounded-lg overflow-hidden">
              <img
                src={product.images?.[selectedImage] || '/images/placeholder.jpg'}
                alt={`${product.name} - ${product.categoryName || 'Bijou'} Tafchaa - Vue ${selectedImage + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded-md overflow-hidden border-2 transition-all ${
                      selectedImage === idx ? 'border-[#fff4e9]' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} - Miniature ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            {/* Category */}
            {product.categoryName && (
              <button
                onClick={() => navigate(`/shop/${product.categorySlug}`)}
                className="text-sm text-[#fff4e9]/50 uppercase tracking-wider hover:text-[#fff4e9] transition-colors"
              >
                {product.categoryName}
              </button>
            )}

            {/* Name */}
            <h1 className="font-display text-4xl sm:text-5xl text-[#fff4e9]">
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-center gap-4">
              <span className="font-display text-3xl text-[#fff4e9]">
                {formatPrice(product.price)}
              </span>
              {product.comparePrice && (
                <span className="text-xl text-[#fff4e9]/40 line-through">
                  {formatPrice(product.comparePrice)}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="prose prose-invert max-w-none">
              <p className="text-[#fff4e9]/70 leading-relaxed">
                {product.description || 'No description available.'}
              </p>
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm text-[#fff4e9]/60">
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </span>
            </div>

            {/* Quantity & Add to Cart */}
            {product.stock > 0 && (
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Quantity */}
                <div className="flex items-center border border-[#fff4e9]/30">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 flex items-center justify-center text-[#fff4e9] hover:bg-[#fff4e9]/10 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center text-[#fff4e9]">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-12 h-12 flex items-center justify-center text-[#fff4e9] hover:bg-[#fff4e9]/10 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Add to Cart */}
                <button
                  onClick={handleAddToCart}
                  disabled={isAdded}
                  className={`flex-1 py-4 px-8 inline-flex animate-shimmer items-center justify-center rounded-md border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] font-medium text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 hover:text-[#fff4e9] ${
                    isAdded ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check className="w-5 h-5 mr-2 text-green-400" />
                      <span className="font-semibold uppercase tracking-wider">Added to Cart</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5 mr-2" />
                      <span className="font-semibold uppercase tracking-wider">Add to Cart</span>
                    </>
                  )}
                </button>

                <button
                  onClick={toggleWishlist}
                  className={`sm:w-48 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-md border border-[#fff4e9]/30 ${
                    isWished ? 'bg-[#fff4e9]/20 text-[#fff4e9]' : 'text-[#fff4e9]/80 hover:bg-[#fff4e9]/10'
                  } transition-colors`}
                >
                  <Heart className={`w-5 h-5 ${isWished ? 'fill-[#fff4e9] text-[#3d4d5d]' : ''}`} />
                  {isWished ? 'Retirer de la wishlist' : 'Ajouter à la wishlist'}
                </button>
              </div>
            )}

            {/* Features */}
            <div className="pt-6 border-t border-[#fff4e9]/10">
              <div className="grid grid-cols-2 gap-4 text-sm text-[#fff4e9]/60">
                <div>✓ Free shipping over {(settings?.freeShippingThresholdDNR ?? 100)} DNR</div>
                <div>✓ 30-day returns</div>
                <div>✓ Secure checkout</div>
                <div>✓ Gift packaging</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <CartDrawer />
    </div>
  );
}
