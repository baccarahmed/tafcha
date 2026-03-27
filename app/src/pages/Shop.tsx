import { useEffect, useState, useMemo, useContext } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { Filter, Grid3X3, LayoutList, ShoppingBag } from 'lucide-react';
import Navigation from '@/sections/Navigation';
import Footer from '@/sections/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useCart } from '@/contexts/CartContext';
import { productsAPI } from '@/services/api';
import { Helmet } from 'react-helmet-async';
import { PreloadedDataContext, type PreloadedData } from '@/App';
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
  const preloadedData = useContext(PreloadedDataContext) as PreloadedData | null;
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
    return new Intl.NumberFormat('fr-FR', {
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
    return categoryName ? `Boutique | ${categoryName} | Tafchaa` : 'Boutique | Tafchaa';
  }, [categoryName]);

  const shopDescription = useMemo(() => {
    return categoryName 
      ? `Découvrez nos produits d'exception dans la catégorie ${categoryName} sur Tafchaa. Des bijoux élégants et raffinés pour sublimer vos moments.` 
      : "Découvrez la collection complète de bijoux Tafchaa : bagues, colliers, bracelets et boucles d'oreilles d'exception.";
  }, [categoryName]);

  const categorySEOContent = useMemo(() => {
    if (!categoryName) return null;
    
    const content: Record<string, { title: string, text: string }> = {
      'shop_root': {
        title: "Tafchaa : L'Excellence de la Joaillerie Artisanale",
        text: "Bienvenue dans l'univers de Tafchaa, votre destination de choix pour des bijoux d'exception alliant savoir-faire traditionnel et esthétique moderne. Notre boutique en ligne vous propose une sélection rigoureuse de bagues, colliers, bracelets et boucles d'oreilles, chacun conçu pour raconter une histoire unique. Que vous cherchiez un cadeau mémorable ou une pièce maîtresse pour votre propre collection, notre catalogue complet saura vous séduire par sa diversité et sa qualité irréprochable. Nous nous engageons à n'utiliser que les meilleurs matériaux, de l'or pur aux pierres précieuses certifiées, pour garantir la longévité et l'éclat de chaque création. Explorez nos différentes collections, du minimalisme épuré aux classiques intemporels, et découvrez pourquoi Tafchaa est devenu le symbole de l'élégance raffinée. Notre passion pour la perfection se reflète dans chaque détail, assurant une expérience d'achat en ligne à la hauteur de l'exclusivité de nos bijoux."
      },
      'Minimalist Elegance': {
        title: "L'élégance minimaliste : l'art de la simplicité",
        text: "Découvrez notre collection de bijoux minimalistes, conçus pour ceux qui apprécient la beauté dans la simplicité. Chaque pièce de notre gamme 'Minimalist Elegance' est une célébration de lignes épurées et de designs intemporels. Que vous recherchiez une bague délicate pour un usage quotidien ou un collier subtil pour une touche de sophistication, notre sélection répondra à vos attentes. Nos artisans joailliers mettent tout leur savoir-faire dans la création de bijoux qui ne dominent pas votre style, mais l'accentuent avec une grâce naturelle. Utilisant des matériaux de la plus haute qualité, nous garantissons que chaque pièce reste un classique de votre boîte à bijoux pour les années à venir. L'élégance minimaliste n'est pas seulement une tendance, c'est un mode de vie qui privilégie la qualité à la quantité et le sens au superficiel."
      },
      'Bridal Bliss': {
        title: "Éclat nuptial : des bijoux pour le jour le plus précieux",
        text: "Le jour de votre mariage mérite une perfection sans compromis. Notre collection 'Bridal Bliss' propose des bijoux de mariage exquis, allant des bagues de fiançailles étincelantes aux parures de cérémonie raffinées. Chaque diamant et chaque pierre précieuse sont sélectionnés avec une attention méticuleuse pour assurer un éclat incomparable sous les projecteurs de votre grand jour. Nous comprenons que les bijoux de mariée sont plus que de simples accessoires ; ce sont des symboles d'amour éternel et des souvenirs qui seront transmis de génération en génération. Explorez nos designs classiques et contemporains, créés pour compléter chaque style de robe et chaque thème de mariage. De la finesse des perles à la majesté du platine, laissez Tafchaa ajouter une touche de magie et de luxe à votre célébration de l'amour."
      },
      'Timeless Classics': {
        title: "Classiques intemporels : la joaillerie qui traverse les époques",
        text: "Certaines pièces ne se démodent jamais. Notre collection 'Timeless Classics' rend hommage aux designs iconiques qui ont défini la joaillerie à travers les décennies. Ces bijoux sont les piliers de toute collection sérieuse, offrant une polyvalence qui convient aussi bien aux soirées de gala qu'aux réunions professionnelles. En investissant dans un classique intemporel de Tafchaa, vous choisissez une pièce dont la pertinence esthétique est garantie pour les siècles à venir. Nous revisitons les formes traditionnelles avec une touche de modernité, assurant un équilibre parfait entre héritage et innovation. Chaque bracelet, boucle d'oreille ou pendentif de cette collection raconte une histoire de sophistication durable. Découvrez l'assurance que seul un véritable classique peut offrir et faites de l'élégance votre signature permanente."
      }
    };

    return content[categoryName || 'shop_root'] || null;
  }, [categoryName]);

  return (
    <div className="min-h-screen bg-[--site-bg]">
      <Helmet>
        <title>{shopTitle || 'Boutique | Tafchaa'}</title>
        <meta name="description" content={shopDescription || 'Découvrez notre collection de bijoux.'} />
        <meta property="og:title" content={shopTitle || 'Boutique | Tafchaa'} />
        <meta property="og:description" content={shopDescription || 'Découvrez notre collection de bijoux.'} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://tafchaa.com/shop${selectedCategory !== 'all' ? `/${selectedCategory}` : ''}`} />
        <link rel="canonical" href={`https://tafchaa.com/shop${selectedCategory !== 'all' ? `/${selectedCategory}` : ''}`} />
      </Helmet>
      <Navigation />
      
      {/* Header */}
      <div className="pt-32 pb-8 section-padding border-b border-[#fff4e9]/10">
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-[#fff4e9] mb-4">
          {categoryName || 'Shop'}
        </h1>
        <p className="text-[#fff4e9]/60 max-w-xl">
          Discover our curated collection of elegant jewelry, crafted to elevate your everyday moments.
        </p>
      </div>

      {/* Filters & Products */}
      <div className="section-padding py-12">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b border-[#fff4e9]/10">
          {/* Categories */}
          <div className="flex items-center gap-4 overflow-x-auto pb-4 sm:pb-0">
            <button
              onClick={() => handleCategoryChange('all')}
              className="relative inline-flex h-10 overflow-hidden rounded-full p-[1px] transition-transform active:scale-95"
            >
              <span className={`absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] ${selectedCategory === 'all' ? 'opacity-100' : 'opacity-0'}`} />
              <span className={`inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full px-6 py-1 text-sm font-medium backdrop-blur-3xl transition-colors whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-[#fff4e9] text-[--site-bg]'
                  : 'bg-slate-950 text-[#fff4e9] hover:bg-slate-900 border border-[#fff4e9]/10'
              }`}>
                All
              </span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => handleCategoryChange(cat.slug)}
                className="relative inline-flex h-10 overflow-hidden rounded-full p-[1px] transition-transform active:scale-95"
              >
                <span className={`absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] ${selectedCategory === cat.slug ? 'opacity-100' : 'opacity-0'}`} />
                <span className={`inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full px-6 py-1 text-sm font-medium backdrop-blur-3xl transition-colors whitespace-nowrap ${
                  selectedCategory === cat.slug
                    ? 'bg-[#fff4e9] text-[--site-bg]'
                    : 'bg-slate-950 text-[#fff4e9] hover:bg-slate-900 border border-[#fff4e9]/10'
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
              <SelectContent className="bg-[#2a3a4a] border-[#fff4e9]/20">
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                      className="btn-primary text-sm py-3 px-6 inline-flex items-center gap-2 w-fit"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Add to Cart
                    </button>
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
