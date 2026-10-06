"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HoverCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}

const HoverCard: React.FC<HoverCardProps> = ({
  children,
  className,
  onClick,
  onHoverStart,
  onHoverEnd,
}) => {
  return (
    <motion.div
      whileHover={{
        y: -8,
        scale: 1.01,
        transition: { type: "spring", stiffness: 300, damping: 25 },
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
};

export { HoverCard };
export default HoverCard;
