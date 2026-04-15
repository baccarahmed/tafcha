import { useEffect, useState, useMemo, useContext } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { Filter, Grid3X3, LayoutList, ShoppingBag } from 'lucide-react';
import Navigation from '@/sections/Navigation';
import Footer from '@/sections/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useCart } from '@/contexts/CartContext';
import { productsAPI } from '@/services/api';
import { Helmet } from 'react-helmet-async';
import { MagneticButton } from '@/components/lightswind/magnetic-button';
import { PreloadedDataContext } from '@/App';
import { getSiteUrl } from '@/lib/utils.ts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  comparePrice?: number;
  images: string[];
  categoryName?: string;
  categorySlug?: string;
}

export default function Shop() {
  const navigate = useNavigate();
  const { categorySlug } = useParams();
  const preloadedData = useContext(PreloadedDataContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>(preloadedData?.categories || []);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { addItem } = useCart();

  const selectedCategory = categorySlug || searchParams.get('category') || 'all';
  const sortBy = searchParams.get('sort') || 'newest';

  const categoryName = useMemo(() => {
    if (selectedCategory === 'all') return '';
    const cat = categories.find(c => c.slug === selectedCategory);
    return cat ? cat.name : '';
  }, [selectedCategory, categories]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [productsData, categoriesData] = await Promise.all([
          productsAPI.getAll(selectedCategory === 'all' ? {} : { category: selectedCategory }),
          // Only fetch categories if we don't have them preloaded
          categories.length > 0 ? Promise.resolve({ categories }) : productsAPI.getCategories(),
        ]);
        setProducts(productsData.products);
        if (categories.length === 0) {
          setCategories(categoriesData.categories);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]); // categories.length removed as it is set internally and would cause loops or warnings

  const handleCategoryChange = (slug: string) => {
    if (slug === 'all') {
      navigate('/shop');
    } else {
      navigate(`/shop/${slug}`);
    }
  };

  const handleSortChange = (sort: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sort', sort);
    setSearchParams(newParams);
  };

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

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [products, sortBy]);

  const shopTitle = useMemo(() => {
    return categoryName ? `${categoryName} Accessories | Luxury Jewelry and Accessories | Tafchaa` : 'Luxury Accessories and Jewelry | Tafchaa Boutique';
  }, [categoryName]);

  const shopDescription = useMemo(() => {
    return categoryName 
      ? `Discover our exceptional ${categoryName} accessories: elegant jewelry, refined accessories, and unique pieces to enhance your style. Tafchaa luxury collection.`       : "Exclusive collection of luxury accessories and jewelry: refined rings, necklaces, bracelets, earrings, and accessories. Exceptional craftsmanship for a unique style.";
  }, [categoryName]);

  const categorySEOContent = useMemo(() => {
    if (!categoryName) return null;
    
    const content: Record<string, { title: string, text: string }> = {
      'shop_root': {
        title: "Tafchaa: Exceptional Accessories and Jewelry",
        text: "Welcome to the world of Tafchaa, your destination of choice for exceptional accessories and jewelry blending traditional craftsmanship with modern aesthetics. Our online boutique offers a rigorous selection of rings, necklaces, bracelets, earrings, and other accessories, each designed to tell a unique story. Whether you're looking for a memorable gift or a centerpiece for your own collection, our comprehensive catalog will seduce you with its diversity and impeccable quality. We are committed to using only the finest materials, from pure gold to certified gemstones, to ensure the longevity and brilliance of each creation. Explore our different collections, from sleek minimalism to timeless classics, and discover why Tafchaa has become the symbol of refined elegance. Our passion for perfection is reflected in every detail, ensuring an online shopping experience worthy of the exclusivity of our accessories and jewelry."
      },
      'Minimalist Elegance': {
        title: "Luxury Minimalist Accessories - Pure Elegance | Tafchaa",
        text: "Discover our collection of luxury minimalist accessories, designed for those who appreciate beauty in simplicity. Each accessory in our 'Minimalist Elegance' range is a celebration of clean lines and timeless designs. Whether you're looking for delicate accessories for everyday use or subtle pieces for a touch of sophistication, our selection will meet your expectations. Our master jewelers put all their expertise into creating accessories that don't dominate your style but accentuate it with natural grace. Using the highest quality materials, we guarantee that each accessory remains a classic in your collection for years to come. Minimalist elegance is not just a trend; it's a lifestyle that prioritizes the quality of accessories over quantity."
      },
      'Bridal Bliss': {
        title: "Bridal Brilliance: Jewelry for the Most Precious Day",
        text: "Your wedding day deserves uncompromising perfection. Our 'Bridal Bliss' collection offers exquisite wedding jewelry, ranging from sparkling engagement rings to refined ceremonial sets. Each diamond and gemstone is selected with meticulous attention to ensure incomparable brilliance under the spotlight of your big day. We understand that bridal jewelry is more than just accessories; they are symbols of eternal love and memories that will be passed down from generation to generation. Explore our classic and contemporary designs, created to complement every dress style and wedding theme. From the fineness of pearls to the majesty of platinum, let Tafchaa add a touch of magic and luxury to your celebration of love."
      },
      'Timeless Classics': {
        title: "Timeless Classics: Jewelry that Transcends Eras",
        text: "Some pieces never go out of style. Our 'Timeless Classics' collection pays tribute to iconic designs that have defined jewelry across decades. These pieces are the pillars of any serious collection, offering versatility that suits both gala evenings and professional meetings. By investing in a timeless classic from Tafchaa, you choose a piece whose aesthetic relevance is guaranteed for centuries to come. We revisit traditional shapes with a modern touch, ensuring a perfect balance between heritage and innovation. Each bracelet, earring, or pendant in this collection tells a story of enduring sophistication. Discover the assurance that only a true classic can offer and make elegance your permanent signature."
      }
    };

    return content[categoryName || 'shop_root'] || null;
  }, [categoryName]);

  return (
    <div className="min-h-screen bg-[--site-bg]">
      <Helmet>
        <title>{shopTitle || 'Luxury Accessories and Jewelry | Tafchaa Boutique'}</title>
        <meta name="description" content={shopDescription || 'Exclusive collection of luxury accessories and jewelry: refined rings, necklaces, bracelets, earrings, and accessories. Exceptional craftsmanship for a unique style.'} />
        <meta name="keywords" content="accessories, jewelry, luxury, rings, necklaces, bracelets, earrings, fine jewelry, fashion accessories, handcrafted jewelry, Tafchaa" />
        <meta property="og:title" content={shopTitle || 'Luxury Accessories and Jewelry | Tafchaa Boutique'} />
        <meta property="og:description" content={shopDescription || 'Exclusive collection of luxury accessories and jewelry: refined rings, necklaces, bracelets, earrings, and accessories. Exceptional craftsmanship for a unique style.'} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${getSiteUrl()}/shop${selectedCategory !== 'all' ? `/${selectedCategory}` : ''}`} />
        <meta property="og:site_name" content="Tafchaa" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={shopTitle || 'Luxury Accessories and Jewelry | Tafchaa Boutique'} />
        <meta name="twitter:description" content={shopDescription || 'Exclusive collection of luxury accessories and jewelry: refined rings, necklaces, bracelets, earrings, and accessories.'} />
        <link rel="canonical" href={`${getSiteUrl()}/shop${selectedCategory !== 'all' ? `/${selectedCategory}` : ''}`} />
      </Helmet>
      <Navigation />
      
      {/* Header */}
      <div className="pt-32 pb-8 section-padding border-b border-[#fff4e9]/10 text-center sm:text-left">
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-[#fff4e9] mb-4">
          {categoryName ? `${categoryName} Accessories` : 'Luxury Accessories and Jewelry'}
        </h1>
        <p className="text-[#fff4e9]/60 max-w-xl mx-auto sm:mx-0">
          {categorySEOContent?.text || "Discover our exclusive collection of luxury accessories and jewelry. Each piece is carefully selected to enhance your style with refined and elegant accessories."}
        </p>
      </div>

      {/* Filters & Products */}
      <div className="section-padding py-12">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between items-center gap-6 mb-8 pb-6 border-b border-[#fff4e9]/10">
          {/* Categories */}
          <div className="flex flex-nowrap items-center justify-center sm:justify-start gap-3 sm:gap-4 overflow-x-auto pb-4 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden w-full sm:w-auto">
            <button
              onClick={() => handleCategoryChange('all')}
              className="relative flex-shrink-0 inline-flex h-10 overflow-hidden rounded-full p-[1px] transition-transform active:scale-95 group"
            >
              <span className={`absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] ${selectedCategory === 'all' ? 'opacity-100' : 'opacity-0'}`} />
              <span className={`inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full px-5 py-1 text-xs sm:text-sm font-medium backdrop-blur-3xl transition-all duration-300 whitespace-nowrap group-hover:text-transparent group-active:text-transparent ${
                selectedCategory === 'all'
                  ? 'bg-[#fff4e9] text-slate-950'
                  : 'bg-slate-950 text-[#fff4e9] hover:bg-[#fff4e9] group-active:bg-[#fff4e9] border border-[#fff4e9]/10'
              }`}>
                All
              </span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => handleCategoryChange(cat.slug)}
                className="relative flex-shrink-0 inline-flex h-10 overflow-hidden rounded-full p-[1px] transition-transform active:scale-95 group"
              >
                <span className={`absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] ${selectedCategory === cat.slug ? 'opacity-100' : 'opacity-0'}`} />
                <span className={`inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full px-5 py-1 text-xs sm:text-sm font-medium backdrop-blur-3xl transition-all duration-300 whitespace-nowrap group-hover:text-transparent group-active:text-transparent ${
                  selectedCategory === cat.slug
                    ? 'bg-[#fff4e9] text-slate-950'
                    : 'bg-slate-950 text-[#fff4e9] hover:bg-[#fff4e9] group-active:bg-[#fff4e9] border border-[#fff4e9]/10'
                }`}>
                  {cat.name}
                </span>
              </button>
            ))}
          </div>

          {/* Sort & View */}
          <div className="flex items-center gap-4">
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-40 bg-transparent border-[#fff4e9]/30 text-[#fff4e9]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-[#2a3a4a]/50 border-[#fff4e9]/20">
                <SelectItem value="newest" className="text-[#fff4e9]">Newest</SelectItem>
                <SelectItem value="price-low" className="text-[#fff4e9]">Price: Low to High</SelectItem>
                <SelectItem value="price-high" className="text-[#fff4e9]">Price: High to Low</SelectItem>
                <SelectItem value="name" className="text-[#fff4e9]">Name</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-[#fff4e9]/30 rounded">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-[#fff4e9]/20 text-[#fff4e9]' : 'text-[#fff4e9]/60'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-[#fff4e9]/20 text-[#fff4e9]' : 'text-[#fff4e9]/60'}`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Products Grid/List */}
        {isLoading ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'}`}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`bg-[#fff4e9]/5 rounded-lg animate-pulse ${
                  viewMode === 'list' ? 'flex gap-4 h-32' : 'aspect-[3/4]'
                }`}
              />
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-16">
            <Filter className="w-16 h-16 text-[#fff4e9]/20 mx-auto mb-4" />
            <h3 className="font-display text-xl text-[#fff4e9] mb-2">
              No products found
            </h3>
            <p className="text-[#fff4e9]/60 mb-8">
              Try adjusting your filters or search query
            </p>
            <button
              onClick={() => {
                handleCategoryChange('all');
                handleSortChange('newest');
              }}
              className="btn-primary"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className={`grid gap-x-6 gap-y-12 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1'}`}>
            {sortedProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => navigate(`/product/${product.slug}`)}
                className={`group cursor-pointer flex ${viewMode === 'list' ? 'flex-row gap-6 border-b border-[#fff4e9]/10 pb-8' : 'flex-col'}`}
              >
                {/* Image */}
                <div className={`relative overflow-hidden bg-[#fff4e9]/5 rounded-lg mb-4 ${viewMode === 'list' ? 'w-48 h-48 mb-0 flex-shrink-0' : 'aspect-[3/4]'}`}>
                  <img
                    src={product.images[0] || '/images/placeholder.jpg'}
                    alt={`${product.name} - ${product.categoryName || 'Bijou'} Tafchaa`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-[#2a3a4a]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {product.stock <= 0 && (
                      <span className="px-3 py-1 bg-red-500 text-white text-[10px] font-semibold uppercase tracking-widest rounded-full">
                        Out of Stock
                      </span>
                    )}
                    {product.comparePrice && product.comparePrice > product.price && (
                      <span
                        style={{ color: 'var(--site-bg)' }}
                        className="px-3 py-1 bg-[#fff4e9] text-[10px] font-semibold uppercase tracking-widest rounded-full"
                      >
                        Sale
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className={`flex-1 ${viewMode === 'list' ? 'flex flex-col justify-center' : ''}`}>
                  {product.categoryName && (
                    <p className="text-xs text-[#fff4e9]/50 uppercase tracking-wider mb-1">
                      {product.categoryName}
                    </p>
                  )}
                  <h3 className="font-display text-lg text-[#fff4e9] group-hover:text-[#f3e7d9] transition-colors mb-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[#fff4e9] font-medium">
                      {formatPrice(product.price)}
                    </span>
                    {product.comparePrice && (
                      <span className="text-[#fff4e9]/40 line-through text-sm">
                        {formatPrice(product.comparePrice)}
                      </span>
                    )}
                  </div>
                  
                  {/* List view add to cart */}
                  {viewMode === 'list' && (
                    <div className="mt-4">
                      <MagneticButton
                        onClick={(e) => {
                          e?.stopPropagation();
                          handleAddToCart(product);
                        }}
                        variant="shimmer"
                        size="sm"
                        className="h-10 px-6"
                        containerStyle={{ padding: '0px' }}
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Add to Cart
                      </MagneticButton>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SEO Category Content */}
        {categorySEOContent && (
          <div className="mt-24 pt-16 border-t border-[#fff4e9]/10 max-w-4xl">
            <h2 className="font-display text-2xl text-[#fff4e9] mb-6">
              {categorySEOContent.title}
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-[#fff4e9]/60 leading-relaxed text-lg italic">
                {categorySEOContent.text}
              </p>
            </div>
          </div>
        )}
      </div>

      <Footer />
      <CartDrawer />
    </div>
  );
}
