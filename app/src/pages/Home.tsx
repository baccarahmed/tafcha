import Navigation from '@/sections/Navigation';
import Hero from '@/sections/Hero';
import Features from '@/sections/Features';
import Collections from '@/sections/Collections';
import Quote from '@/sections/Quote';
import Products from '@/sections/Products';
import SEOContent from '@/sections/SEOContent';
import Testimonials from '@/sections/Testimonials';
import Footer from '@/sections/Footer';
import CartDrawer from '@/components/CartDrawer';
import { Helmet } from 'react-helmet-async';
import { useSettings } from '@/hooks/useSettings';

export default function Home() {
  const { settings } = useSettings();
  const title = settings?.heroTitle ? `${settings.heroTitle} | Tafchaa` : 'Tafchaa | Luxury Accessories and Jewelry - Exclusive Collection';
  const description = settings?.heroSubtitle || 'Exclusive collection of luxury accessories and jewelry: refined rings, necklaces, bracelets, earrings, and accessories. Exceptional craftsmanship for a unique style with elegant handcrafted pieces.';

  return (
    <div className="min-h-screen bg-[--site-bg]">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content="accessories, jewelry, luxury, rings, necklaces, bracelets, earrings, fine jewelry, fashion accessories, handcrafted jewelry, Tafchaa, refined accessories, luxury jewelry" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tafcha.com/" />
        <meta property="og:site_name" content="Tafchaa" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <link rel="canonical" href="https://tafcha.com/" />
        
        {/* Schema.org markup for luxury accessories and jewelry */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "JewelryStore",
            "name": "Tafchaa",
            "description": "Exclusive collection of luxury accessories and jewelry: refined rings, necklaces, bracelets, earrings, and accessories",
            "url": "https://tafcha.com",
            "logo": "https://tafcha.com/favicon.svg",
            "image": "https://tafcha.com/images/logo.png",
            "telephone": "+213-XXX-XXXXXX",
            "email": "contact@tafcha.com",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Artisan Street",
              "addressLocality": "Algiers",
              "addressCountry": "DZ"
            },
            "priceRange": "$$$",
            "currenciesAccepted": "DZD",
            "paymentAccepted": "Cash, Credit Card",
            "itemCondition": "https://schema.org/NewCondition",
            "availabilityStarts": "2024-01-01T00:00:00Z",
            "availabilityEnds": "2025-12-31T23:59:59Z",
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "Luxury Accessories and Jewelry Collection",
              "itemListElement": [
                {
                  "@type": "Product",
                  "name": "Luxury Accessories",
                  "description": "Exclusive collection of refined accessories and elegant jewelry",
                  "category": "Fashion Accessories"
                },
                {
                  "@type": "Product", 
                  "name": "Handcrafted Jewelry",
                  "description": "Unique handcrafted pieces in gold and precious stones",
                  "category": "Fine Jewelry"
                }
              ]
            },
            "sameAs": [
              "https://www.instagram.com/tafchaa",
              "https://www.facebook.com/tafchaa"
            ]
          })}
        </script>
      </Helmet>
      <Navigation />
      <main>
        <Hero />
        <Features />
        <Collections />
        <Quote />
        <Products />
        <SEOContent />
        <Testimonials />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
