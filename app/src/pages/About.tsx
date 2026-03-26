import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Sparkles, Gem, Award } from 'lucide-react';
import Navigation from '@/sections/Navigation';
import Footer from '@/sections/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useSettings } from '@/hooks/useSettings';
import { Helmet } from 'react-helmet-async';

const values = [
  {
    icon: Heart,
    title: 'Crafted with Love',
    description: 'Each piece is meticulously crafted by skilled artisans who pour their passion into every detail.',
  },
  {
    icon: Sparkles,
    title: 'Timeless Design',
    description: 'Our designs transcend trends, creating jewelry that remains elegant for generations.',
  },
  {
    icon: Gem,
    title: 'Quality Materials',
    description: 'We use only the finest materials, from ethically sourced gemstones to premium metals.',
  },
  {
    icon: Award,
    title: 'Excellence',
    description: 'Every piece undergoes rigorous quality control to ensure it meets our high standards.',
  },
];

const milestones = [
  { year: '2018', title: 'The Beginning', description: 'Tafchaa was founded with a vision to create meaningful jewelry.' },
  { year: '2019', title: 'First Collection', description: 'Launched our signature Minimalist Elegance collection.' },
  { year: '2020', title: 'Going Global', description: 'Expanded shipping to over 30 countries worldwide.' },
  { year: '2022', title: 'Bridal Line', description: 'Introduced our Bridal Bliss collection for special moments.' },
  { year: '2024', title: 'Sustainability', description: 'Committed to 100% ethically sourced materials.' },
];

export default function About() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { settings: siteSettings } = useSettings();

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

  return (
    <div className="min-h-screen bg-[--site-bg]">
      <Helmet>
        <title>À Propos | Notre Histoire & Valeurs | Tafchaa</title>
        <meta name="description" content="Découvrez l'histoire de Tafchaa, notre passion pour la joaillerie artisanale et notre engagement envers l'excellence, la durabilité et le design intemporel." />
        <meta property="og:title" content="À Propos | Notre Histoire & Valeurs | Tafchaa" />
        <meta property="og:description" content="L'histoire derrière nos bijoux d'exception et notre engagement pour la qualité." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tafchaa.com/about" />
        <link rel="canonical" href="https://tafchaa.com/about" />
      </Helmet>
      <Navigation />
      
      {/* Hero Section */}
      <div className="pt-32 pb-20 section-padding border-b border-[#fff4e9]/10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl text-[#fff4e9] mb-6">
            Our Story
          </h1>
          <p className="text-xl text-[#fff4e9]/70 max-w-2xl mx-auto leading-relaxed">
            {siteSettings?.aboutText || "At Tafchaa, we believe jewelry is more than an accessory—it's a keepsake of moments, love, and individuality."}
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <section className="py-24 section-padding" ref={sectionRef}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Image */}
            <div 
              className={`relative transition-all duration-1000 ${
                isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'
              }`}
            >
              <div className="aspect-[4/5] rounded-lg overflow-hidden">
                <img
                  src="/images/collection-minimalist.jpg"
                  alt="Artisan joaillier au travail - L'excellence de la fabrication artisanale Tafchaa"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-48 h-48 border border-[#fff4e9]/10 rounded-lg p-6 flex flex-col justify-center backdrop-blur-sm">
                <span className="font-display text-4xl text-[#fff4e9]">6+</span>
                <span className="text-[#fff4e9]/60 text-sm">Years of Excellence</span>
              </div>
            </div>

            {/* Content */}
            <div 
              className={`transition-all duration-1000 delay-200 ${
                isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
              }`}
            >
              <h2 className="font-display text-4xl text-[#fff4e9] mb-6">
                The Little Something You've Been Missing
              </h2>
              <div className="space-y-4 text-[#fff4e9]/70 leading-relaxed">
                <p>
                  Founded in 2018, Tafchaa began with a simple mission: to create jewelry that tells a story. 
                  We believe that every piece should hold meaning, whether it's a gift for a loved one or 
                  a treat for yourself.
                </p>
                <p>
                  Our name, "Tafchaa," embodies the essence of finding that perfect piece—the little 
                  something that completes your look and captures your unique style. Each design is 
                  thoughtfully created to be both timeless and contemporary.
                </p>
                <p>
                  From our minimalist everyday pieces to our elaborate bridal collection, we pour our 
                  heart into every creation. Our artisans combine traditional craftsmanship with modern 
                  techniques to ensure each piece meets our exacting standards.
                </p>
              </div>
              <Link
                to="/shop"
                className="inline-block mt-8 btn-primary"
              >
                Explore Our Collection
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 border-y border-[#fff4e9]/10">
        <div className="section-padding">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl text-[#fff4e9] mb-4">
              Our Values
            </h2>
            <p className="text-[#fff4e9]/60 max-w-xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <div
                  key={value.title}
                  className="text-center p-6 group"
                >
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#fff4e9]/10 flex items-center justify-center
                                group-hover:bg-[#fff4e9]/20 transition-colors duration-300">
                    <Icon className="w-8 h-8 text-[#fff4e9]" />
                  </div>
                  <h3 className="font-display text-xl text-[#fff4e9] mb-3">
                    {value.title}
                  </h3>
                  <p className="text-[#fff4e9]/60 text-sm leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-24 section-padding">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl sm:text-5xl text-[#fff4e9] mb-4">
              Our Journey
            </h2>
            <p className="text-[#fff4e9]/60">
              Milestones that shaped who we are today
            </p>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-[#fff4e9]/20" />

            {milestones.map((milestone, idx) => (
              <div
                key={milestone.year}
                className={`relative flex items-start mb-12 ${
                  idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
              >
                {/* Dot */}
                <div className="absolute left-4 md:left-1/2 w-3 h-3 bg-[#fff4e9] rounded-full 
                              -translate-x-1/2 mt-2" />
                
                {/* Content */}
                <div className={`ml-12 md:ml-0 md:w-1/2 ${
                  idx % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'
                }`}>
                  <span className="font-display text-3xl text-[#fff4e9]/40">
                    {milestone.year}
                  </span>
                  <h3 className="font-display text-xl text-[#fff4e9] mt-1 mb-2">
                    {milestone.title}
                  </h3>
                  <p className="text-[#fff4e9]/60 text-sm">
                    {milestone.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 border-t border-[#fff4e9]/10">
        <div className="section-padding text-center">
          <h2 className="font-display text-4xl sm:text-5xl text-[#fff4e9] mb-6">
            Join the Tafchaa Family
          </h2>
          <p className="text-[#fff4e9]/60 max-w-xl mx-auto mb-8">
            Discover jewelry that speaks to your soul. Every piece tells a story—let yours begin today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/shop" className="btn-primary">
              Shop Now
            </Link>
            <Link to="/contact" className="btn-secondary">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
}
