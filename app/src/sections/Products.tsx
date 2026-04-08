import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { productsAPI } from '@/services/api';
import { MagneticButton } from '@/components/lightswind/magnetic-button';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  images: string[];
  categoryName?: string;
}

export default function Products() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await productsAPI.getAll({ limit: 8 });
        setProducts(data.products);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleAddToCart = (product: Product) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image: product.images?.[0],
      slug: product.slug,
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    }).format(price) + ' DNR';
  };

  return (
    <section
      ref={sectionRef}
      className="py-24 bg-[--site-bg] relative overflow-hidden"
    >
      <div className="section-padding">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between items-center text-center sm:text-left mb-12">
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl text-[#fff4e9] mb-6 sm:mb-0">
            {'New Arrivals'.split('').map((char, i) => (
              <span
                key={i}
                className={`inline-block transition-all duration-600 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-12'
                }`}
                style={{
                  transitionDelay: `${i * 20}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </h2>

          <div
            className={`transition-all duration-500 delay-500 ${
              isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }`}
          >
            <Link
              to="/shop"
              className="group flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-[#fff4e9]/70 hover:text-[#fff4e9] transition-colors"
            >
              See All Products
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-2" />
            </Link>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {isLoading ? (
            // Skeleton Loading
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-4">
                <div className="aspect-[4/5] bg-[#fff4e9]/5 rounded-lg" />
                <div className="h-4 w-3/4 bg-[#fff4e9]/5 rounded" />
                <div className="h-4 w-1/4 bg-[#fff4e9]/5 rounded" />
              </div>
            ))
          ) : (
            products.map((product, index) => (
              <div
                key={product.id}
                className={`group relative transition-all duration-700 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-16'
                }`}
                style={{
                  transitionDelay: `${200 + index * 100}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Image Container */}
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-[--panel-bg] mb-4">
                  <Link to={`/product/${product.slug}`} className="block w-full h-full">
                    <img
                      src={product.images?.[0]}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </Link>

                  {/* Add to Cart Overlay */}
                  <div className="absolute inset-x-4 bottom-4 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    <MagneticButton
                      onClick={() => handleAddToCart(product)}
                      className="w-full bg-[#fff4e9] text-[#3d4d5d] py-3 rounded-md flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest hover:bg-[#fff4e9]/90 transition-colors"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Add to Cart
                    </MagneticButton>
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-1">
                  {product.categoryName && (
                    <p className="text-xs text-[#fff4e9]/50 uppercase tracking-wider">
                      {product.categoryName}
                    </p>
                  )}
                  <Link to={`/product/${product.slug}`}>
                    <h3 className="font-display text-lg text-[#fff4e9] group-hover:text-[#f3e7d9] transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-[#fff4e9] font-medium">
                      {formatPrice(product.price)}
                    </span>
                    {product.comparePrice && (
                      <span className="text-[#fff4e9]/40 line-through text-sm">
                        {formatPrice(product.comparePrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
