"use client"

import { usePathname } from "next/navigation"
import Header from "@/components/layout/Header"

export default function HeaderGate() {
  const pathname = usePathname()
  // 仅登录页隐藏整体 Header
  const hideOn = ["/auth/login"]
  const show = !hideOn.includes(pathname)
  return show ? <Header /> : null
}