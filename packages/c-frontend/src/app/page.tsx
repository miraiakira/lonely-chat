"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import SkinSwitcher from "@/components/skin-switcher"
import { Heart, MessageCircle, Trash2, Flame, Newspaper, Users, Tag, ArrowRight } from "lucide-react"
import { getPosts, createPost, type Post } from "@/lib/posts.api"
import { uploadFile } from "@/lib/upload.api"
import { likePost, unlikePost, deletePost, listComments, addComment } from "@/lib/posts.actions"
import { Input } from "@/components/ui/input"
import { searchPosts, type PostSearchItem } from "@/lib/search.api"
import Spinner from "@/components/ui/spinner"
import { Dialog, DialogContent } from "@/components/ui/dialog"
// 使用原生 img 标签展示图片

// 定义评论类型
type Comment = {
  id: string
  postId: string
  authorId: string
  authorName?: string
  authorAvatar?: string | null
  content: string
  createdAt: number
  parentCommentId?: string
  parentAuthorId?: string
  parentAuthorName?: string
}

// 定义评论列表类型
type CommentList = {
  total: number
  items: Comment[]
}

// 定义错误类型
type ApiError = {
  message?: string
  response?: {
    status?: number
    data?: {
      message?: string | string[]
    }
  }
}

export default function Home() {
  const searchParams = useSearchParams()
  const router = useRouter()
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
  const [comments, setComments] = useState<Record<string, CommentList>>({})
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [preview, setPreview] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement | null>(null)
  const [replyTargets, setReplyTargets] = useState<Record<string, { commentId: string; toName?: string } | null>>({})
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)

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
  async function onSearch(kw?: string) {
    const keyword = (kw ?? q).trim()
    if (!keyword) return
    setSearchLoading(true)
    // 立即展示搜索区和占位文案，避免后端失败时给人“没反应”的感觉
    setSearchActive(true)
    setError(null)
    try {
      // 使用 auto：优先 ES，失败时回退 DB，避免 ES 未启动时搜不到
      const res = await searchPosts({ q: keyword, limit: 20, offset: 0, engine: 'auto' })
      setSearchItems(res.items)
      setSearchTotal(res.total)
    } catch (e) {
      const error = e as ApiError
      setError(error?.message || '搜索失败，请稍后重试')
    } finally {
      setSearchLoading(false)
    }
  }
  function clearSearch() {
    setSearchActive(false)
    setQ("")
    setSearchItems([])
    setSearchTotal(0)
    // 清除时移除 URL 中的查询参数
    router.push("/")
  }

  // 输入为空时自动恢复到默认动态列表
  useEffect(() => {
    if (q.trim() === "" && searchActive) {
      setSearchActive(false)
      setSearchItems([])
      setSearchTotal(0)
    }
  }, [q, searchActive])

  // 从 URL 中读取 ?q 并自动触发搜索
  useEffect(() => {
    const kw = (searchParams.get('q') || '').trim()
    if (kw) {
      setQ(kw)
      // 直接以 URL 中的关键词触发搜索，避免闭包中使用到旧的 q 值
      requestAnimationFrame(() => { void onSearch(kw) })
    }
  }, [searchParams.toString()])

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
      } catch (e) {
        if (!mounted) return
        const error = e as ApiError
        setError(error?.message || "加载失败，请稍后重试")
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
    } catch (e) {
      const error = e as ApiError
      setError(error?.message || "刷新失败")
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
    } catch (e) {
      const error = e as ApiError
      setError(error?.message || "发布失败，请稍后重试")
    } finally {
      setSending(false)
    }
  }

  const isLoggedIn = !!user?.id

  const formatTime = (ts: number | string) => {
    try {
      let n: number
      if (typeof ts === 'number') {
        n = ts
      } else {
        const parsed = Date.parse(ts)
        if (!isNaN(parsed)) {
          n = parsed
        } else {
          const maybe = Number(ts)
          n = isNaN(maybe) ? NaN : maybe
        }
      }
      // 如果是秒级时间戳（10 位），转换为毫秒
      if (!isNaN(n) && String(Math.floor(n)).length === 10) n = n * 1000
      const d = new Date(n)
      const t = d.getTime()
      if (isNaN(t)) return 'Invalid Date'
      const now = Date.now()
      const diff = Math.floor((now - t) / 1000)
      if (diff < 60) return `${diff}s 前`
      if (diff < 3600) return `${Math.floor(diff / 60)}m 前`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h 前`
      return d.toLocaleString()
    } catch {
      return 'Invalid Date'
    }
  }

  function escapeHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }

  function renderMarkdown(md: string) {
    // 极简 Markdown 渲染（仅供预览，非完全实现）
    let html = "\n" + md
    // 代码块 ``` ```
    html = html.replace(/```([\s\S]*?)```/g, (_match: string, code: string) => `<pre class="rounded border bg-muted/40 p-3 overflow-auto"><code>${escapeHtml(code.trim())}</code></pre>`)
    // 行内代码 `code`
    html = html.replace(/`([^`]+?)`/g, (_match: string, code: string) => `<code class="px-1 py-0.5 rounded bg-muted/60">${escapeHtml(code)}</code>`)
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

  async function toggleLike(p: Post) {
    try {
      if (p.likedByMe) {
        await unlikePost(p.id)
        setPosts((prev) => prev.map(x => x.id === p.id ? { ...x, likedByMe: false, likeCount: Math.max(0, (x.likeCount || 1) - 1) } : x))
      } else {
        await likePost(p.id)
        setPosts((prev) => prev.map(x => x.id === p.id ? { ...x, likedByMe: true, likeCount: (x.likeCount || 0) + 1 } : x))
        setLikeAnimating((s) => ({ ...s, [p.id]: true }))
        setTimeout(() => {
          setLikeAnimating((s) => ({ ...s, [p.id]: false }))
        }, 320)
      }
    } catch (e) {
      const error = e as ApiError
      setError(error?.message || '操作失败')
    }
  }

  async function loadComments(postId: string) {
    setCommentLoading((s) => ({ ...s, [postId]: true }))
    try {
      const res = await listComments(postId)
      setComments((s) => ({ ...s, [postId]: res }))
    } catch (e) {
      const error = e as ApiError
      setError(error?.message || '加载评论失败')
    } finally {
      setCommentLoading((s) => ({ ...s, [postId]: false }))
    }
  }

  const [commentErrors, setCommentErrors] = useState<Record<string, string | null>>({})
  const commentInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  function focusCommentInput(postId: string) {
    const el = commentInputRefs.current[postId]
    if (!el) return
    const len = el.value?.length ?? 0
    el.focus()
    try { el.setSelectionRange(len, len) } catch { }
  }
  async function submitComment(postId: string) {
    const text = (commentDrafts[postId] || '').trim()
    if (!text) return
    setCommentLoading((s) => ({ ...s, [postId]: true }))
    setCommentErrors((s) => ({ ...s, [postId]: null }))
    try {
      const parentId = replyTargets[postId]?.commentId
      // 如果指定了父评论，但本地列表中不存在，直接提示并中止
      if (parentId && !comments[postId]?.items?.some((it: Comment) => String(it.id) === String(parentId))) {
        setCommentErrors((s) => ({ ...s, [postId]: '回复的评论不存在或已删除' }))
        return
      }
      // 如果是自己回复自己，则作为顶级评论处理（不传 parentId）
      const parentComment = comments[postId]?.items?.find((it: Comment) => String(it.id) === String(parentId))
      const isSelfReply = parentComment && String(parentComment.authorId) === String(user?.id)
      const sendParentId = isSelfReply ? undefined : parentId

      await addComment(postId, text, sendParentId)
      setCommentDrafts((s) => ({ ...s, [postId]: '' }))
      setReplyTargets((s) => ({ ...s, [postId]: null }))
      await loadComments(postId)
    } catch (e) {
      const error = e as ApiError
      const status = error?.response?.status
      const serverMsg = Array.isArray(error?.response?.data?.message) ? error.response.data.message.join(', ') : (error?.response?.data?.message || error?.message)
      if (status === 404) {
        if (typeof serverMsg === 'string' && /parent comment/i.test(serverMsg)) {
          setCommentErrors((s) => ({ ...s, [postId]: '回复的评论不存在或不属于本动态' }))
        } else {
          setCommentErrors((s) => ({ ...s, [postId]: '动态不存在或已删除' }))
        }
      } else {
        setCommentErrors((s) => ({ ...s, [postId]: serverMsg || '发表评论失败' }))
      }
    } finally {
      setCommentLoading((s) => ({ ...s, [postId]: false }))
    }
  }

  async function removePost(postId: string) {
    try {
      await deletePost(postId)
      setPosts((prev) => prev.filter(x => x.id !== postId))
      setTotal((t) => Math.max(0, t - 1))
    } catch (e) {
      const error = e as ApiError
      setError(error?.message || '删除失败')
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
    } catch (e) {
      const error = e as ApiError
      setError(error?.message || '加载更多失败')
    } finally {
      setLoadingMore(false)
    }
  }

  // 定义用户类型
  interface UserProfile {
    nickname?: string
    avatar?: string | null
    gender?: string
    bio?: string
  }

  interface User {
    id: number
    username: string
    profile?: UserProfile
  }

  const userAvatar = getAvatarUrl(user?.profile?.avatar)
  const userName = user?.profile?.nickname || user?.username || "游客"

  // 侧栏头像组件：图片失败时回退到字母
  const UserAvatar = ({ src, alt, fallbackText, className }: { src?: string; alt: string; fallbackText: string; className?: string }) => {
    const [bad, setBad] = useState(false)
    const showImg = !!src && !bad
    return (
      <Avatar className={className}>
        {showImg ? (
          <AvatarImage src={src!} alt={alt} loading="lazy" onError={() => setBad(true)} />
        ) : (
          <AvatarFallback>{fallbackText}</AvatarFallback>
        )}
      </Avatar>
    )
  }

  // 从当前帖子列表中提取活跃用户（按发帖数量排序，取前 6 名）
  const activeUsers = useMemo(() => {
    const map: Record<string, { id: string; name: string; avatar?: string | null; count: number }> = {}
    posts.forEach((p) => {
      const id = String(p.authorId || '')
      if (!id) return
      const name = p.authorName || `用户 ${id}`
      const avatar = p.authorAvatar
      if (!map[id]) {
        map[id] = { id, name, avatar, count: 0 }
      }
      map[id].count += 1
      if (p.authorName) map[id].name = p.authorName
      if (typeof p.authorAvatar !== 'undefined') map[id].avatar = p.authorAvatar
    })
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 6)
  }, [posts])

  return (
    <main className="min-h-dvh p-6 max-w-7xl mx-auto">
      <section className="grid grid-cols-1 md:grid-cols-[7fr_3fr] gap-4">
        <div className="space-y-4">
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
                        } catch (err) {
                          const error = err as ApiError
                          setError(error?.message || '上传失败')
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
                      <img
                        src={getMediaUrl(u) || ""}
                        alt=""
                        className="w-full h-auto object-contain rounded border"
                      />
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
                          <div className="font-medium text-sm truncate max-w-[60%]"><span className="search-highlight" dangerouslySetInnerHTML={{ __html: it.authorUsernameHighlight || (it.authorUsername || String(it.authorId)) }} /></div>
                          <div className="text-xs text-muted-foreground">{formatTime(it.createdAt)}</div>
                        </div>
                        <div className="text-sm leading-6 break-words">
                          <span className="search-highlight" dangerouslySetInnerHTML={{ __html: it.contentHighlight || it.content }} />
                        </div>
                        {Array.isArray(it.images) && it.images.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                            {it.images.slice(0, 9).map((u, i) => {
                              const url = getMediaUrl(u) || ""
                              return (
                                <img
                                  key={i}
                                  src={url}
                                  alt=""
                                  className="w-full h-auto object-contain rounded border bg-muted cursor-zoom-in"
                                  onClick={() => setImagePreviewUrl(url)}
                                />
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <Separator className="my-4" />
                  </div>
                ))
              )}
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
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {m.images.map((u, i) => {
                              const url = getMediaUrl(u) || ""
                              return (
                                <img
                                  key={i}
                                  src={url}
                                  alt=""
                                  className="w-full h-auto object-contain rounded border bg-muted cursor-zoom-in"
                                  onClick={() => setImagePreviewUrl(url)}
                                />
                              )
                            })}
                            </div>
                          ) : null}
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" onClick={() => toggleLike(m)}>
                              <Heart className={(m.likedByMe ? 'text-rose-500 fill-rose-500 ' : '') + 'h-4 w-4 transition-transform duration-200 ' + (likeAnimating[m.id] ? 'scale-125 ' : '')} />
                              <span>{m.likedByMe ? '已赞' : '点赞'}（{m.likeCount || 0}）</span>
                            </button>
                            <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" onClick={() => loadComments(m.id)}>
                              <MessageCircle className="h-4 w-4" />
                              <span>评论（{comments[m.id]?.total ?? m.commentCount ?? 0}）</span>
                            </button>
                            {((user?.id && String(user.id) === m.authorId) || (Array.isArray(user?.roles) && user.roles.some((r) => (typeof r === 'string' ? r : r?.name) === 'admin'))) ? (
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
                              ) : comments[m.id].items.map((c: Comment) => (
                                <div key={c.id} className="flex items-start gap-2">
                                  <Avatar className="h-7 w-7">
                                    {c.authorAvatar ? (
                                      <AvatarImage src={getAvatarUrl(c.authorAvatar)} alt={c.authorName || c.authorId} />
                                    ) : (
                                      <AvatarFallback>{(c.authorName || c.authorId).slice(0, 2)}</AvatarFallback>
                                    )}
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <div className="font-medium text-xs truncate max-w-[60%]">{c.authorName || `用户 ${c.authorId}`}</div>
                                      <div className="text-[10px] text-muted-foreground">{formatTime(c.createdAt)}</div>
                                      <button
                                        className="text-[10px] text-muted-foreground hover:underline"
                                        onClick={() => { setReplyTargets((s) => ({ ...s, [m.id]: { commentId: c.id, toName: c.authorName || `用户 ${c.authorId}` } })); requestAnimationFrame(() => focusCommentInput(m.id)) }}
                                      >回复</button>
                                    </div>
                                    <div className="text-xs whitespace-pre-wrap leading-6 break-words">
                                      {c.parentAuthorName ? (
                                        <span>回复 <span className="font-medium">{c.parentAuthorName}</span>：{c.content}</span>
                                      ) : (
                                        <span>{c.content}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {isLoggedIn ? (
                                <div className="flex flex-col gap-1">
                                  {replyTargets[m.id]?.toName ? (
                                    <div className="text-[10px] text-muted-foreground">
                                      正在回复 {replyTargets[m.id]?.toName}
                                      <button className="ml-2 underline" onClick={() => setReplyTargets((s) => ({ ...s, [m.id]: null }))}>取消</button>
                                    </div>
                                  ) : null}
                                  <div className="flex items-center gap-2">
                                    <input
                                      ref={(el) => { commentInputRefs.current[m.id] = el }}
                                      className="flex-1 h-8 text-xs rounded-full px-3 border"
                                      placeholder={replyTargets[m.id]?.toName ? `回复 ${replyTargets[m.id]?.toName}...` : "写下你的评论..."}
                                      value={commentDrafts[m.id] || ''}
                                      onChange={(e) => setCommentDrafts((s) => ({ ...s, [m.id]: e.target.value }))}
                                      disabled={commentLoading[m.id]}
                                    />
                                    <Button size="sm" disabled={!((commentDrafts[m.id] || '').trim()) || commentLoading[m.id]} onClick={() => submitComment(m.id)}>发送</Button>
                                  </div>
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

      {/* 图片预览弹层 */}
      <Dialog open={!!imagePreviewUrl} onOpenChange={(o) => { if (!o) setImagePreviewUrl(null) }}>
        <DialogContent className="max-w-5xl p-0 bg-transparent border-none shadow-none overflow-hidden">
          {imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt="preview"
              className="w-full h-auto max-h-[80vh] object-contain rounded"
            />
          ) : null}
        </DialogContent>
      </Dialog>
        </div>

        {/* 右侧推荐/新闻/活跃用户等 */}
        <aside className="space-y-4 md:sticky md:top-20">
          <Card className="shadow-sm">
            <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-transparent rounded-t">
              <CardTitle className="text-base flex items-center gap-2"><Flame className="h-4 w-4 text-primary/80" />推荐动态</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                <li className="group flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 hover:ring-1 hover:ring-border transition-all">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70 group-hover:bg-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">本周热门话题：聊天效率提升技巧</div>
                    <div className="text-[11px] text-muted-foreground">热度 1,245</div>
                  </div>
                </li>
                <li className="group flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 hover:ring-1 hover:ring-border transition-all">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70 group-hover:bg-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">AI 助手最佳实践：提示工程入门</div>
                    <div className="text-[11px] text-muted-foreground">精选 980</div>
                  </div>
                </li>
                <li className="group flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 hover:ring-1 hover:ring-border transition-all">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70 group-hover:bg-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">社区精选：优质内容合集</div>
                    <div className="text-[11px] text-muted-foreground">更新于 2 小时前</div>
                  </div>
                </li>
              </ul>
            </CardContent>
            <div className="px-4 pb-3">
              <Link href="#" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                查看更多 <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-transparent rounded-t">
              <CardTitle className="text-base flex items-center gap-2"><Newspaper className="h-4 w-4 text-primary/80" />平台新闻</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                <li className="group flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 hover:ring-1 hover:ring-border transition-all">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70 group-hover:bg-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">新版本发布：性能优化与细节提升</div>
                    <div className="text-[11px] text-muted-foreground">3 天前</div>
                  </div>
                </li>
                <li className="group flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 hover:ring-1 hover:ring-border transition-all">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70 group-hover:bg-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">活动预告：社区问答与技术分享</div>
                    <div className="text-[11px] text-muted-foreground">10 月 12 日</div>
                  </div>
                </li>
                <li className="group flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 hover:ring-1 hover:ring-border transition-all">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/70 group-hover:bg-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">更新日志：Bug 修复与体验改进</div>
                    <div className="text-[11px] text-muted-foreground">昨天</div>
                  </div>
                </li>
              </ul>
            </CardContent>
            <div className="px-4 pb-3">
              <Link href="#" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                全部新闻 <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-transparent rounded-t">
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary/80" />活跃用户</CardTitle>
            </CardHeader>
            <CardContent>
              {activeUsers.length === 0 ? (
                <div className="text-xs text-muted-foreground">暂无数据</div>
              ) : (
                <ul className="space-y-2">
                  {activeUsers.map((u) => {
                    const img = getAvatarUrl(u.avatar)
                    const initial = (u.name || u.id).slice(0, 1).toUpperCase()
                    return (
                      <li key={u.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 hover:ring-1 hover:ring-border transition-all">
                        <UserAvatar src={img} alt={`@${u.name || u.id}`} fallbackText={initial} className="h-6 w-6" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">@{u.name}</div>
                          <div className="text-[10px] text-muted-foreground">发帖 {u.count} 条</div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-transparent rounded-t">
              <CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4 text-primary/80" />热门标签</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["AI","提示工程","产品设计","性能优化","社区精选","聊效提升"].map((t) => (
                  <Link key={t} href="#" className="px-2 py-0.5 rounded-full text-xs border border-border hover:bg-muted/50 transition-colors">#{t}</Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-transparent rounded-t">
              <CardTitle className="text-base">平台 Token / NFT</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-border p-2 bg-muted/30">
                    <div className="text-xs text-muted-foreground">Token</div>
                    <div className="text-sm font-medium">LC</div>
                  </div>
                  <div className="rounded-md border border-border p-2 bg-muted/30">
                    <div className="text-xs text-muted-foreground">NFT</div>
                    <div className="text-sm font-medium">Creator Badge</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">（占位展示，后续可接入真实数据）</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8">连接钱包</Button>
                  <Button variant="ghost" size="sm" className="h-8">了解更多</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
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
