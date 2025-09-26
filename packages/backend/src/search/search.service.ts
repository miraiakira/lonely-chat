import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common'
import { ElasticsearchService } from '@nestjs/elasticsearch'
import { PostsService } from '../posts/posts.service'
import { UserService } from '../user/user.service'
import { ConfigService } from '@nestjs/config'
import { ModuleMetaService } from '../module-meta/module-meta.service'

// 帖子索引映射定义，支持中文分词
const POSTS_INDEX_MAPPING = {
  settings: {
    analysis: {
      filter: {
        english_stop: { type: 'stop', stopwords: '_english_' },
        english_stemmer: { type: 'stemmer', language: 'english' },
        // CJK 二元分词，内置，无需安装插件
        // 结合 lowercase + asciifolding，兼容中英文与拉丁字符
      },
      analyzer: {
        zh_en_index: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['cjk_bigram', 'lowercase', 'asciifolding', 'english_stop', 'english_stemmer'],
        },
        zh_en_search: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['cjk_bigram', 'lowercase', 'asciifolding', 'english_stop', 'english_stemmer'],
        },
      },
    },
  },
  mappings: {
    properties: {
      id: { type: 'long' },
      content: {
        type: 'text',
        analyzer: 'zh_en_index',
        search_analyzer: 'zh_en_search',
        fields: { keyword: { type: 'keyword' } },
      },
      authorId: { type: 'long' },
      authorUsername: {
        type: 'text',
        analyzer: 'zh_en_index',
        search_analyzer: 'zh_en_search',
        fields: { keyword: { type: 'keyword' } },
      },
      images: { type: 'keyword' }, // 存储图片URL数组
      likesCount: { type: 'long' },
      commentsCount: { type: 'long' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
    },
  },
}

