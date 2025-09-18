"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const SKINS = ["classic", "aurora", "graphite", "midnight"] as const;

type Skin = typeof SKINS[number];

function setSkinCookie(skin: Skin) {
  try {
    document.cookie = `skin=${encodeURIComponent(skin)}; path=/; max-age=31536000; samesite=lax`;
  } catch {}
}

function applySkin(skin: Skin) {
  document.documentElement.setAttribute("data-skin", skin);
  try { localStorage.setItem("skin", skin); } catch {}
  setSkinCookie(skin);
}

export default function SkinSwitcher({ compact = false }: { compact?: boolean }) {
  // 初始用 classic 仅用于 SSR 文本占位；实际值在挂载后从 DOM/localStorage 同步
  const [active, setActive] = useState<Skin>("classic");
  const [open, setOpen] = useState(false)
  const isFirst = useRef(true)

  // 挂载后，从现有 DOM 的 data-skin 或 localStorage 同步真实皮肤
  useEffect(() => {
    try {
      const domSkin = (document.documentElement.getAttribute("data-skin") as Skin) || "";
      const stored = (localStorage.getItem("skin") as Skin) || "";
      const next = (SKINS as readonly string[]).includes(domSkin) ? domSkin : ((SKINS as readonly string[]).includes(stored) ? stored : "classic");
      if (next !== active) {
        setActive(next as Skin);
      }
    } catch {}
    // 跳过首个 apply，避免把 DOM 再次写回 classic
    // 下一次 active 变化时再应用（若与 DOM 相同则是幂等的）
    isFirst.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 仅在首个周期之后才应用到 DOM、localStorage 与 Cookie，避免进入页面时短暂重置为 classic
  useEffect(() => {
    if (isFirst.current) return;
    applySkin(active);
  }, [active]);

  const sizeClass = compact ? "h-8 px-2" : "h-9 px-3";
  const swatchClass = compact ? "h-3.5 w-3.5" : "h-4 w-4";

  const Trigger = (
    <Button variant="outline" size={compact ? "sm" : "default"} className={cn("gap-2", sizeClass)}>
      <span className={cn("rounded-full border", swatchClass)} style={{ background: getSwatch(active) }} />
      <span className="text-sm">{labelOf(active)}</span>
      <ChevronDown className="h-4 w-4 opacity-60" />
    </Button>
  )

  return (
    <div className="inline-flex items-center gap-2">
      {!compact && <span className="text-sm text-muted-foreground">皮肤</span>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {Trigger}
        </PopoverTrigger>
        <PopoverContent className="min-w-[180px] p-1 !bg-card" align="start">
           <div role="listbox" aria-label="选择皮肤" className="flex flex-col">
             {SKINS.map((s) => {
               const selected = s === active
               return (
                 <button
                   key={s}
                   role="option"
                   aria-selected={selected}
                   onClick={() => { setActive(s); setOpen(false) }}
                   className={cn(
                     "flex items-center gap-2 px-2 py-2 rounded-md text-sm text-left",
                     selected ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                   )}
                 >
                   <span className={cn("rounded-full border", swatchClass)} style={{ background: getSwatch(s) }} />
                   <span className="flex-1">{labelOf(s)}</span>
                   {selected && <Check className="h-4 w-4" />}
                 </button>
               )})}
           </div>
         </PopoverContent>
      </Popover>
    </div>
  );
}

function labelOf(s: Skin) {
  switch (s) {
    case "classic":
      return "默认";
    case "aurora":
      return "极光";
    case "graphite":
      return "石墨";
    case "midnight":
      return "子夜";
  }
}

function getSwatch(s: Skin) {
  switch (s) {
    case "classic":
      return "linear-gradient(135deg,#fff,#f3f4f6)";
    case "aurora":
      return "linear-gradient(135deg,#6366f1,#ec4899)";
    case "graphite":
      return "linear-gradient(135deg,#f7f7f8,#e4e4e7)";
    case "midnight":
      return "linear-gradient(135deg,#0f172a,#6d28d9)";
  }
}