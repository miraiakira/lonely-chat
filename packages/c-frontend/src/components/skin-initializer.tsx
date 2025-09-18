"use client"

import { useEffect } from "react"

const DEFAULT_SKIN = "classic"

export default function SkinInitializer() {
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("skin") || DEFAULT_SKIN
        document.documentElement.setAttribute("data-skin", saved)
      }
    } catch {}
  }, [])
  return null
}