// 用户索引映射定义
const USERS_INDEX_MAPPING = {
  settings: {
    analysis: {
      filter: {
        english_stop: { type: 'stop', stopwords: '_english_' },
        english_stemmer: { type: 'stemmer', language: 'english' },
      },
      analyzer: {
        zh_en_index: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['cjk_bigram', 'lowercase', 'asciifolding', 'english_stop', 'english_stemmer'],
        },
        zh_en_search: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['cjk_bigram', 'lowercase', 'asciifolding', 'english_stop', 'english_stemmer'],
        },
      },
    },
  },
  mappings: {
    properties: {
      id: { type: 'long' },
      username: {
        type: 'text',
        analyzer: 'zh_en_index',
        search_analyzer: 'zh_en_search',
        fields: { keyword: { type: 'keyword' } },
      },
      nickname: {
        type: 'text',
        analyzer: 'zh_en_index',
        search_analyzer: 'zh_en_search',
        fields: { keyword: { type: 'keyword' } },
      },
      avatar: { type: 'keyword' },
      createdAt: { type: 'date' },
    },
  },
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name)
  public static readonly POSTS_INDEX = 'posts'
  public static readonly USERS_INDEX = 'users'
  public static readonly MODULES_INDEX = 'modules'

  constructor(
    private readonly es: ElasticsearchService,
    @Inject(forwardRef(() => PostsService))
    private readonly postsService: PostsService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => ModuleMetaService))
    private readonly moduleMetaService: ModuleMetaService,
    private readonly config: ConfigService,
  ) {}

  private pinyinAvailable = false
  private ikAvailable = false

  // 在启动时探测 ES 插件（analysis-pinyin / analysis-ik）
  private async detectEsPlugins(): Promise<void> {
    try {
      const clientAny = this.es as any
      let rows: any[] = []
      if (clientAny.cat?.plugins) {
        const res = await clientAny.cat.plugins({ format: 'json' })
        rows = Array.isArray(res?.body) ? res.body : Array.isArray(res) ? res : []
      } else if (clientAny.transport?.request) {
        const res = await clientAny.transport.request({ method: 'GET', path: '/_cat/plugins', querystring: { format: 'json' } })
        rows = Array.isArray(res?.body) ? res.body : Array.isArray(res) ? res : []
      }
      const names = rows.map((r: any) => r.component || r.name || '').filter(Boolean)
      this.pinyinAvailable = names.some((n: string) => String(n).includes('analysis-pinyin'))
      this.ikAvailable = names.some((n: string) => String(n).includes('analysis-ik'))
      this.logger.log(`ES plugins detected: pinyin=${this.pinyinAvailable}, ik=${this.ikAvailable}`)
    } catch (e) {
      this.logger.warn(`Detect ES plugins failed, fallback to defaults: ${String((e as any)?.message || e)}`)
    }
  }

  private isPinyinEnabled(): boolean {
    const v = (this.config.get<string>('SEARCH_USE_PINYIN', 'auto') || 'auto').toLowerCase()
    if (v === 'true') return true
    if (v === 'false') return false
    return this.pinyinAvailable
  }

  private isIkEnabled(): boolean {
    const v = (this.config.get<string>('SEARCH_USE_IK', 'auto') || 'auto').toLowerCase()
    if (v === 'true') return true
    if (v === 'false') return false
    return this.ikAvailable
  }

  // 新增：粗略判断查询是否为纯英文/ASCII，以便禁用 pinyin 字段
  private isEnglishQuery(q: string): boolean {
    const s = (q || '').trim()
    if (!s) return false
    for (let i = 0; i < s.length; i++) {
      if (s.charCodeAt(i) > 127) return false
    }
    return true
  }

  async onModuleInit() {
    // 先探测插件，再按可用性与环境变量确定 analyzer/mapping
    try {
      await this.detectEsPlugins()
    } catch {}
    // 尝试初始化索引（开发环境可用，失败不影响主流程）
    try {
      await this.initializeIndices()
    } catch (e) {
      this.logger.warn(`initializeIndices failed: ${String((e as any)?.message || e)}`)
    }
  }

  async ping(): Promise<{ ok: boolean; res?: any }> {
    try {
      const res = await this.es.ping()
      return { ok: true, res }
    } catch (e) {
      this.logger.error('Elasticsearch ping failed', e as any)
      return { ok: false }
    }
  }

  async indexExists(index: string): Promise<boolean> {
    try {
      const res: any = await this.es.indices.exists({ index })
      // @elastic/elasticsearch v9 可能返回 boolean 或 { body: boolean }
      if (typeof res === 'boolean') return res
      return Boolean(res?.body ?? res)
    } catch (e) {
      // 出错时按不存在处理，由上层决定是否创建
      return false
    }
  }

  async createIndex(index: string, body: any): Promise<any> {
    return this.es.indices.create({ index, body })
  }

  private async initIndex(indexName: string, mapping: any): Promise<void> {
    try {
      const exists = await this.indexExists(indexName)
      if (!exists) {
        try {
          await this.createIndex(indexName, mapping)
          this.logger.log(`Index ${indexName} created successfully`)
        } catch (error) {
          const type = (error as any)?.meta?.body?.error?.type || (error as any)?.body?.error?.type
          if (type === 'resource_already_exists_exception') {
            this.logger.log(`Index ${indexName} already exists (race)`) // 并发创建/已存在
          } else {
            throw error
          }
        }
      } else {
        this.logger.log(`Index ${indexName} already exists`)
      }
    } catch (error) {
      this.logger.error(`Failed to initialize index ${indexName}`, error as any)
      throw error
    }
  }

  async deleteIndex(index: string): Promise<any> {
    return this.es.indices.delete({ index })
  }

  // 初始化索引
  async initializeIndices(): Promise<void> {
    const postsMapping = this.buildPostsIndexMapping()
    const usersMapping = this.buildUsersIndexMapping()
    const modulesMapping = this.buildModulesIndexMapping()
    await this.initIndex(SearchService.POSTS_INDEX, postsMapping)
    await this.initIndex(SearchService.USERS_INDEX, usersMapping)
    await this.initIndex(SearchService.MODULES_INDEX, modulesMapping)
  }

  // 对外：搜索帖子（优先 ES，降级 DB）
  async searchPosts(q: string, limit = 20, offset = 0, engine: 'auto' | 'es' | 'db' = 'auto'): Promise<{ total: number; items: any[]; from: number }>
  {
    const query = (q || '').trim()
    if (!query) return { total: 0, items: [], from: 0 }
    // 如果强制 DB
    if (engine === 'db') {
      return this.searchPostsDB(query, limit, offset)
    }
    try {
      const usePinyin = this.isPinyinEnabled() && !this.isEnglishQuery(query)
      const fields = usePinyin
        ? ['content^2', 'content.pinyin^2', 'authorUsername', 'authorUsername.pinyin']
        : ['content^2', 'authorUsername']
      const tokens = query.split(/\s+/).filter(Boolean)
      const multiMatchQuery: any = { query, fields, type: 'best_fields' }
      if (tokens.length >= 2) multiMatchQuery.minimum_should_match = '75%'
      const res: any = await this.es.search({
        index: SearchService.POSTS_INDEX,
        from: Math.max(0, Number(offset) || 0),
        size: Math.max(1, Math.min(50, Number(limit) || 20)),
        track_total_hits: true,
        query: {
          multi_match: multiMatchQuery,
        },
        sort: [{ createdAt: { order: 'desc' } }],
        highlight: {
          pre_tags: ['<em>'],
          post_tags: ['</em>'],
          fields: {
            content: {},
            authorUsername: {},
          },
          number_of_fragments: 1,
          fragment_size: 120,
        },
      })
      // 兼容 @elastic/elasticsearch 返回体结构（res 或 res.body）
      const body = (res as any)?.body ?? res
      const hitsArr = body?.hits?.hits ?? []
      const totalVal = body?.hits?.total?.value ?? hitsArr.length
      if (!totalVal) {
        // ES 查询成功但无命中
        if (engine === 'auto') {
          return this.searchPostsDB(query, limit, offset)
        }
        return { total: 0, items: [], from: 0 }
      }
      return {
        total: totalVal,
        from: body?.hits?.from ?? 0,
        items: hitsArr.map((h: any) => ({
          id: Number(h._source?.id),
          content: String(h._source?.content || ''),
          authorId: Number(h._source?.authorId || 0),
          authorUsername: String(h._source?.authorUsername || ''),
          images: h._source?.images || null,
          likesCount: Number(h._source?.likesCount || 0),
          commentsCount: Number(h._source?.commentsCount || 0),
          createdAt: Number(h._source?.createdAt || 0),
          contentHighlight: h?.highlight?.content?.[0],
          authorUsernameHighlight: h?.highlight?.authorUsername?.[0],
        })),
      }
    } catch (e) {
      // ES 查询失败，降级 DB
      if (engine === 'auto') {
        return this.searchPostsDB(query, limit, offset)
      }
      this.logger.error('Elasticsearch searchPosts failed', e as any)
      return { total: 0, items: [], from: 0 }
    }
  }

  // DB 回退：简单 ILIKE 检索
  private async searchPostsDB(q: string, limit = 20, offset = 0): Promise<{ total: number; items: any[]; from: number }>
  {
    // 复用 PostsService 提供的方法（我们会在 PostsService 中实现）
    const res = await (this.postsService as any).searchPostsByContent(q, limit, offset)
    return res
  }

  // 对外：搜索用户（优先 ES，降级 DB）
  async searchUsers(q: string, limit = 20, offset = 0): Promise<{ total: number; items: any[]; from: number }>
  {
    const query = (q || '').trim()
    if (!query) return { total: 0, items: [], from: 0 }
    try {
      const usePinyin = this.isPinyinEnabled()
      const fields = usePinyin
        ? ['username^2', 'username.pinyin^2', 'nickname', 'nickname.pinyin']
        : ['username^2', 'nickname']
      const tokens = query.split(/\s+/).filter(Boolean)
      const multiMatchQuery: any = { query, fields, type: 'best_fields' }
      if (tokens.length >= 2) multiMatchQuery.minimum_should_match = '75%'
      const res: any = await this.es.search({
        index: SearchService.USERS_INDEX,
        from: Math.max(0, Number(offset) || 0),
        size: Math.max(1, Math.min(50, Number(limit) || 20)),
        track_total_hits: true,
        query: {
          multi_match: multiMatchQuery,
        },
        sort: [{ createdAt: { order: 'desc' } }],
        highlight: {
          pre_tags: ['<em>'],
          post_tags: ['</em>'],
          fields: {
            username: {},
            nickname: {},
          },
          number_of_fragments: 1,
          fragment_size: 60,
        },
      })
      const body = (res as any)?.body ?? res
      const hits = body?.hits?.hits || []
      return {
        total: body?.hits?.total?.value ?? hits.length,
        from: body?.hits?.from ?? 0,
        items: hits.map((h: any) => {
          const uh = h?.highlight?.username?.[0]
          const nh = h?.highlight?.nickname?.[0]
          return {
            id: String(h._source.id),
            username: h._source.username,
            nickname: h._source.nickname,
            avatar: h._source.avatar,
            createdAt: h._source.createdAt,
            usernameHighlight: uh,
            nicknameHighlight: nh,
          }
        }),
      }
    } catch (e) {
      this.logger.error('Elasticsearch searchUsers failed', e as any)
      return { total: 0, items: [], from: 0 }
    }
  }

  // ==================== 同步方法 ====================

  // 索引单个帖子（新增/更新）
  async indexPost(postId: number): Promise<void> {
    try {
      const post = await (this.postsService as any).getSummarizedPostById?.(postId)
      if (!post) {
        this.logger.warn(`Post ${postId} not found for indexing`)
        return
      }

      await this.es.index({
        index: SearchService.POSTS_INDEX,
        id: String(postId),
        document: {
          id: Number(post.id),
          content: post.content || '',
          authorId: Number(post.authorId),
          authorUsername: post.authorName || '',
          images: post.images || null,
          likesCount: post.likeCount || 0,
          commentsCount: post.commentCount || 0,
          createdAt: new Date(post.createdAt).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        refresh: 'wait_for',
      })
    } catch (e) {
      this.logger.error(`Failed to index post ${postId}`, e as any)
    }
  }

  // 索引单个帖子（直接传入文档）
  async indexPostDocument(doc: {
    id: number
    content: string
    authorId: number
    authorUsername: string
    images: string[] | null
    likesCount?: number
    commentsCount?: number
    createdAt: number | string
    updatedAt?: number | string
  }): Promise<void> {
    try {
      await this.es.index({
        index: SearchService.POSTS_INDEX,
        id: String(doc.id),
        document: {
          id: Number(doc.id),
          content: doc.content || '',
          authorId: Number(doc.authorId),
          authorUsername: doc.authorUsername || '',
          images: doc.images || null,
          likesCount: doc.likesCount ?? 0,
          commentsCount: doc.commentsCount ?? 0,
          createdAt: new Date(doc.createdAt).toISOString(),
          updatedAt: new Date(doc.updatedAt ?? Date.now()).toISOString(),
        },
        refresh: 'wait_for',
      })
    } catch (e) {
      this.logger.error(`Failed to index post document ${doc.id}`, e as any)
    }
  }

  // 删除帖子索引
  async removePostIndex(postId: number): Promise<void> {
    try {
      await this.es.delete({
        index: SearchService.POSTS_INDEX,
        id: String(postId),
      })
    } catch (e) {
      if ((e as any)?.body?.result !== 'not_found') {
        this.logger.error(`Failed to remove post index ${postId}`, e as any)
      }
    }
  }

  // 更新帖子计数（点赞/评论数变化时调用）
  async updatePostCounts(postId: number, likesCount?: number, commentsCount?: number): Promise<void> {
    try {
      const body: any = {}
      if (typeof likesCount === 'number') body.likesCount = likesCount
      if (typeof commentsCount === 'number') body.commentsCount = commentsCount
      if (Object.keys(body).length === 0) return

      await this.es.update({
        index: SearchService.POSTS_INDEX,
        id: String(postId),
        doc: body,
        retry_on_conflict: 3,
      })
    } catch (e) {
      if ((e as any)?.body?.result !== 'not_found') {
        this.logger.error(`Failed to update post counts ${postId}`, e as any)
      }
    }
  }

  // 索引单个用户（新增/更新）
  async indexUser(userId: number): Promise<void> {
    try {
      const user = await this.userService.findOne(userId)
      if (!user) {
        this.logger.warn(`User ${userId} not found for indexing`)
        return
      }

      await this.es.index({
        index: SearchService.USERS_INDEX,
        id: String(userId),
        document: {
          id: Number(user.id),
          username: user.username || '',
          nickname: (user as any)?.profile?.nickname || user.username || '',
          avatar: (user as any)?.profile?.avatar || null,
          createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        },
      })
    } catch (e) {
      this.logger.error(`Failed to index user ${userId}`, e as any)
    }
  }

  // 删除用户索引
  async removeUserIndex(userId: number): Promise<void> {
    try {
      await this.es.delete({
        index: SearchService.USERS_INDEX,
        id: String(userId),
      })
    } catch (e) {
      if ((e as any)?.body?.result !== 'not_found') {
        this.logger.error(`Failed to remove user index ${userId}`, e as any)
      }
    }
  }

  // 全量重建索引（posts & users & modules）。注意：这是耗时操作，建议后台任务化
  async rebuildAllIndices(): Promise<{ posts: number; users: number; modules: number }> {
    await this.initializeIndices()

    let postsIndexed = 0
    let usersIndexed = 0
    let modulesIndexed = 0

    // Posts bulk
    try {
      const ids = await this.postsService.getAllIdsForIndexing()
      const batches = this.chunkArray(ids, 500)
      for (const batch of batches) {
        const operations: any[] = []
        for (const id of batch) {
          try {
            const p = await (this.postsService as any).getSummarizedPostById?.(id)
            if (!p) continue
            operations.push({ index: { _index: SearchService.POSTS_INDEX, _id: String(p.id) } })
            operations.push({
              id: Number(p.id),
              content: String(p.content || ''),
              authorId: Number(p.authorId || 0),
              authorUsername: String(p.authorName || ''),
              images: p.images || null,
              likesCount: Number(p.likeCount || 0),
              commentsCount: Number(p.commentCount || 0),
              createdAt: Number(p.createdAt || Date.now()),
            })
          } catch (e) {
            this.logger.warn(`skip post ${id} due to error: ${String((e as any)?.message || e)}`)
          }
        }
        if (operations.length > 0) {
          const res: any = await this.es.bulk({ operations, refresh: true })
          const items = res?.body?.items || []
          postsIndexed += items.filter((it: any) => it?.index?.status >= 200 && it?.index?.status < 300).length
        }
      }
    } catch (e) {
      this.logger.warn(`bulk index posts error: ${String((e as any)?.message || e)}`)
    }

    // Users bulk
    try {
      const allUsers = await this.userService.findAll()
      const batches = this.chunkArray(allUsers, 500)
      for (const batch of batches) {
        const operations: any[] = []
        for (const u of batch) {
          const nickname = (u as any)?.profile?.nickname || (u as any).username
          const avatar = (u as any)?.profile?.avatar || null
          const createdAt = (u as any)?.createdAt?.getTime?.() || Date.now()
          operations.push({ index: { _index: SearchService.USERS_INDEX, _id: String((u as any).id) } })
          operations.push({
            id: Number((u as any).id),
            username: String((u as any).username),
            nickname: String(nickname || ''),
            avatar: avatar,
            createdAt: Number(createdAt),
          })
        }
        if (operations.length > 0) {
          const res: any = await this.es.bulk({ operations, refresh: true })
          const items = res?.body?.items || []
          usersIndexed += items.filter((it: any) => it?.index?.status >= 200 && it?.index?.status < 300).length
        }
      }
    } catch (e) {
      this.logger.warn(`bulk index users error: ${String((e as any)?.message || e)}`)
    }

    // Modules bulk
    try {
      const allModules = await this.moduleMetaService.getAllForIndexing()
      const batches = this.chunkArray(allModules, 500)
      for (const batch of batches) {
        const operations: any[] = []
        for (const m of batch) {
          const createdAt = (m as any)?.createdAt?.getTime?.() || new Date((m as any).createdAt as any).getTime?.() || Date.now()
          operations.push({ index: { _index: SearchService.MODULES_INDEX, _id: String((m as any).id) } })
          operations.push({
            id: Number((m as any).id),
            code: String((m as any).code || ''),
            name: String((m as any).name || ''),
            description: (m as any).description || '',
            status: String((m as any).status || ''),
            version: (m as any).version || null,
            ownerRoles: (m as any).ownerRoles || null,
            createdAt: Number(createdAt),
          })
        }
        if (operations.length > 0) {
          const res: any = await this.es.bulk({ operations, refresh: true })
          const items = res?.body?.items || []
          modulesIndexed += items.filter((it: any) => it?.index?.status >= 200 && it?.index?.status < 300).length
        }
      }
    } catch (e) {
      this.logger.warn(`bulk index modules error: ${String((e as any)?.message || e)}`)
    }

    return { posts: postsIndexed, users: usersIndexed, modules: modulesIndexed }
  }

  // 便捷：删除并重建全部索引（用于更新 analyzer/mapping 后的一键重建）
  async recreateAllIndices(): Promise<{ posts: number; users: number; modules: number }> {
    // 尝试删除，忽略不存在错误
    for (const idx of [SearchService.POSTS_INDEX, SearchService.USERS_INDEX, SearchService.MODULES_INDEX]) {
      try {
        await this.deleteIndex(idx)
      } catch (e) {
        // ignore
      }
    }
    // 重新创建索引（使用当前常量映射）
    await this.initializeIndices()
    // 回填数据
    return this.rebuildAllIndices()
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const s = Math.max(1, Number(size) || 1)
    const res: T[][] = []
    for (let i = 0; i < arr.length; i += s) res.push(arr.slice(i, i + s))
    return res
  }

  // -------- Analyzer/Mapping 构建（支持 IK/内置模式切换）---------
  private buildCommonAnalysis() {
    const useIK = this.isIkEnabled()
    const usePinyin = this.isPinyinEnabled()
    const ikMode = this.config.get<string>('SEARCH_IK_MODE', 'ik_smart') // ik_smart | ik_max_word
    const stopwordsEnv = (this.config.get<string>('SEARCH_STOPWORDS', '') || '').trim()
    const customStops = stopwordsEnv ? stopwordsEnv.split(',').map((s) => s.trim()).filter(Boolean) : []

    if (useIK) {
      // IK 模式：依赖 ES 安装 ik 插件。可选自定义停用词（内联 list）。
      const analyzers = {
        analyzer: {
          zh_index: {
            type: 'custom',
            tokenizer: ikMode, // 'ik_smart' | 'ik_max_word'
            filter: customStops.length ? ['lowercase', 'custom_stop'] : ['lowercase'],
          },
          zh_search: {
            type: 'custom',
            tokenizer: ikMode,
            filter: customStops.length ? ['lowercase', 'custom_stop'] : ['lowercase'],
          },
        },
      }
      const filter: Record<string, any> = customStops.length
        ? { custom_stop: { type: 'stop', stopwords: customStops } }
        : {}

      // 可选：拼音 filter/analyzer
      if (usePinyin) {
        filter.my_pinyin = {
          type: 'pinyin',
          keep_first_letter: true,
          keep_full_pinyin: true,
          keep_original: false,
          remove_duplicated_term: true,
          lowercase: true,
        }
        ;(analyzers.analyzer as any).pinyin_analyzer = {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'my_pinyin'],
        }
      }

      return { analysis: { ...analyzers, filter } }
    }

    // 内置模式：无需插件，使用 cjk_bigram + 英文词干
    const analysis: any = {
      filter: {
        english_stop: { type: 'stop', stopwords: '_english_' },
        english_stemmer: { type: 'stemmer', language: 'english' },
        ...(customStops.length ? { custom_stop: { type: 'stop', stopwords: customStops } } : {}),
      },
      analyzer: {
        zh_en_index: {
          type: 'custom',
          tokenizer: 'standard',
          filter: customStops.length
            ? ['cjk_bigram', 'lowercase', 'asciifolding', 'english_stop', 'english_stemmer', 'custom_stop']
            : ['cjk_bigram', 'lowercase', 'asciifolding', 'english_stop', 'english_stemmer'],
        },
        zh_en_search: {
          type: 'custom',
          tokenizer: 'standard',
          filter: customStops.length
            ? ['cjk_bigram', 'lowercase', 'asciifolding', 'english_stop', 'english_stemmer', 'custom_stop']
            : ['cjk_bigram', 'lowercase', 'asciifolding', 'english_stop', 'english_stemmer'],
        },
      },
    }

    if (usePinyin) {
      analysis.filter.my_pinyin = {
        type: 'pinyin',
        keep_first_letter: true,
        keep_full_pinyin: true,
        keep_original: false,
        remove_duplicated_term: true,
        lowercase: true,
      }
      analysis.analyzer.pinyin_analyzer = {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'my_pinyin'],
      }
    }

    return { analysis }
  }

  private buildPostsIndexMapping() {
    const useIK = this.isIkEnabled()
    const usePinyin = this.isPinyinEnabled()
    const settings = this.buildCommonAnalysis()
    const analyzerIndex = useIK ? 'zh_index' : 'zh_en_index'
    const analyzerSearch = useIK ? 'zh_search' : 'zh_en_search'
    return {
      settings,
      mappings: {
        properties: {
          id: { type: 'long' },
          content: {
            type: 'text',
            analyzer: analyzerIndex,
            search_analyzer: analyzerSearch,
            fields: {
              keyword: { type: 'keyword' },
              ...(usePinyin
                ? { pinyin: { type: 'text', analyzer: 'pinyin_analyzer', search_analyzer: 'pinyin_analyzer' } }
                : {}),
            },
          },
          authorId: { type: 'long' },
          authorUsername: {
            type: 'text',
            analyzer: analyzerIndex,
            search_analyzer: analyzerSearch,
            fields: {
              keyword: { type: 'keyword' },
              ...(usePinyin
                ? { pinyin: { type: 'text', analyzer: 'pinyin_analyzer', search_analyzer: 'pinyin_analyzer' } }
                : {}),
            },
          },
          images: { type: 'keyword' },
          likesCount: { type: 'long' },
          commentsCount: { type: 'long' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
        },
      },
    }
  }

  private buildUsersIndexMapping() {
    const useIK = this.isIkEnabled()
    const usePinyin = this.isPinyinEnabled()
    const settings = this.buildCommonAnalysis()
    const analyzerIndex = useIK ? 'zh_index' : 'zh_en_index'
    const analyzerSearch = useIK ? 'zh_search' : 'zh_en_search'
    return {
      settings,
      mappings: {
        properties: {
          id: { type: 'long' },
          username: {
            type: 'text',
            analyzer: analyzerIndex,
            search_analyzer: analyzerSearch,
            fields: {
              keyword: { type: 'keyword' },
              ...(usePinyin
                ? { pinyin: { type: 'text', analyzer: 'pinyin_analyzer', search_analyzer: 'pinyin_analyzer' } }
                : {}),
            },
          },
          nickname: {
            type: 'text',
            analyzer: analyzerIndex,
            search_analyzer: analyzerSearch,
            fields: {
              keyword: { type: 'keyword' },
              ...(usePinyin
                ? { pinyin: { type: 'text', analyzer: 'pinyin_analyzer', search_analyzer: 'pinyin_analyzer' } }
                : {}),
            },
          },
          avatar: { type: 'keyword' },
          createdAt: { type: 'date' },
        },
      },
    }
  }

  // 对外：搜索模块（ModuleMeta）（优先 ES）
  async searchModules(q: string, limit = 20, offset = 0): Promise<{ total: number; items: any[]; from: number }>
  {
    const query = (q || '').trim()
    if (!query) return { total: 0, items: [], from: 0 }
    try {
      const usePinyin = this.isPinyinEnabled()
      const fields = usePinyin
        ? ['name^3', 'name.pinyin^3', 'description^1', 'description.pinyin^1', 'code^2', 'code.pinyin^2']
        : ['name^3', 'description^1', 'code^2']
      const tokens = query.split(/\s+/).filter(Boolean)
      const multiMatchQuery: any = { query, fields, type: 'best_fields' }
      if (tokens.length >= 2) multiMatchQuery.minimum_should_match = '75%'
      const res: any = await this.es.search({
        index: SearchService.MODULES_INDEX,
        from: Math.max(0, Number(offset) || 0),
        size: Math.max(1, Math.min(50, Number(limit) || 20)),
        track_total_hits: true,
        query: {
          multi_match: {
            query,
            fields,
            type: 'best_fields',
          },
        },
        sort: [{ createdAt: { order: 'desc' } }],
        highlight: {
          pre_tags: ['<em>'],
          post_tags: ['</em>'],
          fields: { name: {}, description: {}, code: {} },
          number_of_fragments: 1,
          fragment_size: 80,
        },
      })
      const body = (res as any)?.body ?? res
      const hits = body?.hits?.hits || []
      return {
        total: body?.hits?.total?.value ?? hits.length,
        from: body?.hits?.from ?? 0,
        items: hits.map((h: any) => {
          const nh = h?.highlight?.name?.[0]
          const dh = h?.highlight?.description?.[0]
          const ch = h?.highlight?.code?.[0]
          return {
            id: Number(h._source.id),
            code: h._source.code,
            name: h._source.name,
            description: h._source.description,
            status: h._source.status,
            version: h._source.version,
            ownerRoles: h._source.ownerRoles,
            createdAt: h._source.createdAt,
            nameHighlight: nh,
            descriptionHighlight: dh,
            codeHighlight: ch,
          }
        }),
      }
    } catch (e) {
      this.logger.error('Elasticsearch searchModules failed', e as any)
      return { total: 0, items: [], from: 0 }
    }
  }

  // 索引单个模块（新增/更新）
  async indexModule(moduleId: number): Promise<void> {
    try {
      const m = await this.moduleMetaService.findOne(moduleId)
      if (!m) return
      const createdAt = (m as any)?.createdAt?.getTime?.() || Date.now()
      await this.es.index({
        index: SearchService.MODULES_INDEX,
        id: String(m.id),
        document: {
          id: Number((m as any).id),
          code: String((m as any).code || ''),
          name: String((m as any).name || ''),
          description: (m as any).description || '',
          status: String((m as any).status || ''),
          version: (m as any).version || null,
          ownerRoles: (m as any).ownerRoles || null,
          createdAt: Number(createdAt),
        },
        refresh: true,
      })
    } catch (e) {
      this.logger.error(`indexModule failed for ${moduleId}`, e as any)
    }
  }

  async removeModuleIndex(moduleId: number): Promise<void> {
    try {
      await this.es.delete({ index: SearchService.MODULES_INDEX, id: String(moduleId) })
    } catch (e) {
      if ((e as any)?.body?.result !== 'not_found') {
        this.logger.error(`Failed to remove module index ${moduleId}`, e as any)
      }
    }
  }

  private buildModulesIndexMapping() {
    const useIK = this.isIkEnabled()
    const usePinyin = this.isPinyinEnabled()
    const settings = this.buildCommonAnalysis()
    const analyzerIndex = useIK ? 'zh_index' : 'zh_en_index'
    const analyzerSearch = useIK ? 'zh_search' : 'zh_en_search'
    return {
      settings,
      mappings: {
        properties: {
          id: { type: 'long' },
          code: {
            type: 'text',
            analyzer: analyzerIndex,
            search_analyzer: analyzerSearch,
            fields: {
              keyword: { type: 'keyword' },
              ...(usePinyin ? { pinyin: { type: 'text', analyzer: 'pinyin_analyzer', search_analyzer: 'pinyin_analyzer' } } : {}),
            },
          },
          name: {
            type: 'text',
            analyzer: analyzerIndex,
            search_analyzer: analyzerSearch,
            fields: {
              keyword: { type: 'keyword' },
              ...(usePinyin ? { pinyin: { type: 'text', analyzer: 'pinyin_analyzer', search_analyzer: 'pinyin_analyzer' } } : {}),
            },
          },
          description: {
            type: 'text',
            analyzer: analyzerIndex,
            search_analyzer: analyzerSearch,
            fields: {
              keyword: { type: 'keyword' },
              ...(usePinyin ? { pinyin: { type: 'text', analyzer: 'pinyin_analyzer', search_analyzer: 'pinyin_analyzer' } } : {}),
            },
          },
          status: { type: 'keyword' },
          version: { type: 'keyword' },
          ownerRoles: { type: 'keyword' },
          createdAt: { type: 'date' },
        },
      },
    }
  }
}