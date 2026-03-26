import React, { type ElementType } from "react"
import { cn } from "@/lib/utils"

type BaseProps = {
  as?: ElementType
  containerClassName?: string
  className?: string
  children: React.ReactNode
} & Record<string, unknown>

export function HoverBorderGradient({
  as,
  containerClassName,
  className,
  children,
  ...rest
}: BaseProps) {
  const Comp = (as || "button") as ElementType
  return (
    <div
      className={cn(
        "relative inline-flex rounded-full p-[2px] bg-gradient-to-r from-[#fff4e9]/40 via-transparent to-[#fff4e9]/40 hover:from-[#fff4e9] hover:to-[#fff4e9] transition-colors",
        containerClassName
      )}
    >
      <Comp
        {...rest}
        className={cn(
          "rounded-full px-12 py-5 bg-[#fff4e9] text-[#3d4d5d] dark:bg-black dark:text-white flex items-center gap-2",
          className
        )}
      >
        {children}
      </Comp>
    </div>
  )
}
