import { useEffect, useState, useMemo, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Heart, Check, ArrowLeft } from 'lucide-react';
import Navigation from '@/sections/Navigation';
import Footer from '@/sections/Footer';
import CartDrawer from '@/components/CartDrawer';
import { MagneticButton } from '@/components/lightswind/magnetic-button';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { productsAPI } from '@/services/api';
import { useSettings } from '@/hooks/useSettings';
import { Helmet } from 'react-helmet-async';
import { PreloadedDataContext } from '@/App';
import { getSiteUrl } from '@/lib/utils.ts';

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
  const initialProduct = preloadedData?.product?.slug === slug ? preloadedData?.product : null;
  
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
    if (!product?.description) return "Discover this exclusive accessory or jewelry on Tafchaa.";
    // Limit to 150-160 characters as requested
    const desc = product.description.replace(/<[^>]*>?/gm, ''); // Remove any HTML tags if present
    return desc.substring(0, 155).trim() + (desc.length > 155 ? '...' : '');
  }, [product]);

  const jsonLd = useMemo(() => {
    if (!product) return null;
    const siteUrl = getSiteUrl();
    return {
      "@context": "https://schema.org/",
      "@type": ["Product", "Jewelry"],
      "name": product.name,
      "description": product.description,
      "image": product.images.map(img => img.startsWith('http') ? img : `${siteUrl}${img}`),
      "sku": product.id,
      "mpn": product.id,
      "brand": {
        "@type": "Brand",
        "name": "Tafchaa",
        "url": siteUrl,
        "logo": `${siteUrl}/favicon.svg`
      },
      "category": product.categoryName || "Luxury Accessories and Jewelry",
      "material": "Gold, Precious Stones",
      "color": "Gold",
      "itemCondition": "https://schema.org/NewCondition",
      "offers": {
        "@type": "Offer",
        "url": `${siteUrl}/product/${product.slug}`,
        "priceCurrency": "DZD",
        "price": product.price,
        "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": "Tafchaa",
          "url": siteUrl
        },
        "priceValidUntil": "2025-12-31"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "reviewCount": "127"
      },
      "additionalProperty": [
        {
          "@type": "PropertyValue",
          "name": "Accessory Type",
          "value": product.categoryName || "Luxury Jewelry"
        },
        {
          "@type": "PropertyValue", 
          "name": "Style",
          "value": "Elegant and refined"
        },
        {
          "@type": "PropertyValue",
          "name": "Collection",
          "value": "Tafchaa Luxury Accessories"
        }
      ]
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
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    }).format(price) + ' DNR';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[--site-bg]">
        <Helmet>
          <title>Loading... | Tafchaa</title>
          <meta name="description" content="Discover our exceptional jewelry on Tafchaa." />
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
        <title>{`${product.name} - Luxury Accessory | ${product.categoryName || 'Jewelry'} | Tafchaa`}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={`${product.name}, accessories, jewelry, luxury, ${product.categoryName || 'accessory'}, Tafchaa, fine jewelry, fashion accessory`} />
        <meta property="og:title" content={`${product.name} - Luxury Accessory | ${product.categoryName || 'Jewelry'} | Tafchaa`} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={product.images?.[0]} />
        <meta property="og:url" content={`https://tafcha.com/product/${product.slug}`} />
        <meta property="og:type" content="product" />
        <meta property="og:site_name" content="Tafchaa" />
        <meta property="product:price:amount" content={product.price.toString()} />
        <meta property="product:price:currency" content="DZD" />
        <meta property="product:availability" content={product.stock > 0 ? "in stock" : "out of stock"} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.name} - Luxury Accessory | Tafchaa`} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={product.images?.[0]} />
        <link rel="canonical" href={`https://tafcha.com/product/${product.slug}`} />
        {jsonLd && (
          <script type="application/ld+json">
            {JSON.stringify(jsonLd)}
          </script>
        )}
      </Helmet>
      <Navigation />
      
      <div className="pt-32 pb-16 section-padding">
        {/* Back Button */}
        <div className="flex justify-center sm:justify-start mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#fff4e9]/60 hover:text-[#fff4e9] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 text-center lg:text-left">
          {/* Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square bg-[#fff4e9]/5 rounded-lg overflow-hidden flex justify-center items-center">
              <img
                src={product.images?.[selectedImage] || '/images/placeholder.jpg'}
                alt={`${product.name} - ${product.categoryName || 'Accessory or Jewelry'} Tafchaa - View ${selectedImage + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4 justify-items-center">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded-md overflow-hidden border-2 transition-all w-full ${
                      selectedImage === idx ? 'border-[#fff4e9]' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} - Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6 flex flex-col items-center lg:items-start">
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
            <div className="flex items-center justify-center lg:justify-start gap-4">
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
            <div className="prose prose-invert max-w-none text-center lg:text-left">
              <p className="text-[#fff4e9]/70 leading-relaxed">
                {product.description || `This ${product.categoryName || 'luxury'} accessory from the Tafchaa collection embodies elegance and refinement. Each piece is carefully designed to enhance your style with exceptional accessories. Discover the refined craftsmanship and precious materials that make this accessory a unique jewel.`}
              </p>
              <p className="text-[#fff4e9]/60 text-sm mt-4">
                {`This ${product.categoryName || 'luxury'} accessory is part of our exclusive collection of handcrafted accessories and jewelry. Each piece is unique and designed for those who appreciate refined accessories and timeless elegance.`}
              </p>
            </div>

            {/* Stock */}
            <div className="flex items-center justify-center lg:justify-start gap-2">
              <div className={`w-2 h-2 rounded-full ${product.stock > 0 ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm text-[#fff4e9]/60">
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </span>
            </div>

            {/* Quantity & Add to Cart */}
            {product.stock > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                {/* Quantity */}
                <div className="flex items-center justify-center border border-[#fff4e9]/30">
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
                <div className="flex-1">
                  <MagneticButton
                    onClick={handleAddToCart}
                    disabled={isAdded}
                    variant="shimmer"
                    size="md"
                    className="w-full !p-0 h-12"
                    style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#000000' }}
                    containerStyle={{ display: 'flex' }}
                    innerStyle={{ width: '170px', paddingTop: '0', paddingBottom: '0', paddingLeft: '10px', paddingRight: '10px' }}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-5 h-5 mr-2 text-green-400" />
                        <span className="font-semibold uppercase tracking-wider" style={{ display: 'flex' }}>Added to Cart</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-5 h-5 mr-2" />
                        <span className="font-semibold uppercase tracking-wider" style={{ display: 'flex' }}>Add to Cart</span>
                      </>
                    )}
                  </MagneticButton>
                </div>

                <button
                  onClick={toggleWishlist}
                  className={`sm:w-48 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-md border border-[#fff4e9]/30 ${
                    isWished ? 'bg-[#fff4e9]/20 text-[#fff4e9]' : 'text-[#fff4e9]/80 hover:bg-[#fff4e9]/10'
                  } transition-colors`}
                >
                  <Heart className={`w-5 h-5 ${isWished ? 'fill-[#fff4e9] text-[#3d4d5d]' : ''}`} />
                  {isWished ? 'Remove from wishlist' : 'Add to wishlist'}
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
