"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { searchPosts, type PostSearchItem } from "@/lib/search.api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function SearchPage() {
  const [q, setQ] = useState("")
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<PostSearchItem[]>([])
  const [total, setTotal] = useState(0)

  const canSearch = useMemo(() => q.trim().length > 0, [q])

  const onSearch = async () => {
    const keyword = q.trim()
    if (!keyword) return
    setLoading(true)
    try {
      const res = await searchPosts({ q: keyword, limit: 20, offset: 0, engine: 'es' })
      setItems(res.items)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 如果 URL 自带 ?q=xxx，可尝试初次自动搜索（留空简单实现，后续可接入 useSearchParams）
  }, [])

  const renderHighlight = (html?: string, fallback?: string) => {
    const __html = html || fallback || ""
    return <span dangerouslySetInnerHTML={{ __html }} />
  }

  const formatTime = (ts: number | string) => {
    try {
      const n = typeof ts === 'number' ? ts : Date.parse(ts)
      const d = new Date(n)
      const pad = (x: number) => String(x).padStart(2, "0")
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    } catch {
      return String(ts)
    }
  }

  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex gap-2">
          <Input placeholder="搜索动态关键词..." value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onSearch() }} />
          <Button onClick={onSearch} disabled={!canSearch || loading}>{loading ? '搜索中...' : '搜索'}</Button>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">共 {total} 条结果</div>

        <div className="mt-4 space-y-4">
          {items.map(it => (
            <div key={it.id} className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground flex items-center justify-between">
                <div>作者：{renderHighlight(it.authorUsernameHighlight, it.authorUsername)}</div>
                <div>{formatTime(it.createdAt)}</div>
              </div>
              <div className="mt-2 text-base leading-relaxed break-words">
                {renderHighlight(it.contentHighlight, it.content)}
              </div>
              {!!(it.images?.length) && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {it.images!.slice(0, 9).map((url, idx) => (
                    <div key={idx} className="aspect-square overflow-hidden rounded-md bg-muted">
                      {/* 简化处理：img 直接展示，后续可替换为 Next/Image 以优化加载 */}
                      <img src={url} alt="image" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {(!loading && items.length === 0 && canSearch) && (
            <div className="text-sm text-muted-foreground">没有找到相关动态</div>
          )}
        </div>
      </div>
    </main>
  )
}