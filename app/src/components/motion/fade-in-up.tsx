"use client";

import * as React from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

type AsElement = "div" | "section" | "article";

interface FadeInUpProps {
  children: React.ReactNode;
  delay?: number;
  as?: AsElement;
  className?: string;
  staggerChildren?: number;
}

const containerVariants = (staggerChildren: number = 0.1): Variants => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren,
    },
  },
});

const itemVariants = (delay: number = 0): Variants => ({
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as const,
      delay,
    },
  },
});

const MOTION_TAGS = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
} as const;

const FadeInUp: React.FC<FadeInUpProps> = ({
  children,
  delay = 0,
  as = "div",
  className,
  staggerChildren = 0.1,
}) => {
  const Component = MOTION_TAGS[as];

  return (
    <Component
      variants={containerVariants(staggerChildren)}
      initial="hidden"
      animate="show"
      className={cn(className)}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={itemVariants(delay + index * staggerChildren)}
        >
          {child}
        </motion.div>
      ))}
    </Component>
  );
};

export { FadeInUp, containerVariants, itemVariants };
export default FadeInUp;
