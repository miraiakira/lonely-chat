"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agree) {
      setError("请先勾选同意服务条款")
      return
    }
    setLoading(true)
    setError(null)
    try {
      // TODO: 接入后端注册接口后替换此处逻辑
      await login(username, password, true)
      router.push("/chat")
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "注册失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh p-6 max-w-sm mx-auto flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">注册</h1>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm"><Link href="/auth/login">去登录</Link></Button>
          <Button asChild variant="outline"><Link href="/">返回首页</Link></Button>
        </div>
      </header>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="block text-sm font-medium">用户名</Label>
          <Input
            value={username}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
            placeholder="yourname"
          />
        </div>
        <div className="space-y-2">
          <Label className="block text-sm font-medium">密码</Label>
          <Input
            type="password"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="******"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <Checkbox checked={agree} onChange={(e: ChangeEvent<HTMLInputElement>) => setAgree(e.target.checked)} />
          我已阅读并同意服务条款
        </label>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <Button type="submit" disabled={loading} className="w-full">{loading ? "提交中..." : "注册"}</Button>
      </form>
    </main>
  )
}