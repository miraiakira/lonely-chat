import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="min-h-dvh p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">页面未找到</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">抱歉，您访问的页面不存在或已被移动。</div>
          <Button asChild variant="outline"><Link href="/">返回首页</Link></Button>
        </CardContent>
      </Card>
    </main>
  )
}