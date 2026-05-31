import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function SEOContent() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);

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
      className="relative py-32 overflow-hidden bg-[--site-bg] border-t border-[#fff4e9]/5"
    >
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-20">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#fff4e9]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-24 w-64 h-64 bg-[#fff4e9]/3 rounded-full blur-2xl" />
      </div>

      <div className="section-padding max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Column: Visual/Accent */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:block"
          >
            <div className="aspect-[4/5] relative rounded-2xl overflow-hidden border border-[#fff4e9]/10 group">
              <img 
                src="/images/product-5.jpg" 
                alt="Luxury jewelry detail" 
                className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[--site-bg] via-transparent to-transparent opacity-60" />
              
              {/* Floating detail box */}
              <div className="absolute bottom-8 left-8 right-8 p-6 backdrop-blur-md bg-black/20 border border-white/10 rounded-xl">
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#fff4e9]/60 block mb-2">Curated Perfection</span>
                <p className="font-display text-xl text-[#fff4e9]">The Art of Fine Accessories</p>
              </div>
            </div>
            
            {/* Geometric accents */}
            <div className="absolute -top-6 -right-6 w-32 h-32 border border-[#fff4e9]/10 rounded-full" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 border border-[#fff4e9]/5 rounded-full" />
          </motion.div>

          {/* Right Column: Content */}
          <div className="text-left lg:pl-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <span className="text-xs uppercase tracking-[0.5em] text-[#fff4e9]/40 mb-6 block">Our Heritage</span>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-[#fff4e9] leading-tight mb-8">
                Your Destination for <span className="italic text-[#fff4e9]/80">Luxury</span> Accessories and Jewelry
              </h2>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="space-y-6 text-[#fff4e9]/70 leading-relaxed text-lg"
            >
              <p>
                At <strong className="text-[#fff4e9]">ETHNIC DECO</strong>, we believe every detail counts. Our collection of <strong className="text-[#fff4e9]/90">fashion accessories</strong> and <strong className="text-[#fff4e9]/90">luxury jewelry</strong> is carefully selected to bring a touch of elegance and distinction to your style. 
              </p>
              
              <p>
                Whether you're looking for a sparkling ring, a refined necklace, or unique handcrafted accessories, our online boutique offers exceptional pieces that blend tradition and modernity.
              </p>

              <div className="pt-12 grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="flex flex-col gap-2">
                  <div className="w-8 h-px bg-[#fff4e9]/30 mb-2" />
                  <h4 className="text-xs uppercase tracking-widest font-bold text-[#fff4e9]">Handcrafted Jewelry</h4>
                  <p className="text-sm text-[#fff4e9]/40">Unique handcrafted pieces in gold and precious stones.</p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="w-8 h-px bg-[#fff4e9]/30 mb-2" />
                  <h4 className="text-xs uppercase tracking-widest font-bold text-[#fff4e9]">Fashion Accessories</h4>
                  <p className="text-sm text-[#fff4e9]/40">Exclusive collection of refined accessories and elegant jewelry.</p>
                </div>
              </div>
              
              <div className="pt-12">
                <motion.a
                  href="/shop"
                  whileHover={{ x: 10 }}
                  className="inline-flex items-center gap-4 text-xs uppercase tracking-[0.3em] font-bold text-[#fff4e9] group"
                >
                  Explore the collection
                  <span className="w-12 h-px bg-[#fff4e9]/30 group-hover:w-20 transition-all duration-500" />
                </motion.a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
