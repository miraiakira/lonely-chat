"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { initRealtimeLogging, getSocket, onGroupCreated } from "@/lib/realtime"
import { useEffect, useMemo, useState, useRef, type ChangeEvent } from "react"
import { useAuth } from "@/hooks/useAuth"
import { getAccessToken } from "@/lib/apiClient"
import { useChatStore } from "@/store/chat"
import { Send, Plus, MessageSquareMore, CheckCircle, XCircle } from "lucide-react"
import SkinSwitcher from "@/components/skin-switcher"
import React from "react"
import { AutoSizer, List, CellMeasurer, CellMeasurerCache } from "react-virtualized"
import type { Message } from "@/lib/chat.api"
import { Checkbox } from "@/components/ui/checkbox"
import { createGroup as apiCreateGroup } from "@/lib/chat.api"
import { useSearchParams } from "next/navigation"

export default function ChatPage() {
  const { user, loading } = useAuth()
  const [wsError, setWsError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  // 在客户端挂载后再渲染虚拟列表，避免 SSR 与 CSR 布局测量不一致导致的 Hydration mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const {
    q, convs, activeId, messages, draft,
    peopleQ, friends, found, inboundReqs,
    init, setQ, setPeopleQ, setActive, setDraft,
    send, searchPeople, addFriend, accept, decline, removeFriend,
    receive, refreshLists,
  } = useChatStore()

  const activeConv = useMemo(() => convs.find(c => c.id === activeId) || null, [convs, activeId])
  const isDirectStart = useMemo(() => !!activeId && activeId.startsWith("direct:"), [activeId])
  const directUserId = useMemo(() => (isDirectStart ? (activeId as string).split(":")[1] : null), [isDirectStart, activeId])
  const directUserName = useMemo(() => {
    if (!isDirectStart || !directUserId) return null
    const f = friends.find(x => x.id === directUserId)
    return f?.name || `用户 ${directUserId}`
  }, [isDirectStart, directUserId, friends])
  const headerName = useMemo(() => activeConv?.name || directUserName || "消息", [activeConv?.name, directUserName])
  const headerAvatar = useMemo(() => {
    if (activeConv?.avatar) return activeConv.avatar
    if (isDirectStart && directUserId) {
      const f = friends.find(x => x.id === directUserId)
      return f?.avatar
    }
    return undefined
  }, [activeConv?.avatar, isDirectStart, directUserId, friends])

  // 名称与时间格式化（使用 UTC，避免 SSR/CSR 本地化差异导致 Hydration mismatch）
  const pad2 = (n: number) => String(n).padStart(2, "0")
  const isSameUTCDate = (a: Date, b: Date) => (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
  const formatDateUTC = (d: Date) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
  const formatHMUTC = (d: Date) => `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`
  const formatTime = (ts: number) => {
    try {
      const d = new Date(ts)
      // 移除对“当前时间 now”与“是否同一天”的判断，避免 SSR 与 CSR 时间位移导致的初次渲染差异
      return `${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${formatHMUTC(d)}`
    } catch {
      return ""
    }
  }

  // 名称与头像获取（稳定）
  const getSenderName = (senderId: string) => {
    const meId = String(user?.id || "me")
    if (String(senderId) === meId) return user?.username || "我"
    const f = friends.find(x => x.id === String(senderId))
    return f?.name || (activeConv?.name && activeConv?.name) || `用户 ${senderId}`
  }
  const getSenderAvatar = (senderId: string) => {
    const meId = String(user?.id || "me")
    if (String(senderId) === meId) return (user as any)?.profile?.avatar || undefined
    const f = friends.find(x => x.id === String(senderId))
    return f?.avatar || undefined
  }
  const getInitial = (name: string) => (name || "").slice(0, 2)

  // 仅用于消息体中的头像：有图片则只显示图片，失败时才回退到字母
  const MessageAvatar = ({ src, alt, fallbackText, className }: { src?: string; alt: string; fallbackText: string; className?: string }) => {
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

  // --- Toast（轻提示） ---
  const [toasts, setToasts] = useState<Array<{ id: number; text: string; type?: "success" | "error" }>>([])
  // 创建群聊：UI 状态
  const [groupOpen, setGroupOpen] = useState(false)
  const [groupTitle, setGroupTitle] = useState("")
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [leftTab, setLeftTab] = useState<'convs' | 'friends' | 'discover'>("convs")
  // removed: peopleTab state now merged into leftTab

  const showToast = (text: string, type: "success" | "error" = "success") => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts(prev => [...prev, { id, text, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2400)
  }

  const selectedIds = useMemo(() => Object.keys(selected).filter(k => selected[k]), [selected])
  async function onCreateGroup() {
    if (selectedIds.length === 0) { showToast("请至少选择 1 位好友", "error"); return }
    try {
      const res = await apiCreateGroup({ title: groupTitle.trim() || undefined, participantIds: selectedIds })
      setGroupOpen(false)
      setGroupTitle("")
      setSelected({})
      await refreshLists()
      await setActive(res.id)
      showToast("已创建群聊")
    } catch (e) {
      showToast("创建群聊失败，请稍后再试", "error")
    }
  }
  // --- 消息自动滚动到底部 + 虚拟列表 ---
  // 使用 react-virtualized 实现虚拟列表与吸底
  const listRef = useRef<any>(null)
  const DEFAULT_ROW_H = 84
  const NEAR_BOTTOM_PX = 80
  const OVERSCAN = 10
  const cacheRef = useRef(new CellMeasurerCache({ fixedWidth: true, defaultHeight: DEFAULT_ROW_H }))
  const [stickBottom, setStickBottom] = useState(true)
  const [newCount, setNewCount] = useState(0)
  const prevLenRef = useRef(0)

  // 将消息转换为“分隔行 + 消息行”的 rows（使用 UTC 日期分隔，避免本地化差异）
  const rows = useMemo(() => {
    const out: Array<{ type: 'separator'; key: string; text: string } | { type: 'message'; key: string; msg: Message }> = []
    let lastDay: string | null = null
    for (const m of messages) {
      const d = new Date(m.timestamp)
      const day = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
      if (day !== lastDay) {
        out.push({ type: 'separator', key: `sep-${day}`, text: formatDateUTC(d) })
        lastDay = day
      }
      out.push({ type: 'message', key: `msg-${String((m as any).id ?? m.timestamp)}`, msg: m })
    }
    return out
  }, [messages])

  const onListScroll = ({ clientHeight, scrollHeight, scrollTop }: { clientHeight: number; scrollHeight: number; scrollTop: number }) => {
    const near = scrollHeight - (scrollTop + clientHeight) < NEAR_BOTTOM_PX
    setStickBottom(near)
    if (near) setNewCount(0)
  }

  // 消息变更：重算高度；根据来源/贴底状态决定是否滚底；管理“新消息”提示
  useEffect(() => {
    cacheRef.current.clearAll()
    listRef.current?.recomputeRowHeights?.()
    const prev = prevLenRef.current
    const curr = messages.length
    if (curr > prev) {
      const last = messages[messages.length - 1]
      const isMine = String(last?.senderId) === String(user?.id || 'me')
      if (isMine || stickBottom) {
        listRef.current?.scrollToRow?.(Math.max(0, rows.length - 1))
        setNewCount(0)
      } else {
        setNewCount(c => c + (curr - prev))
      }
    } else if (stickBottom) {
      listRef.current?.scrollToRow?.(Math.max(0, rows.length - 1))
    }
    prevLenRef.current = curr
  }, [messages.length, stickBottom, rows.length, user?.id])

  // 切换会话或首次加载：自动吸底
  useEffect(() => {
    setStickBottom(true)
    setNewCount(0)
    setTimeout(() => listRef.current?.scrollToRow?.(Math.max(0, rows.length - 1)), 0)
  }, [activeId, rows.length])

  // --- ws auth feedback ---
  useEffect(() => {
    initRealtimeLogging()
    const s = getSocket()
    if (!s) return
    const onAuthErr = (payload: any) => {
      console.warn("[ws] auth_error", payload)
      setWsError(payload?.message || "实时连接鉴权失败")
    }
    const onConnect = () => setWsError(null)
    const onMessage = (msg: any) => {
      // 后端已返回前端 Message 结构
      receive(msg)
    }
    const offGroup = onGroupCreated(async (evt) => {
      // 简单处理：收到新群聊事件时刷新一次会话列表，并尝试自动切换到该会话（如果当前不是临时直聊状态）
      await refreshLists()
      const { activeId } = useChatStore.getState()
      if (!activeId || !activeId.startsWith('direct:')) {
        try { await setActive(evt.id) } catch {}
      }
    })
    s.on("auth_error", onAuthErr)
    s.on("connect", onConnect)
    s.on("message", onMessage)
    return () => {
      s.off("auth_error", onAuthErr)
      s.off("connect", onConnect)
      s.off("message", onMessage)
      offGroup?.()
    }
  }, [receive, refreshLists, setActive])

  // --- 加载初始化 ---
  useEffect(() => {
    // 初始化会话列表、好友列表等
    init().catch(() => {})
  }, [init])

  // URL 参数：/chat?conv=xxx 时自动切换到该会话
  useEffect(() => {
    const convId = searchParams.get('conv')
    if (convId && convId !== activeId) {
      setActive(convId).catch(() => {})
    }
    // 仅在 searchParams 或 activeId 变化时尝试切换
  }, [searchParams, activeId, setActive])

  // 当用户信息就绪时，确保 WS 使用令牌连接
  useEffect(() => {
    if (!user) return
    const s = getSocket()
    if (!s) return
    const token = getAccessToken()
    if (token && !s.connected) {
      try {
        ;(s as any).auth = { token }
        s.connect()
      } catch {}
    }
  }, [user])

  // 发送与好友操作
  async function onSend() {
    await send(user?.id || "me")
  }
  async function onSearchPeople() { searchPeople() }
  async function onAddFriend(id: string) {
    try {
      await addFriend(id)
      showToast("已发送好友申请")
    } catch (e) {
      showToast("发送失败，请稍后重试", "error")
    }
  }
  async function onAccept(reqId: string) { accept(reqId) }
  async function onDecline(reqId: string) { decline(reqId) }
  async function onRemoveFriend(id: string) {
    try {
      const ok = typeof window !== 'undefined' ? window.confirm('确定要删除该好友吗？') : true
      if (!ok) return
      await removeFriend(id)
      showToast('已删除好友')
    } catch (e) {
      showToast('删除失败，请稍后重试', 'error')
    }
  }

  return (
    <main className="min-h-dvh p-0 md:p-4 max-w-[1200px] mx-auto">
      {/* Toast 容器 */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] space-y-2 w-full max-w-xs" aria-live="polite" aria-atomic="true">
        {toasts.map(t => (
          <div
            key={t.id}
            className="rounded-md px-3 py-2 shadow-lg text-sm border bg-background text-foreground flex items-center gap-2"
          >
            {t.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      <header className="px-4 py-3 flex items-center justify-between sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">聊天</h1>
          {user && <span className="text-sm text-muted-foreground">{user.username}</span>}
        </div>
        <div className="flex items-center gap-3">
          <SkinSwitcher compact />
          <Button asChild variant="outline"><Link href="/">返回首页</Link></Button>
        </div>
      </header>

      {wsError && (
        <div className="mx-4 rounded-md border p-3 bg-red-50 text-red-700 text-sm">
          实时连接受限：{wsError}
        </div>
      )}

      {!loading && !user && (
        <div className="mx-4 rounded-md border p-3 bg-yellow-50 text-yellow-900 text-sm flex items-center justify-between">
          <div>您还未登录，登录后可参与聊天。</div>
          <Button asChild size="sm"><Link href="/auth/login">去登录</Link></Button>
        </div>
      )}

      <section className="p-4 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
        {/* Conversations */}
        <Card className="overflow-hidden border-muted">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 border-b pb-2">
              <button
                className={`text-sm px-2 py-1 rounded-md ${leftTab === 'convs' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => setLeftTab('convs')}
              >会话</button>
              <button
                className={`text-sm px-2 py-1 rounded-md ${leftTab === 'friends' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => setLeftTab('friends')}
              >好友列表</button>
              <button
                className={`text-sm px-2 py-1 rounded-md ${leftTab === 'discover' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                onClick={() => setLeftTab('discover')}
              >发现</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {leftTab === 'convs' ? (
              <>
                <Input placeholder="搜索会话" value={q} onChange={(e: ChangeEvent<HTMLInputElement>) => setQ(e.target.value)} />
                <ScrollArea className="h-[420px] pr-2">
                  <div className="space-y-1">
                    {convs
                      .filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()))
                      .map(c => (
                      <button
                        key={c.id}
                        onClick={() => setActive(c.id)}
                        className={`w-full py-2 px-2 rounded-md hover:bg-accent/60 transition-colors flex items-center gap-3 ${activeId===c.id? "bg-accent" : ""}`}
                        >
                          <MessageAvatar src={c.avatar || undefined} alt={c.name} fallbackText={c.name.slice(0,2)} className="h-8 w-8" />
                          <div className="flex-1 text-left">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium line-clamp-1">{c.name}</div>
                              {c.unread>0 && <Badge variant="secondary" className="text-[10px]">{c.unread}</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-1">{c.last}</div>
                          </div>
                        </button>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setLeftTab('friends')}><MessageSquareMore className="h-4 w-4 mr-1"/>发起私聊</Button>
                  <Button size="sm" variant="outline" onClick={() => setGroupOpen(true)}><Plus className="h-4 w-4 mr-1"/>创建群聊</Button>
                </div>
              </>
            ) : leftTab === 'friends' ? (
              <div className="space-y-2 pt-2">
                <ScrollArea className="h-[420px] pr-2">
                  <div className="divide-y">
                    {friends.map(f => (
                      <div key={f.id} className="py-2 px-1 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <MessageAvatar src={f.avatar} alt={f.name} fallbackText={f.name.slice(0,2)} className="h-7 w-7" />
                          <div className="text-sm truncate">{f.name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => {
                            const target = convs.find(c => c.name === f.name)
                            if (target) setActive(target.id)
                            else setActive(`direct:${f.id}`)
                          }}>发消息</Button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => onRemoveFriend(f.id)}>删除</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <>
                <div className="space-y-2 pt-2">
                  <div className="text-xs text-muted-foreground">搜索用户并添加</div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="输入用户名或 ID"
                      value={peopleQ}
                      onChange={(e: ChangeEvent<HTMLInputElement>)=>setPeopleQ(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") onSearchPeople() }}
                    />
                    <Button onClick={onSearchPeople}>搜索</Button>
                  </div>
                  <ScrollArea className="h-[160px] pr-2">
                    <div className="divide-y">
                      {found.map(u => (
                        <div key={u.id} className="py-2 px-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageAvatar src={u.avatar} alt={u.name} fallbackText={u.name.slice(0,2)} className="h-7 w-7" />
                            <div className="text-sm">{u.name}</div>
                          </div>
                          <Button size="sm" onClick={() => onAddFriend(u.id)}>添加</Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">收到的申请</div>
                  <ScrollArea className="h-[160px] pr-2">
                    <div className="divide-y">
                      {inboundReqs.map(r => (
                        <div key={r.id} className="py-2 px-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageAvatar src={r.from.avatar} alt={r.from.name} fallbackText={r.from.name.slice(0,2)} className="h-7 w-7" />
                            <div className="text-sm">{r.from.name}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => onAccept(r.id)}>接受</Button>
                            <Button size="sm" variant="ghost" onClick={() => onDecline(r.id)}>拒绝</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className="min-h-[540px] max-h-[70vh] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              <div className="flex items-center gap-2">
                {headerName && (
                  <MessageAvatar src={headerAvatar} alt={headerName} fallbackText={getInitial(headerName)} className="h-5 w-5" />
                )}
                <span>{headerName}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 flex flex-col gap-3">
            <div className="relative flex-1 min-h-0 border rounded-md p-2 bg-background">
              {mounted ? (
                <AutoSizer>
                  {({ width, height }: { width: number; height: number }) => (
                    <List
                      ref={listRef}
                      width={width}
                      height={height}
                      rowCount={rows.length}
                      deferredMeasurementCache={cacheRef.current}
                      rowHeight={cacheRef.current.rowHeight}
                      overscanRowCount={OVERSCAN}
                      onScroll={onListScroll}
                      rowRenderer={({ index, key, style, parent }: any) => {
                        const row = rows[index]
                        if (row.type === 'separator') {
                          return (
                            <CellMeasurer
                              key={key}
                              cache={cacheRef.current}
                              columnIndex={0}
                              rowIndex={index}
                              parent={parent}
                            >
                              <div style={style} className="px-1 py-2">
                                <div className="flex items-center gap-2 my-2">
                                  <div className="h-px bg-muted flex-1" />
                                  <div className="text-[11px] text-muted-foreground whitespace-nowrap">{row.text}</div>
                                  <div className="h-px bg-muted flex-1" />
                                </div>
                              </div>
                            </CellMeasurer>
                          )
                        }
                        const m: Message = row.msg
                        const mine = String(m.senderId) === String(user?.id || "me")
                        const name = m.senderName || getSenderName(m.senderId)
                        const time = formatTime(m.timestamp)
                        const avatar = m.senderAvatar ?? getSenderAvatar(m.senderId)
                        return (
                          <CellMeasurer
                            key={key}
                            cache={cacheRef.current}
                            columnIndex={0}
                            rowIndex={index}
                            parent={parent}
                          >
                            <div style={style} className="px-1 py-1">
                              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                {!mine && (
                                  <div className="mr-2 mt-1">
                                    <MessageAvatar src={avatar} alt={name} fallbackText={getInitial(name)} className="h-7 w-7" />
                                  </div>
                                )}
                                <div className={`max-w-[70%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                                  <div className={`text-[11px] text-muted-foreground ${mine ? "text-right" : "text-left"}`}>
                                    <span className="align-middle">{name}</span>
                                    <span className="mx-1">·</span>
                                    <span className="align-middle">{time}</span>
                                  </div>
                                  <div className={`rounded-md px-3 py-2 text-sm shadow-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                    <div>{m.content}</div>
                                  </div>
                                </div>
                                {mine && (
                                  <div className="ml-2 mt-1">
                                    <MessageAvatar src={(user as any)?.profile?.avatar} alt={user?.username || "我"} fallbackText={getInitial(user?.username || "我")} className="h-7 w-7" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </CellMeasurer>
                        )
                      }}
                    />
                  )}
                </AutoSizer>
              ) : (
                <div className="h-full w-full" aria-hidden="true">
                  {/* 占位，等待客户端挂载后再渲染虚拟列表 */}
                </div>
              )}
              {newCount > 0 && !stickBottom && (
                <div className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center">
                  <Button size="sm" onClick={() => { listRef.current?.scrollToRow?.(Math.max(0, rows.length - 1)); setNewCount(0) }} className="pointer-events-auto shadow-md">
                    {newCount} 条新消息，点击查看
                  </Button>
                </div>
              )}
             </div>
            <div className="space-y-2">
              <Textarea
                rows={3}
                placeholder={activeConv ? `发消息给 ${activeConv.name}` : (isDirectStart && directUserName ? `发消息给 ${directUserName}` : "选择一个会话或从好友发起后再发送")}
                value={draft}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
                disabled={!activeConv && !isDirectStart}
              />
              <div className="flex justify-end sticky bottom-2">
                <Button onClick={onSend} disabled={(!activeConv && !isDirectStart) || !draft.trim()} size="sm" className="shadow-sm">
                  <Send className="h-4 w-4 mr-1"/>发送
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Friends & Discover 使用 Popover 实现，替代原抽屉（保留占位不渲染） */}
        <Card className="hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">好友与发现</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 预留 */}
          </CardContent>
        </Card>
      </section>

      {/* 创建群聊：居中模态层 */}
      {groupOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={() => setGroupOpen(false)}>
          <div className="w-full max-w-md rounded-md border bg-card text-card-foreground shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 space-y-3 max-h-[80vh] overflow-auto">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">群聊标题（可选）</div>
                <Input
                  placeholder="如：周末聚会"
                  value={groupTitle}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setGroupTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">选择成员</div>
                <ScrollArea className="h-[300px] pr-2">
                  <div className="divide-y">
                    {friends.map(f => (
                      <label key={f.id} className="py-2 px-1 flex items-center justify-between cursor-pointer select-none">
                        <div className="flex items-center gap-2">
                          <MessageAvatar src={f.avatar} alt={f.name} fallbackText={f.name.slice(0,2)} className="h-7 w-7" />
                          <div className="text-sm">{f.name}</div>
                        </div>
                        <Checkbox
                          checked={!!selected[f.id]}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setSelected(prev => ({ ...prev, [f.id]: e.target.checked }))}
                        />
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button size="sm" variant="ghost" onClick={() => setGroupOpen(false)}>取消</Button>
                <Button size="sm" onClick={onCreateGroup} disabled={selectedIds.length === 0}>创建</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// 将可能为相对路径的头像地址归一化为可访问的绝对 URL
const ensureAbsoluteUrl = (s?: string) => {
  if (!s) return undefined
  if (/^(https?:|data:|blob:)/.test(s)) return s
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3030/api').replace(/\/?api\/?$/, '')
  if (s.startsWith('/')) return `${base}${s}`
  return `${base}/${s.replace(/^\/+/, '')}`
}
