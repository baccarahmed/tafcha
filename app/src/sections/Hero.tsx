import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

export default function Hero() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { settings } = useSettings();

  useEffect(() => {
    // Trigger entrance animations
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const title = settings?.heroTitle || 'Des Bijoux et Accessoires qui Rayonnent de Charme';
  const subtitle = settings?.heroSubtitle || 'Découvrez des bijoux et accessoires élégants et uniques, conçus pour sublimer vos moments quotidiens et vos occasions inoubliables.';
  const sideVideoSrc = settings?.heroVideo || '/uploads/vid_1772434897884_salz6b.mp4';

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(error => {
        console.log("Video auto-play failed, likely due to browser policy:", error);
      });
    }
  }, [sideVideoSrc]);
  const particles = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        top: `${(i * 53) % 100}%`,
        delay: `${(i * 0.37) % 6}s`,
        duration: `${8 + ((i * 0.73) % 7)}s`,
      })),
    []
  );

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[--site-bg]">
      {/* Floating Particles */}
      <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[#fff4e9]/30 rounded-full animate-float"
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      <div className="relative z-20 section-padding mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="text-center lg:text-left">
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-[#fff4e9] leading-tight mb-6">
              {title.split(' ').map((word, index) => (
                <span
                  key={index}
                  className={`inline-block mr-4 transition-all duration-800 ${
                    isLoaded
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-10'
                  }`}
                  style={{
                    transitionDelay: `${500 + index * 100}ms`,
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  {word}
                </span>
              ))}
            </h1>
            <p
              className={`text-lg sm:text-xl text-[#fff4e9]/80 max-w-2xl lg:max-w-none mx-auto lg:mx-0 mb-10 font-light transition-all duration-600 ${
                isLoaded
                  ? 'opacity-100 blur-0'
                  : 'opacity-0 blur-sm'
              }`}
              style={{ transitionDelay: '800ms' }}
            >
              {subtitle}
            </p>
            <div
              className={`flex justify-center lg:justify-start transition-opacity duration-500 ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transitionDelay: '1000ms' }}
            >
              <button
                onClick={() => navigate('/shop')}
                className="inline-flex h-12 animate-shimmer items-center justify-center rounded-full border border-slate-800 bg-[linear-gradient(110deg,#000103,45%,#1e2631,55%,#000103)] bg-[length:200%_100%] px-8 font-medium text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 hover:text-[#fff4e9]"
              >
                Explorer nos Collections
              </button>
            </div>
          </div>

          {/* Video Player */}
          <div className={`relative aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-black/30 
                        transition-all duration-1000 ease-in-out
                        ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
               style={{ transitionDelay: '400ms' }}>
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              controls
              poster={settings?.heroImage || "/images/hero-poster.jpg"}
              className="w-full h-full object-cover"
              title="Présentation de la collection de bijoux Tafchaa"
              aria-label="Vidéo de présentation de la joaillerie artisanale Tafchaa"
            >
              <source src={sideVideoSrc} type="video/mp4" />
            </video>
          </div>
        </div>
      </div>

      {/* Scroll Down Indicator */}
      <div
        className={`absolute bottom-10 left-1/2 -translate-x-1/2 transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transitionDelay: '1200ms' }}
      >
        <ChevronDown className="w-8 h-8 text-white/50 animate-bounce" />
      </div>
    </section>
  );
}
