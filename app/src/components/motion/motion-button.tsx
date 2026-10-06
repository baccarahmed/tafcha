"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type CyberMotionButtonProps = HTMLMotionProps<"button"> & {
  children: React.ReactNode;
};

const CyberMotionButton = React.forwardRef<HTMLButtonElement, CyberMotionButtonProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

CyberMotionButton.displayName = "CyberMotionButton";

export { CyberMotionButton };
export default CyberMotionButton;
