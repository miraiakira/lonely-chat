"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useChatStore } from "@/store/chat"
import { useState } from "react"

interface ChatHeaderProps {
  className?: string
}

const MessageAvatar = ({ 
  src, 
  alt, 
  fallbackText, 
  className 
}: { 
  src?: string
  alt: string
  fallbackText: string
  className?: string 
}) => {
  const [bad, setBad] = useState(false)
  const normalized = ensureAbsoluteUrl(src)
  const showImg = !!normalized && !bad
  
  return (
    <Avatar className={className}>
      {showImg ? (
        <AvatarImage src={normalized!} alt={alt} onError={() => setBad(true)} />
      ) : (
        <AvatarFallback>{fallbackText}</AvatarFallback>
      )}
    </Avatar>
  )
}

const ensureAbsoluteUrl = (s?: string) => {
  if (!s) return undefined
  if (s.startsWith("http://") || s.startsWith("https://")) return s
  if (s.startsWith("/")) return `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"}${s}`
  return `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"}/${s}`
}

const getInitial = (name: string) => (name || "").slice(0, 2)

export function ChatHeader({ className }: ChatHeaderProps) {
  const { getHeaderName, getHeaderAvatar } = useChatStore()
  
  const headerName = getHeaderName()
  const headerAvatar = getHeaderAvatar()

  // 规范化会话名称，去掉“与XX的聊天”等冗余文案
  const normalizeName = (name: string) => {
    const n = (name || "").trim()
    // 直接匹配常见中文格式
    const m = n.match(/^\s*(?:与|和)\s*(.+?)\s*的聊天\s*$/)
    if (m) return m[1]
    // 英文格式，如 "Chat with Alice"
    const en = n.match(/^\s*Chat\s+with\s+(.+)$/i)
    if (en) return en[1]
    // 其他前缀清理（例如可能存在的多余空格或标点）
    return n.replace(/^与\s*/, "").replace(/\s*的聊天$/, "").trim()
  }
  const displayName = normalizeName(headerName || "")

  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      {displayName && (
        <MessageAvatar 
          src={headerAvatar}
          alt={displayName}
          fallbackText={getInitial(displayName)}
          className="h-5 w-5" 
        />
      )}
      <span>{displayName}</span>
    </div>
  )
}