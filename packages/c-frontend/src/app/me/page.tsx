"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { apiClient, fetchMe } from "@/lib/apiClient"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface UserProfileData {
  id: number
  username: string
  profile?: {
    nickname?: string
    avatar?: string
    gender?: string
    bio?: string
  } | null
}

export default function MePage() {
  const [me, setMe] = useState<{ id: number; username: string } | null>(null)
  const [loadingMe, setLoadingMe] = useState(true)
  const [profile, setProfile] = useState<UserProfileData | null>(null)
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
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!me?.username) return
    let mounted = true
    setLoadingProfile(true)
    setError(null)
    apiClient
      .get(`/user/by-username/${encodeURIComponent(me.username)}`)
      .then((res) => {
        if (!mounted) return
        setProfile(res.data)
      })
      .catch((e) => {
        if (!mounted) return
        const msg = e?.response?.status === 404 ? "未找到你的公开主页" : "加载失败，请稍后重试"
        setError(msg)
      })
      .finally(() => mounted && setLoadingProfile(false))
    return () => {
      mounted = false
    }
  }, [me?.username])

  const isLoading = loadingMe || (me?.username ? loadingProfile : false)

  return (
    <main className="min-h-dvh p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">我的</h1>
        <div className="flex items-center gap-2">
          {me?.username && (
            <Button asChild>
              <Link href={`/u/${encodeURIComponent(me.username)}`}>查看公开主页</Link>
            </Button>
          )}
          <Button asChild variant="outline"><Link href="/">返回首页</Link></Button>
        </div>
      </header>

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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">动态（占位）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">这里展示你发布的内容、最近互动等。</div>
        </CardContent>
      </Card>
    </main>
  )
}