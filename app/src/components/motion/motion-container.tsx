"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MotionPageContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  staggerChildren?: number;
  delayChildren?: number;
}

/**
 * Entree de page unique et breve.
 *
 * Pas d'`AnimatePresence mode="wait"` : l'ancienne version attendait la fin de
 * l'animation de sortie (0,5 s) avant de monter la nouvelle page, ce qui
 * ajoutait un delai artificiel a chaque navigation. On garde un simple fondu
 * parallele de 0,25 s, desactive si l'utilisateur prefere les mouvements reduits.
 */
const MotionPageContainer: React.FC<MotionPageContainerProps> = ({
  children,
  className,
  delay = 0,
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.16, 1, 0.3, 1], delay }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
};

export { MotionPageContainer };
export default MotionPageContainer;
