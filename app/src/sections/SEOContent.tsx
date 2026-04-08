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
          Your Destination for Luxury Accessories and Jewelry
        </h2>
        
        <div className={`space-y-6 text-[#fff4e9]/70 leading-relaxed transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <p>
            At <strong>Tafchaa</strong>, we believe every detail counts. Our collection of <strong>fashion accessories</strong> and <strong>luxury jewelry</strong> is carefully selected to bring a touch of elegance and distinction to your style. Whether you're looking for a sparkling ring, a refined necklace, or unique handcrafted accessories, our online boutique offers exceptional pieces that blend tradition and modernity.
          </p>
          
          <p>
            Our <strong>accessories</strong> are more than simple ornaments; they are expressions of your personality. We work with passionate artisans to offer you high-quality jewelry, using noble materials and exclusive designs. Explore our full range of accessories for women and men, and find the perfect gift or the centerpiece of your next outfit.
          </p>

          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs uppercase tracking-widest font-medium text-[#fff4e9]/40">
            <span>Handcrafted Jewelry</span>
            <span>Fashion Accessories</span>
            <span>Luxury and Elegance</span>
            <span>Exclusive Collection</span>
          </div>
        </div>
      </div>
    </section>
  );
}
