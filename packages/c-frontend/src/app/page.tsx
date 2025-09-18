"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { getPublicConversation } from "@/lib/chat.api"
import { apiClient, fetchMe } from "@/lib/apiClient"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()
  const [joining, setJoining] = useState(false)
  // 我的区块所需状态
  const [me, setMe] = useState<{ id: number; username: string } | null>(null)
  const [loadingMe, setLoadingMe] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoadingMe(true)
    fetchMe()
      .then((m) => {
        if (!mounted) return
        if (m?.username) {
          setMe({ id: m.id, username: m.username })
        } else {
          setMe(null)
        }
      })
      .catch(() => {
        if (!mounted) return
        setMe(null)
      })
      .finally(() => mounted && setLoadingMe(false))
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!me?.username) return
    let mounted = true
    setLoadingProfile(true)
    setError(null)
    apiClient
      .get(`/user/by-username/${encodeURIComponent(me.username)}`)
      .then((res) => { if (mounted) setProfile(res.data) })
      .catch((e) => {
        if (!mounted) return
        const msg = e?.response?.status === 404 ? "未找到你的公开主页" : "加载失败，请稍后重试"
        setError(msg)
      })
      .finally(() => mounted && setLoadingProfile(false))
    return () => { mounted = false }
  }, [me?.username])

  const isLoading = loadingMe || (me?.username ? loadingProfile : false)

  async function goPublic() {
    if (!user) {
      router.push("/auth/login")
      return
    }
    try {
      setJoining(true)
      const conv = await getPublicConversation()
      router.push(`/chat?conv=${encodeURIComponent(conv.id)}`)
    } finally {
      setJoining(false)
    }
  }
  return (
    <main className="min-h-dvh p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Lonely Chat</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href="/feed">动态</Link></Button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>开始聊天</CardTitle>
            <CardDescription>和朋友或群组实时沟通</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {user ? `已登录：${user.username}` : "未登录，先登录体验完整功能"}
            </div>
            <div className="flex gap-2">
              {!user && <Button asChild variant="outline" size="sm"><Link href="/auth/login">登录</Link></Button>}
              <Button asChild size="sm" variant="outline"><Link href="/chat">进入聊天</Link></Button>
              <Button size="sm" onClick={goPublic} disabled={joining}>{joining ? "进入中..." : "公共群聊"}</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>语音 / 视频</CardTitle>
            <CardDescription>预留功能入口，敬请期待</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button size="sm" variant="outline">语音（预留）</Button>
            <Button size="sm" variant="outline">视频（预留）</Button>
          </CardContent>
        </Card>
      </section>

      {/* 我的区块（来自 /me 页） */}
      {!me && !isLoading ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">未登录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">请先登录后查看你的个人信息与主页。</p>
            <Button asChild><Link href="/auth/login">去登录</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">资料</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">加载中...</div>
            ) : error ? (
              <div className="text-sm text-destructive">{error}</div>
            ) : profile ? (
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  {profile.profile?.avatar ? (
                    <AvatarImage src={profile.profile.avatar.startsWith("http") ? profile.profile.avatar : `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3030/api"}/uploads/${profile.profile.avatar}`} alt={profile.profile?.nickname || profile.username} />
                  ) : (
                    <AvatarFallback>{(profile.profile?.nickname || profile.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>
                <div className="space-y-2">
                  <div className="text-lg font-medium">{profile.profile?.nickname || profile.username}</div>
                  <div className="text-sm text-muted-foreground">@{profile.username}</div>
                  {profile.profile?.bio ? (
                    <p className="text-sm leading-6 whitespace-pre-wrap">{profile.profile.bio}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">你还没有填写个人简介</p>
                  )}
                </div>
              </div>
            ) : null}

            <Separator className="my-6" />
            <div className="flex items-center gap-3">
              <Button asChild variant="default"><Link href="/me">编辑资料</Link></Button>
               {me?.username && (
                 <Button asChild variant="outline"><Link href={`/u/${encodeURIComponent(me.username)}`}>查看公开主页</Link></Button>
               )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* footer removed per design: avoid extra copy; keep page clean */}
    </main>
  )
}
