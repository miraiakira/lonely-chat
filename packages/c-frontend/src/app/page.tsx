"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import SkinSwitcher from "@/components/skin-switcher"
import { Heart, MessageCircle, Trash2 } from "lucide-react"
import { getPosts, createPost, type Post } from "@/lib/posts.api"
import { uploadFile } from "@/lib/upload.api"
import { likePost, unlikePost, deletePost, listComments, addComment } from "@/lib/posts.actions"
import { Input } from "@/components/ui/input"
import { searchPosts, type PostSearchItem } from "@/lib/search.api"

export default function Home() {
  const { user, logout } = useAuth()

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [likeAnimating, setLikeAnimating] = useState<Record<string, boolean>>({})
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleting, setConfirmDeleting] = useState(false)

  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({})
  const [comments, setComments] = useState<Record<string, { total: number, items: any[] }>>({})
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [preview, setPreview] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement | null>(null)

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
  const getMediaUrl = (u?: string | null) => {
    if (!u) return undefined
    if (u.startsWith("http")) return u
    return `${apiBase}/uploads/${u}`
  }

  // 触发搜索
  async function onSearch() {
    const keyword = q.trim()
    if (!keyword) return
    setSearchLoading(true)
    setError(null)
    try {
      const res = await searchPosts({ q: keyword, limit: 20, offset: 0, engine: 'es' })
      setSearchItems(res.items)
      setSearchTotal(res.total)
      setSearchActive(true)
    } catch (e: any) {
      setError(e?.message || '搜索失败，请稍后重试')
    } finally {
      setSearchLoading(false)
    }
  }
  function clearSearch() {
    setSearchActive(false)
    setQ("")
    setSearchItems([])
    setSearchTotal(0)
  }

  // 输入为空时自动恢复到默认动态列表
  useEffect(() => {
    if (q.trim() === "" && searchActive) {
      setSearchActive(false)
      setSearchItems([])
      setSearchTotal(0)
    }
  }, [q, searchActive])

  // 首次加载最新动态
  useEffect(() => {
    let mounted = true
    async function init() {
      setLoading(true)
      setError(null)
      try {
        const res = await getPosts({ limit: 50, offset: 0 })
        if (!mounted) return
        setPosts(res.items)
        setTotal(res.total || res.items.length)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || "加载失败，请稍后重试")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void init()
    return () => { mounted = false }
  }, [])

  async function refresh() {
  try {
    setLoading(true)
    const res = await getPosts({ limit: 50, offset: 0 })
    setPosts(res.items)
    setTotal(res.total || res.items.length)
  } catch (e: any) {
    setError(e?.message || "刷新失败")
  } finally {
    setLoading(false)
  }
}

async function publish() {
  const content = draft.trim()
  if (!content && images.length === 0) return
  setSending(true)
  setError(null)
  try {
    await createPost({ content, images })
    setDraft("")
    setImages([])
    await refresh()
  } catch (e: any) {
    setError(e?.message || "发布失败，请稍后重试")
  } finally {
    setSending(false)
  }
}

const isLoggedIn = !!user?.id

const formatTime = (ts: number) => {
  try {
    const d = new Date(ts)
    const now = Date.now()
    const diff = Math.floor((now - d.getTime()) / 1000)
    if (diff < 60) return `${diff}s 前`
    if (diff < 3600) return `${Math.floor(diff / 60)}m 前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h 前`
    return d.toLocaleString()
  } catch {
    return String(ts)
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function renderMarkdown(md: string) {
  // 极简 Markdown 渲染（仅供预览，非完全实现）
  let html = "\n" + md
  // 代码块 ``` ```
  html = html.replace(/```([\s\S]*?)```/g, (_: any, code: string) => `<pre class="rounded border bg-muted/40 p-3 overflow-auto"><code>${escapeHtml(code.trim())}</code></pre>`)
  // 行内代码 `code`
  html = html.replace(/`([^`]+?)`/g, (_: any, code: string) => `<code class="px-1 py-0.5 rounded bg-muted/60">${escapeHtml(code)}</code>`)
  // 标题 #
  html = html.replace(/^######\s+(.+)$/gm, '<h6 class="text-xs font-semibold">$1<\/h6>')
           .replace(/^#####\s+(.+)$/gm, '<h5 class="text-sm font-semibold">$1<\/h5>')
           .replace(/^####\s+(.+)$/gm, '<h4 class="text-base font-semibold">$1<\/h4>')
           .replace(/^###\s+(.+)$/gm, '<h3 class="text-lg font-semibold">$1<\/h3>')
           .replace(/^##\s+(.+)$/gm, '<h2 class="text-xl font-semibold">$1<\/h2>')
           .replace(/^#\s+(.+)$/gm, '<h1 class="text-2xl font-semibold">$1<\/h1>')
  // 加粗/斜体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1<\/strong>')
           .replace(/\*(.+?)\*/g, '<em>$1<\/em>')
  // 链接 [text](url)
  html = html.replace(/\[([^\]]+?)\]\((https?:[^\s)]+)\)/g, '<a class="underline" target="_blank" rel="noreferrer" href="$2">$1<\/a>')
  // 换行
  html = html.replace(/\n/g, '<br/>')
  return html
}

function surroundSelection(before: string, after = before, placeholder = "文本") {
  const el = editorRef.current
  if (!el) return
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? el.value.length
  const hasSelection = start !== end
  const selected = hasSelection ? el.value.slice(start, end) : placeholder
  const next = el.value.slice(0, start) + before + selected + after + el.value.slice(end)
  setDraft(next)
  const cursor = start + before.length + selected.length + after.length
  // 将光标移动到插入后的末尾
  requestAnimationFrame(() => {
    el.focus()
    el.setSelectionRange(cursor, cursor)
  })
}

async function toggleLike(p: any) {
  try {
    if (p.likedByMe) {
      await unlikePost(p.id)
      setPosts((prev) => prev.map(x => x.id === p.id ? { ...x, likedByMe: false, likeCount: Math.max(0, (x.likeCount||1)-1) } : x))
    } else {
      await likePost(p.id)
      setPosts((prev) => prev.map(x => x.id === p.id ? { ...x, likedByMe: true, likeCount: (x.likeCount||0)+1 } : x))
      setLikeAnimating((s) => ({ ...s, [p.id]: true }))
      setTimeout(() => {
        setLikeAnimating((s) => ({ ...s, [p.id]: false }))
      }, 320)
    }
  } catch (e: any) {
    setError(e?.message || '操作失败')
  }
}

async function loadComments(postId: string) {
  setCommentLoading((s) => ({ ...s, [postId]: true }))
  try {
    const res = await listComments(postId)
    setComments((s) => ({ ...s, [postId]: res }))
  } catch (e: any) {
    setError(e?.message || '加载评论失败')
  } finally {
    setCommentLoading((s) => ({ ...s, [postId]: false }))
  }
}

async function submitComment(postId: string) {
  const text = (commentDrafts[postId] || '').trim()
  if (!text) return
  setCommentLoading((s) => ({ ...s, [postId]: true }))
  try {
    await addComment(postId, text)
    setCommentDrafts((s) => ({ ...s, [postId]: '' }))
    await loadComments(postId)
  } catch (e: any) {
    setError(e?.message || '发表评论失败')
  } finally {
    setCommentLoading((s) => ({ ...s, [postId]: false }))
  }
}

async function removePost(postId: string) {
  try {
    await deletePost(postId)
    setPosts((prev) => prev.filter(x => x.id !== postId))
    setTotal((t) => Math.max(0, t - 1))
  } catch (e: any) {
    setError(e?.message || '删除失败')
  }
}

async function handleConfirmDelete() {
  if (!confirmDeleteId) return
  setConfirmDeleting(true)
  try {
    await removePost(confirmDeleteId)
  } catch (e) {
    // removePost 已处理错误提示
  } finally {
    setConfirmDeleting(false)
    setConfirmDeleteId(null)
  }
}

async function loadMore() {
  if (loadingMore) return
  setLoadingMore(true)
  try {
    const res = await getPosts({ limit: 50, offset: posts.length })
    setPosts((prev) => [...prev, ...res.items])
    setTotal(res.total || posts.length + res.items.length)
  } catch (e: any) {
    setError(e?.message || '加载更多失败')
  } finally {
    setLoadingMore(false)
  }
}

const userAvatar = getAvatarUrl((user as any)?.profile?.avatar)
const userName = (user as any)?.profile?.nickname || (user as any)?.username || "游客"

return (
  <main className="min-h-dvh p-6 max-w-5xl mx-auto flex flex-col gap-6">
    <header className="flex items-center gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <picture>
          <source srcSet="/brand/lonely-chat-emoji-light-noq.svg" media="(prefers-color-scheme: light)" />
          <source srcSet="/brand/lonely-chat-emoji-dark-noq.svg" media="(prefers-color-scheme: dark)" />
          <img src="/brand/lonely-chat-emoji-light-noq.svg" alt="Lonely Chat" className="h-12 w-12" />
        </picture>
        <h3 className="text-base font-semibold tracking-tight">Lonely Chat</h3>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Input
            placeholder="搜索动态关键词..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSearch() }}
          />
          <Button onClick={onSearch} disabled={!canSearch || searchLoading}>{searchLoading ? '搜索中...' : '搜索'}</Button>
          {searchActive && (
            <Button variant="outline" onClick={clearSearch}>清除</Button>
          )}
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button asChild variant="ghost"><Link href="/chat">消息</Link></Button>
        <SkinSwitcher compact />
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-full border p-0.5 pr-2 hover:bg-accent hover:text-accent-foreground transition-colors">
              <Avatar className="h-7 w-7">
                {userAvatar ? (
                  <AvatarImage src={userAvatar} alt={userName} />
                ) : (
                  <AvatarFallback>{(userName || "?").slice(0, 2)}</AvatarFallback>
                )}
              </Avatar>
              <span className="text-xs text-muted-foreground hidden sm:inline">{userName}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="min-w-[180px] p-1 !bg-card" align="end">
            <div className="text-xs px-2 py-1.5 text-muted-foreground">{user ? `已登录：${(user as any)?.username}` : "未登录"}</div>
            <Separator className="my-1" />
            <div className="flex flex-col">
              {user ? (
                <>
                  <Button asChild variant="ghost" className="justify-start h-8 text-sm">
                    <Link href="/me">个人信息</Link>
                  </Button>
                  <Button asChild variant="ghost" className="justify-start h-8 text-sm">
                    <Link href="/chat">聊天</Link>
                  </Button>
                  {(user as any)?.username ? (
                    <Button asChild variant="ghost" className="justify-start h-8 text-sm">
                      <Link href={`/u/${encodeURIComponent((user as any).username)}`}>我的主页</Link>
                    </Button>
                  ) : null}
                  <Button variant="ghost" className="justify-start h-8 text-sm text-destructive" onClick={() => logout()}>退出登录</Button>
                </>
              ) : (
                <Button asChild variant="ghost" className="justify-start h-8 text-sm">
                  <Link href="/auth/login">登录</Link>
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>

    {/* 发布动态 */}
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">发布动态</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isLoggedIn ? (
          <div className="text-sm text-muted-foreground">
            请先登录后再发布动态。
            <Button asChild className="ml-2" size="sm"><Link href="/auth/login">去登录</Link></Button>
          </div>
        ) : (
          <>
            {preview ? (
              <div className="border rounded p-3 text-sm min-h-[96px] bg-muted/20" dangerouslySetInnerHTML={{ __html: renderMarkdown(draft || '') }} />
            ) : (
              <Textarea
                ref={editorRef}
                placeholder="分享此刻的想法..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={sending}
                rows={3}
              />
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Button type="button" variant="ghost" size="sm" onClick={() => surroundSelection('**', '**', '加粗')}>B</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => surroundSelection('*', '*', '斜体')}>I</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => surroundSelection('`', '`', '代码')}>Code</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => surroundSelection('[', '](https://)', '链接文本')}>Link</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setPreview(v => !v)}>{preview ? '编辑' : '预览'}</Button>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{draft.trim().length} / 500</span>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center justify-center whitespace-nowrap rounded-md h-8 px-3 text-xs font-medium border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || [])
                      if (files.length === 0) return
                      setUploading(true)
                      try {
                        const urls: string[] = []
                        for (const f of files) {
                          const { url } = await uploadFile(f)
                          urls.push(url)
                        }
                        setImages((prev) => [...prev, ...urls])
                      } catch (err: any) {
                        setError(err?.message || '上传失败')
                      } finally {
                        setUploading(false)
                      }
                    }}
                  />
                  {uploading ? '上传中...' : '添加图片'}
                </label>
                <Button size="sm" disabled={(!draft.trim() && images.length === 0) || sending || uploading} onClick={publish}>
                  {sending ? "发布中..." : "发布"}
                </Button>
              </div>
            </div>
            {images.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {images.map((u, i) => (
                  <div key={i} className="relative group">
                    <img src={getMediaUrl(u)} alt="" className="w-full h-40 object-cover rounded border" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100"
                      onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    >移除</button>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
        {error ? <div className="text-sm text-destructive">{error}</div> : null}
      </CardContent>
    </Card>

    {/* 列表：搜索结果 或 最新动态 */}
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{searchActive ? `搜索结果（${searchTotal}）` : '最新动态'}</CardTitle>
      </CardHeader>
      <CardContent>
        {searchActive ? (
          <div className="space-y-4">
            {searchItems.length === 0 ? (
              <div className="text-sm text-muted-foreground">{searchLoading ? '搜索中...' : '没有找到相关动态'}</div>
            ) : (
              searchItems.map((it) => (
                <div key={it.id}>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      {it.authorId ? (
                        <AvatarFallback>{String(it.authorUsername || it.authorId).slice(0, 2)}</AvatarFallback>
                      ) : (
                        <AvatarFallback>?</AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm truncate max-w-[60%]"><span dangerouslySetInnerHTML={{ __html: it.authorUsernameHighlight || (it.authorUsername || String(it.authorId)) }} /></div>
                        <div className="text-xs text-muted-foreground">{formatTime(it.createdAt as any)}</div>
                      </div>
                      <div className="text-sm leading-6 break-words">
                        <span dangerouslySetInnerHTML={{ __html: it.contentHighlight || it.content }} />
                      </div>
                      {Array.isArray(it.images) && it.images.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                          {it.images.slice(0, 9).map((u, i) => (
                            <img key={i} src={getMediaUrl(u)} alt="" className="w-full h-40 object-cover rounded border" />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <Separator className="my-4" />
                </div>
              ))
            )}
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={clearSearch}>清除搜索</Button>
            </div>
          </div>
        ) : (
          // 仍旧显示最新动态列表
          (loading ? (
            <div className="text-sm text-muted-foreground">加载中...</div>
          ) : (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="text-sm text-muted-foreground">还没有任何动态，来发一条吧～</div>
              ) : (
                posts.map((m, idx) => (
                  <div key={m.id}>
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9">
                        {m.authorAvatar ? (
                          <AvatarImage src={getAvatarUrl(m.authorAvatar)} alt={m.authorName || m.authorId} />
                        ) : (
                          <AvatarFallback>{(m.authorName || m.authorId).slice(0, 2)}</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-sm truncate max-w-[60%]">{m.authorName || `用户 ${m.authorId}`}</div>
                          <div className="text-xs text-muted-foreground">{formatTime(m.createdAt)}</div>
                        </div>
                        <div className="text-sm leading-6 break-words" dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content || '') }} />
                        {Array.isArray(m.images) && m.images.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                            {m.images.map((u, i) => (
                              <img key={i} src={getMediaUrl(u)} alt="" className="w-full h-40 object-cover rounded border" />
                            ))}
                          </div>
                        ) : null}
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" onClick={() => toggleLike(m)}>
                            <Heart className={(m.likedByMe ? 'text-rose-500 fill-rose-500 ' : '') + 'h-4 w-4 transition-transform duration-200 ' + (likeAnimating[m.id] ? 'scale-125 ' : '')} />
                            <span>{m.likedByMe ? '已赞' : '点赞'}（{m.likeCount || 0}）</span>
                          </button>
                          <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" onClick={() => loadComments(m.id)}>
                            <MessageCircle className="h-4 w-4" />
                            <span>评论{comments[m.id]?.total ? `（${comments[m.id].total}）` : ''}</span>
                          </button>
                          {((user?.id && String(user.id) === m.authorId) || (Array.isArray((user as any)?.roles) && ((user as any).roles as any[]).some((r: any) => (typeof r === 'string' ? r : r?.name) === 'admin'))) ? (
                            <button className="inline-flex items-center gap-1 text-destructive hover:opacity-90 transition-opacity hover:cursor-pointer" onClick={() => setConfirmDeleteId(m.id)}>
                              <Trash2 className="h-4 w-4" />
                              <span>删除</span>
                            </button>
                          ) : null}
                        </div>
                        {comments[m.id] ? (
                          <div className="mt-2 space-y-2">
                            {comments[m.id].items.length === 0 ? (
                              <div className="text-xs text-muted-foreground">暂无评论</div>
                            ) : comments[m.id].items.map((c: any) => (
                              <div key={c.id} className="flex items-start gap-2">
                                <Avatar className="h-7 w-7">
                                  {c.authorAvatar ? <AvatarImage src={getAvatarUrl(c.authorAvatar)} alt={c.authorName || c.authorId} /> : <AvatarFallback>{(c.authorName || c.authorId).slice(0, 2)}</AvatarFallback>}
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium text-xs truncate max-w-[60%]">{c.authorName || `用户 ${c.authorId}`}</div>
                                    <div className="text-[10px] text-muted-foreground">{formatTime(c.createdAt)}</div>
                                  </div>
                                  <div className="text-xs whitespace-pre-wrap leading-6 break-words">{c.content}</div>
                                </div>
                              </div>
                            ))}
                            {isLoggedIn ? (
                              <div className="flex items-center gap-2">
                                <input
                                  className="flex-1 border rounded px-2 py-1 text-xs"
                                  placeholder="写下你的评论..."
                                  value={commentDrafts[m.id] || ''}
                                  onChange={(e) => setCommentDrafts((s) => ({ ...s, [m.id]: e.target.value }))}
                                  disabled={commentLoading[m.id]}
                                />
                                <Button size="sm" disabled={!((commentDrafts[m.id] || '').trim()) || commentLoading[m.id]} onClick={() => submitComment(m.id)}>发送</Button>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {idx !== posts.length - 1 ? <Separator className="my-4" /> : null}
                  </div>
                ))
              )}
              {posts.length < total ? (
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>{loadingMore ? '加载中...' : '加载更多'}</Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>

    {confirmDeleteId ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={() => !confirmDeleting && setConfirmDeleteId(null)} />
        <div className="relative bg-background rounded-md shadow-lg w-[90%] max-w-sm p-4 border">
          <div className="text-sm font-medium mb-1">确认删除</div>
          <div className="text-xs text-muted-foreground mb-3">删除后不可恢复，是否继续？</div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDeleteId(null)} disabled={confirmDeleting}>取消</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={confirmDeleting}
            >
               {confirmDeleting ? '删除中...' : '确定删除'}
            </Button>
          </div>
        </div>
      </div>
    ) : null}
  </main>)
}
