import * as React from "react"
import { twMerge } from "tailwind-merge"
import clsx, { type ClassValue } from "clsx"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", ...props }, ref) => {
    const isVertical = orientation === "vertical"
    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation={orientation}
        className={cn(
          isVertical ? "h-full w-[0.5px]" : "h-[0.5px] w-full",
          "bg-border",
          className
        )}
        {...props}
      />
    )
  }
)
Separator.displayName = "Separator"