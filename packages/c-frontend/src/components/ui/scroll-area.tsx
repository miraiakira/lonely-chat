import * as React from "react"
import { twMerge } from "tailwind-merge"
import clsx from "clsx"

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs))
}

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {}

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative w-full overflow-hidden", className)}
        {...props}
      >
        <div className="h-full max-h-full w-full overflow-y-auto">
          {children}
        </div>
      </div>
    )
  }
)
ScrollArea.displayName = "ScrollArea"