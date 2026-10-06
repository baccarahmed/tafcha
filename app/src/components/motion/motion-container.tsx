"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface MotionPageContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  staggerChildren?: number;
  delayChildren?: number;
}

const MotionPageContainer: React.FC<MotionPageContainerProps> = ({
  children,
  className,
  delay = 0,
  staggerChildren = 0.1,
  delayChildren = 0,
}) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{
          duration: 0.5,
          ease: [0.16, 1, 0.3, 1],
          delay,
          staggerChildren,
          delayChildren,
        }}
        className={cn(className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export { MotionPageContainer };
export default MotionPageContainer;
