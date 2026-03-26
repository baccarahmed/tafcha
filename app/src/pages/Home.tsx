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
  const title = settings?.heroTitle ? `${settings.heroTitle} | Tafchaa` : 'Tafchaa | Joaillerie d\'Exception';
  const description = settings?.heroSubtitle || 'Découvrez notre collection exclusive de bijoux artisanaux sur Tafchaa. Élégance, qualité et design intemporel.';

  return (
    <div className="min-h-screen bg-[--site-bg]">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tafchaa.com/" />
        <link rel="canonical" href="https://tafchaa.com/" />
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
