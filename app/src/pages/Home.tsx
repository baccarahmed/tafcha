import Navigation from '@/sections/Navigation';
import Hero from '@/sections/Hero';
import Features from '@/sections/Features';
import Collections from '@/sections/Collections';
import Quote from '@/sections/Quote';
import Products from '@/sections/Products';
import Testimonials from '@/sections/Testimonials';
import Footer from '@/sections/Footer';
import CartDrawer from '@/components/CartDrawer';
import { Helmet } from 'react-helmet-async';
import { useSettings } from '@/hooks/useSettings';

export default function Home() {
  const { settings } = useSettings();
  const title = settings?.heroTitle ? `${settings.heroTitle} | Tafchaa` : 'Tafchaa | Accessoires et Bijoux de Luxe - Collection Exclusive';
  const description = settings?.heroSubtitle || 'Collection exclusive d\'accessoires et bijoux de luxe : bagues, colliers, bracelets, boucles d\'oreilles et accessoires raffinés. Artisanat d\'exception pour un style unique avec des pièces artisanales élégantes.';

  return (
    <div className="min-h-screen bg-[--site-bg]">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="keywords" content="accessoires, bijoux, luxe, bagues, colliers, bracelets, boucles d'oreilles, joaillerie, accessoires de mode, bijoux artisanaux, Tafchaa, accessoires raffinés, bijoux de luxe" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tafcha.com/" />
        <meta property="og:site_name" content="Tafchaa" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <link rel="canonical" href="https://tafcha.com/" />
        
        {/* Schema.org markup pour accessoires et bijoux de luxe */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "JewelryStore",
            "name": "Tafchaa",
            "description": "Collection exclusive d'accessoires et bijoux de luxe : bagues, colliers, bracelets, boucles d'oreilles et accessoires raffinés",
            "url": "https://tafcha.com",
            "logo": "https://tafcha.com/favicon.svg",
            "image": "https://tafcha.com/images/logo.png",
            "telephone": "+213-XXX-XXXXXX",
            "email": "contact@tafcha.com",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Rue des Artisans",
              "addressLocality": "Alger",
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
              "name": "Collection d'Accessoires et Bijoux de Luxe",
              "itemListElement": [
                {
                  "@type": "Product",
                  "name": "Accessoires de Luxe",
                  "description": "Collection exclusive d'accessoires raffinés et bijoux élégants",
                  "category": "Accessoires de Mode"
                },
                {
                  "@type": "Product", 
                  "name": "Bijoux Artisanaux",
                  "description": "Pièces artisanales uniques en or et pierres précieuses",
                  "category": "Joaillerie"
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
        <Testimonials />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
