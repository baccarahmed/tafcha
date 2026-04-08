import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { productsAPI } from '@/services/api';
import { useSettings } from '@/hooks/useSettings';

export default function Collections() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [cats, setCats] = useState<Array<{ id: string; name: string; slug: string; description?: string; image?: string }>>([]);
  const { settings } = useSettings();
  const featuredIds = Array.isArray(settings?.featuredCategories) ? settings.featuredCategories as string[] : [];
  const limit = typeof settings?.featuredLimit === 'number' && settings.featuredLimit! > 0 ? settings.featuredLimit! : 3;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    productsAPI.getCategories()
      .then((data) => {
        const list = (data.categories || []) as Array<{ id: string; name: string; slug: string; description?: string; image?: string }>;
        setCats(list);
      })
      .catch(() => setCats([]));
  }, []);

  const collections = (() => {
    let base = cats;
    if (featuredIds.length > 0) {
      base = cats.filter(c => featuredIds.includes(c.id));
    }
    const picked = base.slice(0, limit);
    return picked.map((c, idx) => ({
      ...c,
      rotation: idx === 0 ? -3 : idx === 1 ? 0 : 3,
      image: c.image || (idx === 0 ? '/images/collection-minimalist.jpg' : idx === 1 ? '/images/collection-bridal.jpg' : '/images/collection-classic.jpg'),
    }));
  })();

  return (
    <section
      ref={sectionRef}
      className="py-24 bg-[--site-bg] relative overflow-hidden"
    >
      <div className="section-padding">
        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl text-[#fff4e9] mb-4">
            {'Our Accessory Collections'.split(' ').map((word, i) => (
              <span
                key={i}
                className={`inline-block mx-1.5 transition-all duration-800 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8'
                }`}
                style={{
                  transitionDelay: `${i * 80}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {word}
              </span>
            ))}
          </h2>
        </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {collections.map((collection, index) => (
            <Link
              key={collection.slug}
              to={`/shop?category=${collection.slug}`}
              className={`group relative block transition-all duration-700 ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-20'
              }`}
              style={{
                transitionDelay: `${200 + index * 150}ms`,
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                transform: isVisible
                  ? `rotate(${collection.rotation}deg)`
                  : `rotate(${collection.rotation}deg) translateY(80px)`,
              }}
            >
              {/* Card */}
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-[--panel-bg]">
                {/* Image */}
                <div className="absolute inset-0 overflow-hidden">
                  <img
                    src={collection.image}
                    alt={`Collection ${collection.name} - Exceptional Tafchaa Jewelry`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#3d4d5d]/90 via-[#3d4d5d]/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <h3 className="font-display text-2xl lg:text-3xl text-[#fff4e9] mb-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    {collection.name}
                  </h3>
                  <p className="text-sm text-[#fff4e9]/70 mb-4 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-100">
                    {collection.description}
                  </p>
                  <div className="flex items-center gap-2 text-[#fff4e9] opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-150">
                    <span className="text-sm font-medium uppercase tracking-wider">
                      Discover
                    </span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                  </div>
                </div>

                {/* Border glow on hover */}
                <div className="absolute inset-0 rounded-lg border border-[#fff4e9]/0 group-hover:border-[#fff4e9]/30 transition-colors duration-500" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
