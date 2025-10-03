import * as React from "react"
import { twMerge } from "tailwind-merge"
import clsx, { ClassValue } from "clsx"

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type ScrollAreaProps = React.HTMLAttributes<HTMLDivElement>

export const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative w-full overflow-hidden", className)}
        {...props}
      >
        <div className="h-full max-h-full w-full overflow-y-auto themed-scroll">
          {children}
        </div>
      </div>
    )
  }
)
ScrollArea.displayName = "ScrollArea"