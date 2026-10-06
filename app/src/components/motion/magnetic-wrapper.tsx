"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "@/lib/utils";

interface MagneticProps {
  children: React.ReactNode;
  className?: string;
  strength?: number;
}

const Magnetic: React.FC<MagneticProps> = ({
  children,
  className,
  strength = 15,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const xTransform = useTransform(x, (value) => `${value}px`);
  const yTransform = useTransform(y, (value) => `${value}px`);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const offsetX = (e.clientX - centerX) / (rect.width / 2);
    const offsetY = (e.clientY - centerY) / (rect.height / 2);

    x.set(offsetX * strength);
    y.set(offsetY * strength);
  };

  const handleMouseLeave = () => {
    animate(x, 0, { type: "spring", stiffness: 200, damping: 15, mass: 0.2 });
    animate(y, 0, { type: "spring", stiffness: 200, damping: 15, mass: 0.2 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("inline-block", className)}
    >
      <motion.div style={{ x: xTransform, y: yTransform }}>
        {children}
      </motion.div>
    </div>
  );
};

export { Magnetic };
export default Magnetic;
