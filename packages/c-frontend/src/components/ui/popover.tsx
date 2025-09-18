import * as React from "react"
import { cn } from "@/lib/utils"

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null)

export interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

export function Popover({ open, onOpenChange, children, className }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLElement | null>(null)
  const contentRef = React.useRef<HTMLDivElement | null>(null)

  const isControlled = typeof open !== "undefined"
  const actualOpen = isControlled ? !!open : uncontrolledOpen
  const setOpen = (v: boolean) => {
    if (isControlled) onOpenChange?.(v)
    else setUncontrolledOpen(v)
  }

  React.useEffect(() => {
    if (!actualOpen) return
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (contentRef.current?.contains(t) || triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [actualOpen])

  return (
    <span className={cn("relative inline-block", className)}>
      <PopoverContext.Provider value={{ open: actualOpen, setOpen, triggerRef, contentRef }}>
        {children}
      </PopoverContext.Provider>
    </span>
  )
}

export interface PopoverTriggerProps extends React.HTMLAttributes<HTMLElement> {
  asChild?: boolean
}

export const PopoverTrigger = React.forwardRef<HTMLElement, PopoverTriggerProps>(
  ({ asChild = false, onClick, ...props }, ref) => {
    const ctx = React.useContext(PopoverContext)
    if (!ctx) throw new Error("PopoverTrigger must be used within Popover")

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
      onClick?.(e)
      ctx.setOpen(!ctx.open)
    }

    if (asChild && React.isValidElement(props.children)) {
      return React.cloneElement(props.children as any, {
        ref: (node: HTMLElement) => {
          if (typeof ref === "function") ref(node)
          else if (ref && typeof (ref as any).current !== "undefined") (ref as any).current = node
          ctx.triggerRef.current = node
        },
        onClick: handleClick,
      })
    }

    return (
      <button
        ref={(node: any) => {
          if (typeof ref === "function") ref(node)
          else if (ref && typeof (ref as any).current !== "undefined") (ref as any).current = node
          ctx.triggerRef.current = node
        }}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
PopoverTrigger.displayName = "PopoverTrigger"

export interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end"
  side?: "top" | "right" | "bottom" | "left"
}

export const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = "center", side = "bottom", style, ...props }, ref) => {
    const ctx = React.useContext(PopoverContext)
    if (!ctx) throw new Error("PopoverContent must be used within Popover")

    // Hooks 必须无条件调用，避免因条件渲染导致顺序变化
    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => {
      if (!ctx.open) {
        setMounted(false)
        return
      }
      setMounted(false)
      const id = requestAnimationFrame(() => setMounted(true))
      return () => cancelAnimationFrame(id)
      // 依赖 open 与 side（方向变化时也重新触发动画）
    }, [ctx.open, side])

    // 未打开时不渲染内容（在调用完 Hooks 之后再返回）
    if (!ctx.open) return null

    const alignClass =
      align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2 -translate-x-1/2"
    const sideClass =
      side === "top" ? "bottom-full mb-2" : side === "right" ? "left-full ml-2" : side === "left" ? "right-full mr-2" : "top-full mt-2"

    let closedOffset = ""
    let openOffset = ""
    if (side === "bottom") {
      closedOffset = "translate-y-1"
      openOffset = "translate-y-0"
    } else if (side === "top") {
      closedOffset = "-translate-y-1"
      openOffset = "translate-y-0"
    } else if (side === "right") {
      closedOffset = "translate-x-1"
      openOffset = "translate-x-0"
    } else {
      closedOffset = "-translate-x-1"
      openOffset = "translate-x-0"
    }

    const motionClass = mounted
      ? `opacity-100 scale-100 ${openOffset}`
      : `opacity-0 scale-95 ${closedOffset}`

    return (
      <div
        ref={(node) => {
          if (typeof ref === "function") ref(node)
          else if (ref && typeof (ref as any).current !== "undefined") (ref as any).current = node
          ctx.contentRef.current = node
        }}
        className={cn(
          // 不透明背景 + 边框 + 阴影
          "absolute z-50 rounded-md border bg-background text-foreground shadow-md outline-none",
          // 动画/过渡
          "transition-all duration-200 ease-out will-change-transform",
          motionClass,
          alignClass,
          sideClass,
          className
        )}
        style={style}
        {...props}
      />
    )
  }
)
PopoverContent.displayName = "PopoverContent"