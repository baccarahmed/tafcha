import { useEffect, useRef, useState } from 'react';

export default function Quote() {
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
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const quote = "At Tafchaa, we craft jewelry to be more than an accessory—it's a keepsake of moments, love, and individuality, blending timeless craftsmanship with meaningful design.";
  const words = quote.split(' ');

  return (
    <section
      ref={sectionRef}
      className="py-32 bg-[--site-bg] relative overflow-hidden"
    >
      {/* Decorative Quote Marks */}
      <div
        className={`absolute top-20 left-10 text-[20rem] font-display text-[#fff4e9]/5 leading-none select-none transition-all duration-800 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        "
      </div>
      <div
        className={`absolute bottom-20 right-10 text-[20rem] font-display text-[#fff4e9]/5 leading-none select-none transition-all duration-800 ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        }`}
        style={{
          transitionDelay: '100ms',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        "
      </div>

      <div className="section-padding relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Quote Text */}
          <blockquote className="font-display text-2xl sm:text-3xl md:text-4xl text-[#fff4e9] leading-relaxed mb-10">
            {words.map((word, index) => (
              <span
                key={index}
                className={`inline-block mr-[0.3em] transition-all duration-400 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-5'
                }`}
                style={{
                  transitionDelay: `${300 + index * 30}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {word}
              </span>
            ))}
          </blockquote>

          {/* Attribution */}
          <div
            className={`transition-all duration-500 ${
              isVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-8'
            }`}
            style={{
              transitionDelay: `${300 + words.length * 30 + 200}ms`,
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-px bg-[#fff4e9]/30" />
              <cite className="not-italic">
                <span className="font-display text-lg text-[#fff4e9]">
                  Mahdi Zekri
                </span>
                <span className="text-[#fff4e9]/60 ml-2">
                  — CEO Tafchaa
                </span>
              </cite>
              <div className="w-12 h-px bg-[#fff4e9]/30" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
