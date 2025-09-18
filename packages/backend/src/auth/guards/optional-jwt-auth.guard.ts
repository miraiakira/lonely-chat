import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

// 可选 JWT 守卫：有 token 时解析 req.user，无 token/无效 token 时放行并返回 null
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // 调用父类逻辑以便在提供 token 时执行校验与 user 解析
    return super.canActivate(context) as any
  }

  handleRequest(err: any, user: any) {
    // 不抛错，允许匿名访问；仅在有合法 token 时返回 user
    if (err) return null
    return user || null
  }
}