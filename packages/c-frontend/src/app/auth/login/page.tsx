"use client"

import Link from "next/link"
import { useState, type ChangeEvent, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // CSR-only dynamic year to avoid SSR/CSR mismatch
  const [year, setYear] = useState<string>("")
  useEffect(() => {
    setYear(String(new Date().getFullYear()))
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) return setError("请输入用户名和密码")
    setLoading(true)
    setError(null)
    try {
      await login(username, password, remember)
      router.push("/chat")
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "登录失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh p-6 flex items-center justify-center bg-gradient-to-b from-background via-background to-muted/40">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* 左侧品牌与卖点（中等及以上尺寸显示） */}
        <div className="relative hidden md:flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(1200px 600px at -10% -10%, rgba(99,102,241,0.25), transparent 60%), radial-gradient(800px 400px at 120% 20%, rgba(236,72,153,0.20), transparent 60%)",
            }}
          />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground bg-background/60 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-primary/70" />
              Lonely Chat
            </div>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">更专注的私密聊天体验</h1>
            <p className="mt-2 text-sm text-muted-foreground">简洁、轻快、开箱即用的现代化聊天产品。</p>
          </div>
          <ul className="relative mt-8 space-y-3 text-sm">
            <li className="flex items-start gap-2"><span className="mt-1">•</span><span>实时消息与会话分组</span></li>
            <li className="flex items-start gap-2"><span className="mt-1">•</span><span>快速搜索、加好友与申请管理</span></li>
            <li className="flex items-start gap-2"><span className="mt-1">•</span><span>统一的 shadcn 风格 UI</span></li>
          </ul>
          <div className="relative mt-8 text-xs text-muted-foreground">© {year ? `${year} ` : ""}Lonely Chat</div>
        </div>

        {/* 右侧登录表单 */}
        <Card className="w-full md:max-w-none shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">登录</CardTitle>
            <p className="text-sm text-muted-foreground">欢迎回来，使用账号登录以继续</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">用户名</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">密码</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    placeholder="••••••"
                    autoComplete="current-password"
                    disabled={loading}
                    className="pr-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-2 text-xs"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? "隐藏" : "显示"}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={remember}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setRemember(e.target.checked)}
                    disabled={loading}
                  />
                  记住登录
                </label>
                <Link href="#" className="text-xs text-muted-foreground hover:text-foreground">忘记密码？</Link>
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "登录中..." : "登录"}
              </Button>
            </form>

            <div className="my-6">
              <Separator />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" className="w-full" onClick={() => alert("暂未接入 GitHub 登录")}>GitHub 登录</Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => alert("暂未接入 Google 登录")}>Google 登录</Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              登录即表示同意我们的 <Link href="#" className="underline underline-offset-2">服务条款</Link> 与 <Link href="#" className="underline underline-offset-2">隐私政策</Link>
            </p>
          </CardContent>
          <CardFooter className="flex items-center justify-between">
            <Button asChild variant="outline" size="sm"><Link href="/">返回首页</Link></Button>
            <div className="text-sm">
              没有账号？<Link href="/auth/register" className="text-primary hover:underline">去注册</Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}