import { useEffect, useRef, useState } from 'react';
import { Truck, Shield, RefreshCw, Gift } from 'lucide-react';

const features = [
  {
    icon: Truck,
    title: 'Very Fast Shipping',
    description: 'Free delivery on orders over $100',
  },
  {
    icon: Shield,
    title: 'Secure Payments',
    description: '100% secure checkout process',
  },
  {
    icon: RefreshCw,
    title: 'Hassle-Free Returns',
    description: '30-day return policy',
  },
  {
    icon: Gift,
    title: 'Gift-Ready Packaging',
    description: 'Beautiful boxes for every order',
  },
];

export default function Features() {
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
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="py-20 bg-[--site-bg] relative overflow-hidden"
    >
      {/* Connecting Line SVG */}
      <svg
        className="absolute top-1/2 left-0 right-0 h-px w-full -translate-y-1/2 hidden lg:block"
        preserveAspectRatio="none"
      >
        <line
          x1="10%"
          y1="50%"
          x2="90%"
          y2="50%"
          stroke="rgba(255, 244, 233, 0.1)"
          strokeWidth="1"
          strokeDasharray="8 8"
          className={`transition-all duration-1200 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            strokeDashoffset: isVisible ? 0 : 1000,
            transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>

      <div className="section-padding">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`relative text-center group transition-all duration-600 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-10'
                }`}
                style={{
                  transitionDelay: `${400 + index * 150}ms`,
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Icon Container */}
                <div className="relative inline-flex items-center justify-center w-20 h-20 mb-6">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-[#fff4e9]/5 rounded-full scale-0 group-hover:scale-150 transition-transform duration-500" />
                  
                  {/* Icon */}
                  <div className="relative z-10 p-5 border border-[#fff4e9]/20 rounded-full bg-[--panel-bg] backdrop-blur-sm group-hover:border-[#fff4e9]/40 transition-all duration-300" style={{opacity: 0.9}}>
                    <Icon className="w-8 h-8 text-[#fff4e9] group-hover:rotate-[360deg] transition-transform duration-800" />
                  </div>
                </div>

                {/* Text */}
                <h3 className="font-display text-xl text-[#fff4e9] mb-2 group-hover:tracking-wider transition-all duration-300">
                  {feature.title}
                </h3>
                <p className="text-sm text-[#fff4e9]/60">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
