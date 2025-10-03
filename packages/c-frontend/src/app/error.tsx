"use client"

import Link from "next/link"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-dvh p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">出错了</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">抱歉，页面发生错误。您可以重试或返回首页。</div>
          <div className="flex gap-2">
            <Button onClick={() => reset()}>重试</Button>
            <Button asChild variant="outline"><Link href="/">返回首页</Link></Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}