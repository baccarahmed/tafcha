import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { ChevronRight, Check } from 'lucide-react';

interface SlideToConfirmProps {
  onConfirm: () => void;
  text?: string;
  confirmedText?: string;
  disabled?: boolean;
}

export default function SlideToConfirm({
  onConfirm,
  text = "Slide to confirm",
  confirmedText = "Confirmed",
  disabled = false
}: SlideToConfirmProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const controls = useAnimation();

  // Width of the container - width of the handle (approx 56px)
  const [constraints, setConstraints] = useState({ left: 0, right: 0 });

  useEffect(() => {
    if (containerRef.current) {
      setConstraints({
        left: 0,
        right: containerRef.current.offsetWidth - 64
      });
    }
  }, []);

  const opacity = useTransform(x, [0, 150], [1, 0]);
  const fillWidth = useTransform(x, [0, containerRef.current?.offsetWidth || 300], ["0%", "100%"]);

  const handleDragEnd = async () => {
    const finalX = x.get();
    const containerWidth = containerRef.current?.offsetWidth || 0;
    
    if (finalX > containerWidth * 0.7) {
      // Confirmed!
      await controls.start({ x: containerWidth - 64 });
      setIsConfirmed(true);
      onConfirm();
    } else {
      // Snap back
      controls.start({ x: 0 });
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative h-16 w-full rounded-full border border-[#fff4e9]/20 overflow-hidden flex items-center p-1 transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      style={{ backgroundColor: isConfirmed ? '#fff4e9' : 'rgba(0, 1, 3, 0.5)' }}
    >
      {/* Background fill on slide */}
      {!isConfirmed && (
        <motion.div
          style={{ width: fillWidth }}
          className="absolute inset-y-0 left-0 bg-[#fff4e9]/10 rounded-full"
        />
      )}

      {/* Background track text */}
      <motion.div 
        style={{ opacity }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
      >
        <span className="text-[#fff4e9]/40 text-sm font-semibold uppercase tracking-widest flex items-center gap-2">
          {text} <ChevronRight className="w-4 h-4" />
        </span>
      </motion.div>

      {/* Confirmed state text */}
      {isConfirmed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-slate-950 font-bold uppercase tracking-widest flex items-center gap-2">
            <Check className="w-5 h-5" /> {confirmedText}
          </span>
        </div>
      )}

      {/* Draggable Handle */}
      {!isConfirmed && (
        <motion.div
          drag={disabled ? false : "x"}
          dragConstraints={constraints}
          dragElastic={0.1}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          animate={controls}
          style={{ x }}
          whileHover={disabled ? {} : { scale: 1.05 }}
          whileTap={disabled ? {} : { scale: 0.95 }}
          className={`z-10 w-14 h-14 rounded-full bg-[#fff4e9] flex items-center justify-center shadow-lg ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
          }`}
        >
          <ChevronRight className="w-6 h-6 text-slate-950" />
        </motion.div>
      )}
    </div>
  );
}
