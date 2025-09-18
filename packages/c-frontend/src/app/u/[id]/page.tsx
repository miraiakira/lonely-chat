"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
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

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const username = decodeURIComponent(id)
  const [data, setData] = useState<UserProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meUsername, setMeUsername] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    apiClient
      .get(`/user/by-username/${encodeURIComponent(username)}`)
      .then((res) => {
        if (!mounted) return
        setData(res.data)
      })
      .catch((e) => {
        if (!mounted) return
        const msg = e?.response?.status === 404 ? "用户不存在" : "加载失败，请稍后重试"
        setError(msg)
      })
      .finally(() => mounted && setLoading(false))
    return () => {
      mounted = false
    }
  }, [username])

  useEffect(() => {
    let mounted = true
    fetchMe()
      .then((me) => {
        if (!mounted) return
        if (me?.username) setMeUsername(me.username)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  return (
    <main className="min-h-dvh p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">用户主页：{username}</h1>
        <div className="flex items-center gap-2">
          {meUsername === username && (
            <Button asChild>
              <Link href="/me">编辑资料</Link>
            </Button>
          )}
          <Button asChild variant="outline"><Link href="/">返回首页</Link></Button>
        </div>
      </header>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">加载中...</div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : data ? (
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                {data.profile?.avatar ? (
                  <AvatarImage src={data.profile.avatar.startsWith("http") ? data.profile.avatar : `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3030/api"}/uploads/${data.profile.avatar}`} alt={data.profile?.nickname || data.username} />
                ) : (
                  <AvatarFallback>{(data.profile?.nickname || data.username || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
                )}
              </Avatar>
              <div className="space-y-2">
                <div className="text-lg font-medium">{data.profile?.nickname || data.username}</div>
                <div className="text-sm text-muted-foreground">@{data.username}</div>
                {data.profile?.bio ? (
                  <p className="text-sm leading-6 whitespace-pre-wrap">{data.profile.bio}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">这个人很神秘，还没有填写个人简介</p>
                )}
              </div>
            </div>
          ) : null}
          <Separator className="my-6" />
          <div className="text-sm text-muted-foreground">最近动态（占位）</div>
        </CardContent>
      </Card>
    </main>
  )
}