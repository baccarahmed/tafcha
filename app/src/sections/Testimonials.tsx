import { useEffect, useRef, useState } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: 'Sarah Mitchell',
    avatar: '/images/avatar-1.jpg',
    rating: 5,
    text: 'The quality of these pieces is absolutely stunning. I bought the Minimalist Elegance necklace and have received so many compliments. It\'s become my everyday favorite!',
  },
  {
    id: 2,
    name: 'Emma Thompson',
    avatar: '/images/avatar-2.jpg',
    rating: 5,
    text: 'Tafchaa made my wedding day even more special. The bridal collection is breathtaking, and the customer service was exceptional. Highly recommend!',
  },
  {
    id: 3,
    name: 'Olivia Chen',
    avatar: '/images/avatar-3.jpg',
    rating: 5,
    text: 'I\'ve been searching for timeless pieces that don\'t break the bank, and Tafchaa delivered. The packaging is beautiful too - perfect for gifting!',
  },
  {
    id: 4,
    name: 'Isabella Rodriguez',
    avatar: '/images/avatar-4.jpg',
    rating: 5,
    text: 'Fast shipping, beautiful presentation, and the jewelry exceeded my expectations. The Timeless Classics ring is now a cherished part of my collection.',
  },
  {
    id: 5,
    name: 'Sophie Williams',
    avatar: '/images/avatar-5.jpg',
    rating: 5,
    text: 'The attention to detail in every piece is remarkable. You can tell these are crafted with love and care. Tafchaa has become my go-to for all jewelry gifts.',
  },
];

export default function Testimonials() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

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

  // Auto-rotate
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToPrev = () => {
    setIsAutoPlaying(false);
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  return (
    <section
      ref={sectionRef}
      className="py-24 bg-[--panel-bg] relative overflow-hidden"
    >
      <div className="section-padding">
        {/* Header */}
        <div className="text-center mb-16">
          <h2
            className={`font-display text-4xl sm:text-5xl md:text-6xl text-[#fff4e9] transition-all duration-600 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            Happy Clients
          </h2>
        </div>

        {/* Carousel */}
        <div className="relative max-w-4xl mx-auto">
          {/* Navigation Buttons */}
          <button
            onClick={goToPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-16 z-10
                       w-12 h-12 rounded-full border border-[#fff4e9]/30 flex items-center justify-center
                       text-[#fff4e9] hover:bg-[#fff4e9]/10 hover:border-[#fff4e9]/50 transition-all duration-300"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 lg:translate-x-16 z-10
                       w-12 h-12 rounded-full border border-[#fff4e9]/30 flex items-center justify-center
                       text-[#fff4e9] hover:bg-[#fff4e9]/10 hover:border-[#fff4e9]/50 transition-all duration-300"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Cards Container */}
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div
                  key={testimonial.id}
                  className="w-full flex-shrink-0 px-4"
                >
                  <div
                    className={`text-center transition-all duration-500 ${
                      index === activeIndex
                        ? 'opacity-100 scale-100'
                        : 'opacity-50 scale-95'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative inline-block mb-6">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#fff4e9]/30">
                        <img
                          src={testimonial.avatar}
                          alt={`Témoignage client Tafchaa - ${testimonial.name}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Stars */}
                    <div className="flex items-center justify-center gap-1 mb-6">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-5 h-5 fill-[#f3e7d9] text-[#f3e7d9]"
                          style={{
                            animation: index === activeIndex ? `sparkle 0.5s ease-out ${i * 100}ms forwards` : 'none',
                          }}
                        />
                      ))}
                    </div>

                    {/* Quote */}
                    <blockquote className="font-display text-xl sm:text-2xl text-[#fff4e9] leading-relaxed mb-6 max-w-2xl mx-auto">
                      "{testimonial.text}"
                    </blockquote>

                    {/* Name */}
                    <cite className="not-italic">
                      <span className="text-[#fff4e9]/80 font-medium">
                        {testimonial.name}
                      </span>
                    </cite>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsAutoPlaying(false);
                  setActiveIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? 'w-8 bg-[#fff4e9]'
                    : 'bg-[#fff4e9]/30 hover:bg-[#fff4e9]/50'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sparkle {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          50% { transform: scale(1.3) rotate(180deg); opacity: 1; }
          100% { transform: scale(1) rotate(360deg); opacity: 1; }
        }
      `}</style>
    </section>
  );
}
