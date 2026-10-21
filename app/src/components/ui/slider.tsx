"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "group/slider relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="bg-[var(--q2m-bone)] relative h-1 w-full grow overflow-hidden rounded-full transition-[height] duration-140 ease-q2m group-hover/slider:h-1.5 group-active/slider:h-1.5"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="bg-[var(--q2m-accent)] absolute h-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="border-[var(--q2m-accent)] bg-[var(--q2m-bg-elevated)] ring-[var(--q2m-accent)]/40 block size-4 shrink-0 rounded-full border-2 shadow-sm transition-[color,box-shadow,transform] duration-140 ease-q2m hover:ring-4 focus-visible:ring-4 focus-visible:outline-none active:scale-110 disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
