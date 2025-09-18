import * as React from "react"
import { twMerge } from "tailwind-merge"
import clsx from "clsx"

function cn(...inputs: any[]) {
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
          isVertical ? "h-full w-px" : "h-px w-full",
          "bg-border",
          className
        )}
        {...props}
      />
    )
  }
)
Separator.displayName = "Separator"