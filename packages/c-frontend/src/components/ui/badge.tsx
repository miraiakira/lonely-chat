import * as React from "react"
import { twMerge } from "tailwind-merge"
import clsx from "clsx"

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs))
}

type Variant = "default" | "secondary" | "outline"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
    const variants: Record<Variant, string> = {
      default: "border-transparent bg-primary text-primary-foreground",
      secondary: "border-transparent bg-secondary text-secondary-foreground",
      outline: "border-border text-foreground",
    }
    return (
      <span ref={ref} className={cn(base, variants[variant], className)} {...props} />
    )
  }
)
Badge.displayName = "Badge"