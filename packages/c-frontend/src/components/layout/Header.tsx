"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import SkinSwitcher from "@/components/skin-switcher"
import { Input } from "@/components/ui/input"
import { searchPosts, type PostSearchItem } from "@/lib/search.api"
import Spinner from "@/components/ui/spinner"
import { Search, MessageCircle, User, LogOut, Settings, Home, X } from "lucide-react"

export default function Header() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  // 搜索相关状态
  const [q, setQ] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchItems, setSearchItems] = useState<PostSearchItem[]>([])
  const [searchTotal, setSearchTotal] = useState(0)
  const [searchActive, setSearchActive] = useState(false)
  const canSearch = useMemo(() => q.trim().length > 0, [q])

  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3030/api", [])
  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return undefined
    if (avatar.startsWith("http")) return avatar
    return `${apiBase}/uploads/${avatar}`
  }

  const isLoggedIn = !!user
  const userName = (user?.profile?.nickname as string | undefined) || (user?.username as string | undefined) || "未登录"
  const userAvatar = getAvatarUrl((user?.profile?.avatar as string | null | undefined) ?? null)

  // 触发搜索
  async function onSearch() {
    const keyword = q.trim()
    if (!keyword) return
    // 头部搜索统一跳转到首页动态页，并通过 URL 参数驱动搜索
    router.push(`/?q=${encodeURIComponent(keyword)}`)
  }

  // 清除搜索
  function clearSearch() {
    setQ("")
    setSearchItems([])
    setSearchTotal(0)
    setSearchActive(false)
    // 清除时返回首页并移除查询参数
    router.push("/")
  }

  return (
    <header className="sticky top-0 z-40 w-full border-border border-b-[0.5px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 justify-between items-center gap-4 px-6 w-full max-w-7xl mx-auto">
        {/* Logo 区域 */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <picture>
              <source srcSet="/brand/lonely-chat-emoji-light-noq.svg" media="(prefers-color-scheme: light)" />
              <source srcSet="/brand/lonely-chat-emoji-dark-noq.svg" media="(prefers-color-scheme: dark)" />
              <img src="/brand/lonely-chat-emoji-light-noq.svg" alt="Lonely Chat" className="h-8 w-8" />
            </picture>
            <span className="text-lg font-bold tracking-tight hidden sm:inline">Lonely Chat</span>
          </Link>
        </div>

        {/* 搜索区域 */}
        <div className="flex-1 max-w-md mx-4">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索动态..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSearch() }}
                className="pl-10 pr-9"
              />
              {q && (
                <button
                  type="button"
                  aria-label="清空搜索"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              size="sm"
              onClick={onSearch}
              disabled={!canSearch || searchLoading}
              className="shrink-0"
            >
              {searchLoading ? <Spinner /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* 导航区域 */}
        <nav className="flex items-center gap-2">
          {/* 消息按钮 */}
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href="/chat">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">消息</span>
            </Link>
          </Button>

          {/* 主题切换器 */}
          <SkinSwitcher compact />

          {/* 用户菜单 */}
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 hover:bg-accent">
                <Avatar className="h-8 w-8">
                  {userAvatar ? (
                    <AvatarImage src={userAvatar} alt={userName} />
                  ) : (
                    <AvatarFallback className="text-xs">
                      {isLoggedIn ? (userName || "?").slice(0, 2) : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              {/* 用户信息 */}
              <div className="flex items-center gap-3 p-2 mb-2">
                <Avatar className="h-8 w-8">
                  {userAvatar ? (
                    <AvatarImage src={userAvatar} alt={userName} />
                  ) : (
                    <AvatarFallback className="text-xs">
                      {isLoggedIn ? (userName || "?").slice(0, 2) : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {isLoggedIn ? userName : "未登录"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isLoggedIn ? "已登录" : "点击登录"}
                  </p>
                </div>
              </div>

              <Separator className="my-2" />

              {/* 菜单项 */}
              <div className="space-y-1">
                {isLoggedIn ? (
                  <>
                    <Button asChild variant="ghost" className="w-full justify-start gap-2 h-9" onClick={() => setMenuOpen(false)}>
                      <Link href="/me">
                        <Settings className="h-4 w-4" />
                        个人设置
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" className="w-full justify-start gap-2 h-9" onClick={() => setMenuOpen(false)}>
                      <Link href="/chat">
                        <MessageCircle className="h-4 w-4" />
                        聊天消息
                      </Link>
                    </Button>
                    {user?.username && (
                      <Button asChild variant="ghost" className="w-full justify-start gap-2 h-9" onClick={() => setMenuOpen(false)}>
                        <Link href={`/u/${encodeURIComponent(user.username)}`}>
                          <Home className="h-4 w-4" />
                          我的主页
                        </Link>
                      </Button>
                    )}
                    <Separator className="my-2" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => { setMenuOpen(false); logout() }}
                    >
                      <LogOut className="h-4 w-4" />
                      退出登录
                    </Button>
                  </>
                ) : (
                  <Button asChild variant="ghost" className="w-full justify-start gap-2 h-9" onClick={() => setMenuOpen(false)}>
                    <Link href="/auth/login">
                      <User className="h-4 w-4" />
                      登录账户
                    </Link>
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </nav>
      </div>
    </header>
  )
}