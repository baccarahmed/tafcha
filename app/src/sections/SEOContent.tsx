import { useEffect, useRef, useState } from 'react';

export default function SEOContent() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

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
    <section
      ref={sectionRef}
      className="py-20 bg-[--site-bg] border-t border-[#fff4e9]/5"
    >
      <div className="section-padding max-w-4xl mx-auto text-center">
        <h2 className={`font-display text-3xl sm:text-4xl text-[#fff4e9] mb-8 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          Votre Destination pour les Accessoires et Bijoux de Luxe
        </h2>
        
        <div className={`space-y-6 text-[#fff4e9]/70 leading-relaxed transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <p>
            Chez <strong>Tafchaa</strong>, nous croyons que chaque détail compte. Notre collection d'<strong>accessoires de mode</strong> et de <strong>bijoux de luxe</strong> est soigneusement sélectionnée pour apporter une touche d'élégance et de distinction à votre style. Que vous recherchiez une bague étincelante, un collier raffiné ou des accessoires artisanaux uniques, notre boutique en ligne propose des pièces d'exception qui allient tradition et modernité.
          </p>
          
          <p>
            Nos <strong>accessoires</strong> sont plus que de simples ornements ; ce sont des expressions de votre personnalité. Nous travaillons avec des artisans passionnés pour vous offrir des bijoux de haute qualité, utilisant des matériaux nobles et des designs exclusifs. Explorez notre gamme complète d'accessoires pour femmes et hommes, et trouvez le cadeau parfait ou la pièce maîtresse de votre prochaine tenue.
          </p>

          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs uppercase tracking-widest font-medium text-[#fff4e9]/40">
            <span>Bijoux Artisanaux</span>
            <span>Accessoires de Mode</span>
            <span>Luxe et Élégance</span>
            <span>Collection Exclusive</span>
          </div>
        </div>
      </div>
    </section>
  );
}
