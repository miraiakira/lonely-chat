import { Controller, Get, Post, Query } from '@nestjs/common'
import { SearchService } from './search.service'

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get('health')
  async health() {
    return this.search.ping()
  }

  // 预留：posts 与 users 的搜索接口将加入在此模块
  @Get('hello')
  hello() {
    return { ok: true }
  }

  // 管理：初始化索引（开发环境使用）
  @Post('init')
  async init() {
    await this.search.initializeIndices()
    return { ok: true }
  }

  @Get('posts')
  async searchPosts(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('engine') engine?: string,
  ) {
    const mode = engine === 'es' ? 'es' : engine === 'db' ? 'db' : 'auto'
    return this.search.searchPosts(q, Number(limit) || 20, Number(offset) || 0, mode as any)
  }

  @Get('users')
  async searchUsers(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.search.searchUsers(q, Number(limit) || 20, Number(offset) || 0)
  }

  @Get('modules')
  async searchModules(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.search.searchModules(q, Number(limit) || 20, Number(offset) || 0)
  }

  // 一键重建 Posts/Users/Modules 的索引（开发/维护用）
  @Post('rebuild')
  async rebuild() {
    const res = await this.search.rebuildAllIndices()
    return { ok: true, ...res }
  }

  // 新增：删除并按最新映射重建全部索引，然后回填（用于更新 analyzer/mapping 后）
  @Post('recreate')
  async recreate() {
    const res = await this.search.recreateAllIndices()
    return { ok: true, ...res }
  }
}