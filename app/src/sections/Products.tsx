import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { productsAPI } from '@/services/api';

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
    return new Intl.NumberFormat('fr-FR', {
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
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12">
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl text-[#fff4e9]">
            {'Newest Items'.split('').map((char, i) => (
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
                {char}
              </span>
            ))}
          </h2>
          
          <Link
            to="/shop"
            className={`group inline-flex items-center gap-2 text-[#fff4e9] hover:text-[#f3e7d9] transition-all duration-500 mt-4 sm:mt-0 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            <span className="text-sm font-medium uppercase tracking-wider">
              View All
            </span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
          </Link>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] bg-[--panel-bg] rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <div
                key={product.id}
                className={`group relative transition-all duration-700 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-20'
                }`}
                style={{
                  transitionDelay: `${200 + index * 80}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Image Container */}
                <Link to={`/product/${product.slug}`} className="block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[--panel-bg] mb-4">
                    <img
                      src={product.images?.[0] || '/images/placeholder.jpg'}
                      alt={`${product.name} - ${product.categoryName || 'Bijou'} Tafchaa`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108"
                    />
                    
                    {/* Quick Add Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddToCart(product);
                      }}
                      className="absolute bottom-4 left-4 right-4 py-3 inline-flex animate-shimmer items-center justify-center rounded-md border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] font-medium text-slate-400
                                 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500
                                 gap-2 hover:text-[#fff4e9] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span className="text-sm font-semibold uppercase tracking-wider">Quick Add</span>
                    </button>
                  </div>
                </Link>

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
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
