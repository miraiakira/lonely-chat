import {
  Injectable,
  Logger,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import type { estypes } from '@elastic/elasticsearch';
import { PostsService } from '../posts/posts.service';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import { ModuleMetaService } from '../module-meta/module-meta.service';
import type {
  PostIndexDoc,
  UserIndexDoc,
  ModuleIndexDoc,
  WithBody,
} from './es.types';

// 精确类型：搜索返回项
type SearchPostItem = {
  id: number;
  content: string;
  authorId: number;
  authorUsername: string;
  images: string[] | null;
  likesCount: number;
  commentsCount: number;
  createdAt: number;
  contentHighlight?: string;
  authorUsernameHighlight?: string;
};

type SearchUserItem = {
  id: number;
  username: string;
  nickname: string;
  avatar: string | null;
  createdAt: number;
  usernameHighlight?: string;
  nicknameHighlight?: string;
};

type SearchModuleItem = {
  id: number;
  code: string;
  name: string;
  description: string;
  status: string;
  version: string | null;
  ownerRoles: string[] | null;
  createdAt: number;
  nameHighlight?: string;
  descriptionHighlight?: string;
  codeHighlight?: string;
};

// 极简响应解析：兼容 res 或 { body: res } 两种形式
function hasBody<T>(x: unknown): x is WithBody<estypes.SearchResponse<T>> {
  return (
    !!x && typeof x === 'object' && 'body' in (x as Record<string, unknown>)
  );
}

function toSearchResponse<T>(res: unknown): estypes.SearchResponse<T> {
  if (hasBody<T>(res)) {
    const body = res.body;
    if (body) return body;
  }
  return res as estypes.SearchResponse<T>;
}

// 帖子索引映射定义，支持中文分词
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          filter: [
            'cjk_bigram',
            'lowercase',
            'asciifolding',
            'english_stop',
            'english_stemmer',
          ],
        },
        zh_en_search: {
          type: 'custom',
          tokenizer: 'standard',
          filter: [
            'cjk_bigram',
            'lowercase',
            'asciifolding',
            'english_stop',
            'english_stemmer',
          ],
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
};

// 用户索引映射定义
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          filter: [
            'cjk_bigram',
            'lowercase',
            'asciifolding',
            'english_stop',
            'english_stemmer',
          ],
        },
        zh_en_search: {
          type: 'custom',
          tokenizer: 'standard',
          filter: [
            'cjk_bigram',
            'lowercase',
            'asciifolding',
            'english_stop',
            'english_stemmer',
          ],
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
};

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  public static readonly POSTS_INDEX = 'posts';
  public static readonly USERS_INDEX = 'users';
  public static readonly MODULES_INDEX = 'modules';

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

  private pinyinAvailable = false;
  private ikAvailable = false;

  // 在启动时探测 ES 插件（analysis-pinyin / analysis-ik）
  private async detectEsPlugins(): Promise<void> {
    try {
      const client = this.es as {
        cat?: { plugins?: (args: { format: 'json' }) => Promise<unknown> };
        transport?: {
          request?: (args: {
            method: string;
            path: string;
            querystring?: Record<string, string>;
          }) => Promise<unknown>;
        };
      };
      const toArray = (value: unknown): unknown[] => {
        if (Array.isArray(value)) return value;
        if (value && typeof value === 'object') {
          const obj = value as Record<string, unknown>;
          const body = obj['body'];
          if (Array.isArray(body)) return body as unknown[];
        }
        return [];
      };
      const getName = (r: unknown): string => {
        if (r && typeof r === 'object') {
          const obj = r as Record<string, unknown>;
          const component = obj['component'];
          const name = obj['name'];
          const compStr = typeof component === 'string' ? component : '';
          const nameStr = typeof name === 'string' ? name : '';
          return compStr || nameStr;
        }
        return '';
      };
      let rowsUnknown: unknown = [];
      if (client.cat?.plugins) {
        rowsUnknown = await client.cat.plugins({ format: 'json' });
      } else if (client.transport?.request) {
        rowsUnknown = await client.transport.request({
          method: 'GET',
          path: '/_cat/plugins',
          querystring: { format: 'json' },
        });
      }
      const rows = toArray(rowsUnknown);
      const names = rows.map(getName).filter(Boolean);
      this.pinyinAvailable = names.some((n: string) =>
        String(n).includes('analysis-pinyin'),
      );
      this.ikAvailable = names.some((n: string) =>
        String(n).includes('analysis-ik'),
      );
      this.logger.log(
        `ES plugins detected: pinyin=${this.pinyinAvailable}, ik=${this.ikAvailable}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `Detect ES plugins failed, fallback to defaults: ${msg}`,
      );
    }
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
  }

  private isPinyinEnabled(): boolean {
    const v = (
      this.config.get<string>('SEARCH_USE_PINYIN', 'auto') || 'auto'
    ).toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
    return this.pinyinAvailable;
  }

  private isIkEnabled(): boolean {
    const v = (
      this.config.get<string>('SEARCH_USE_IK', 'auto') || 'auto'
    ).toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
    return this.ikAvailable;
  }

  // 新增：粗略判断查询是否为纯英文/ASCII，以便禁用 pinyin 字段
  private isEnglishQuery(q: string): boolean {
    const s = (q || '').trim();
    if (!s) return false;
    for (let i = 0; i < s.length; i++) {
      if (s.charCodeAt(i) > 127) return false;
    }
    return true;
  }

  async onModuleInit() {
    // 先探测插件，再按可用性与环境变量确定 analyzer/mapping
    try {
      await this.detectEsPlugins();
    } catch (e) {
      console.error(e);
    }
    // 尝试初始化索引（开发环境可用，失败不影响主流程）
    try {
      await this.initializeIndices();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`initializeIndices failed: ${msg}`);
    }
  }

  async ping(): Promise<{ ok: boolean; res?: unknown }> {
    try {
      const res = await this.es.ping();
      return { ok: true, res };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger.error('Elasticsearch ping failed', err);
      return { ok: false };
    }
  }

  async indexExists(index: string): Promise<boolean> {
    try {
      const res = await this.es.indices.exists({ index });
      if (typeof res === 'boolean') return res;
      const obj =
        res && typeof res === 'object' ? (res as Record<string, unknown>) : {};
      const body = obj['body'];
      return typeof body === 'boolean' ? body : Boolean(body ?? res);
    } catch (e) {
      // 出错时按不存在处理，由上层决定是否创建
      console.error(e);
      return false;
    }
  }

  async createIndex(
    index: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    return this.es.indices.create({ index, body });
  }

  private async initIndex(
    indexName: string,
    mapping: Record<string, unknown>,
  ): Promise<void> {
    try {
      const exists = await this.indexExists(indexName);
      if (!exists) {
        try {
          await this.createIndex(indexName, mapping);
          this.logger.log(`Index ${indexName} created successfully`);
        } catch (error) {
          const type = (() => {
            if (error && typeof error === 'object') {
              const errObj = error as Record<string, unknown>;
              const meta = errObj['meta'];
              if (meta && typeof meta === 'object') {
                const body = (meta as Record<string, unknown>)['body'];
                if (body && typeof body === 'object') {
                  const err = (body as Record<string, unknown>)['error'];
                  if (err && typeof err === 'object') {
                    const t = (err as Record<string, unknown>)['type'];
                    if (typeof t === 'string') return t;
                  }
                }
              }
              const body2 = errObj['body'];
              if (body2 && typeof body2 === 'object') {
                const err2 = (body2 as Record<string, unknown>)['error'];
                if (err2 && typeof err2 === 'object') {
                  const t2 = (err2 as Record<string, unknown>)['type'];
                  if (typeof t2 === 'string') return t2;
                }
              }
            }
            return undefined;
          })();
          if (type === 'resource_already_exists_exception') {
            this.logger.log(`Index ${indexName} already exists (race)`); // 并发创建/已存在
          } else {
            throw error;
          }
        }
      } else {
        this.logger.log(`Index ${indexName} already exists`);
      }
    } catch (error) {
      this.logger.error(`Failed to initialize index ${indexName}`, error);
      throw error;
    }
  }

  async deleteIndex(index: string): Promise<unknown> {
    return this.es.indices.delete({ index });
  }

  // 初始化索引
  async initializeIndices(): Promise<void> {
    const postsMapping = this.buildPostsIndexMapping();
    const usersMapping = this.buildUsersIndexMapping();
    const modulesMapping = this.buildModulesIndexMapping();
    await this.initIndex(SearchService.POSTS_INDEX, postsMapping);
    await this.initIndex(SearchService.USERS_INDEX, usersMapping);
    await this.initIndex(SearchService.MODULES_INDEX, modulesMapping);
  }

  // 对外：搜索帖子（优先 ES，降级 DB）
  async searchPosts(
    q: string,
    limit = 20,
    offset = 0,
    engine: 'auto' | 'es' | 'db' = 'auto',
  ): Promise<{ total: number; items: SearchPostItem[]; from: number }> {
    const query = (q || '').trim();
    if (!query) return { total: 0, items: [], from: 0 };
    // 如果强制 DB
    if (engine === 'db') {
      return this.searchPostsDB(query, limit, offset);
    }
    try {
      const usePinyin = this.isPinyinEnabled() && !this.isEnglishQuery(query);
      const fields = usePinyin
        ? [
            'content^2',
            'content.pinyin^2',
            'authorUsername',
            'authorUsername.pinyin',
          ]
        : ['content^2', 'authorUsername'];
      const tokens = query.split(/\s+/).filter(Boolean);
      const multiMatchQuery: {
        query: string;
        fields: string[];
        type: 'best_fields';
        minimum_should_match?: string;
      } = { query, fields, type: 'best_fields' };
      if (tokens.length >= 2) multiMatchQuery.minimum_should_match = '75%';
      const res = await this.es.search({
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
      });
      // 简化类型解析，直接使用官方 estypes.SearchResponse<T>
      const body = toSearchResponse<PostIndexDoc>(res);
      const hitsArr = body?.hits?.hits ?? [];
      const totalVal =
        typeof body?.hits?.total === 'number'
          ? body.hits.total
          : (body?.hits?.total?.value ?? hitsArr.length);
      if (!totalVal) {
        // ES 查询成功但无命中
        if (engine === 'auto') {
          return this.searchPostsDB(query, limit, offset);
        }
        return { total: 0, items: [], from: 0 };
      }
      return {
        total: totalVal,
        from: 0,
        items: hitsArr.map((h) => {
          const src = (h?._source ?? {}) as Partial<PostIndexDoc>;
          let createdAt = Number(src.createdAt ?? 0);
          if (createdAt > 0 && createdAt < 1e12) createdAt = createdAt * 1000;
          const hl = h?.highlight ?? {};
          const firstString = (arr?: string[]): string | undefined =>
            Array.isArray(arr) ? arr[0] : undefined;
          return {
            id: Number(src.id ?? 0),
            content: typeof src.content === 'string' ? src.content : '',
            authorId: Number(src.authorId ?? 0),
            authorUsername:
              typeof src.authorUsername === 'string' ? src.authorUsername : '',
            images: Array.isArray(src.images)
              ? src.images.filter((i): i is string => typeof i === 'string')
              : null,
            likesCount: Number(src.likesCount ?? 0),
            commentsCount: Number(src.commentsCount ?? 0),
            createdAt,
            contentHighlight: firstString(
              hl['content'] as string[] | undefined,
            ),
            authorUsernameHighlight: firstString(
              hl['authorUsername'] as string[] | undefined,
            ),
          } as SearchPostItem;
        }),
      };
    } catch (e) {
      // ES 查询失败，降级 DB
      if (engine === 'auto') {
        return this.searchPostsDB(query, limit, offset);
      }
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger.error('Elasticsearch searchPosts failed', err);
      return { total: 0, items: [], from: 0 };
    }
  }

  // DB 回退：简单 ILIKE 检索
  private async searchPostsDB(
    q: string,
    limit = 20,
    offset = 0,
  ): Promise<{ total: number; items: SearchPostItem[]; from: number }> {
    // 复用 PostsService，但规范化字段名为 likesCount/commentsCount
    const res = await this.postsService.searchPostsByContent(q, limit, offset);
    const items: SearchPostItem[] = res.items.map((i) => {
      const images = Array.isArray(i.images)
        ? i.images.filter((x): x is string => typeof x === 'string')
        : null;
      let createdAt = Number(i.createdAt ?? 0);
      if (createdAt > 0 && createdAt < 1e12) createdAt = createdAt * 1000;
      return {
        id: Number(i.id ?? 0),
        content: typeof i.content === 'string' ? i.content : '',
        authorId: Number(i.authorId ?? 0),
        authorUsername:
          typeof i.authorUsername === 'string' ? i.authorUsername : '',
        images,
        likesCount: Number(i.likeCount ?? 0),
        commentsCount: Number(i.commentCount ?? 0),
        createdAt,
      };
    });
    return {
      total: Number(res.total ?? 0),
      items,
      from: Number(res.from ?? 0),
    };
  }

  // 对外：搜索用户（优先 ES，降级 DB）
  async searchUsers(
    q: string,
    limit = 20,
    offset = 0,
  ): Promise<{ total: number; items: SearchUserItem[]; from: number }> {
    const query = (q || '').trim();
    if (!query) return { total: 0, items: [], from: 0 };
    try {
      const usePinyin = this.isPinyinEnabled();
      const fields = usePinyin
        ? ['username^2', 'username.pinyin^2', 'nickname', 'nickname.pinyin']
        : ['username^2', 'nickname'];
      const tokens = query.split(/\s+/).filter(Boolean);
      const multiMatchQuery: {
        query: string;
        fields: string[];
        type: 'best_fields';
        minimum_should_match?: string;
      } = { query, fields, type: 'best_fields' };
      if (tokens.length >= 2) multiMatchQuery.minimum_should_match = '75%';
      const res = await this.es.search({
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
      });
      // 简化类型解析，直接使用官方 estypes.SearchResponse<T>
      const body = toSearchResponse<UserIndexDoc>(res);
      const hitsArr = body?.hits?.hits ?? [];
      const totalVal =
        typeof body?.hits?.total === 'number'
          ? body.hits.total
          : (body?.hits?.total?.value ?? hitsArr.length);
      const fromVal = 0;
      return {
        total: totalVal,
        from: fromVal,
        items: hitsArr.map((h) => {
          const src = (h?._source ?? {}) as Partial<UserIndexDoc>;
          let createdAt = Number(src.createdAt ?? 0);
          if (createdAt > 0 && createdAt < 1e12) createdAt = createdAt * 1000;
          const hl = h?.highlight ?? {};
          const firstString = (arr?: string[]): string | undefined =>
            Array.isArray(arr) ? arr[0] : undefined;
          return {
            id: Number(src.id ?? 0),
            username: typeof src.username === 'string' ? src.username : '',
            nickname: typeof src.nickname === 'string' ? src.nickname : '',
            avatar:
              typeof src.avatar === 'string'
                ? src.avatar
                : src.avatar == null
                  ? null
                  : null,
            createdAt,
            usernameHighlight: firstString(hl['username']),
            nicknameHighlight: firstString(hl['nickname']),
          } as SearchUserItem;
        }),
      };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger.error('Elasticsearch searchUsers failed', err);
      return { total: 0, items: [], from: 0 };
    }
  }

  // ==================== 同步方法 ====================

  // 索引单个帖子（新增/更新）
  async indexPost(postId: number): Promise<void> {
    try {
      const docSrc = await this.postsService.getIndexPostDocById(postId);
      if (!docSrc) {
        this.logger.warn(`Post ${postId} not found for indexing`);
        return;
      }
      const normTime = (v: unknown): number => {
        const d = v as Date;
        if (d?.getTime) return d.getTime();
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isFinite(n) || n <= 0) return Date.now();
        return n < 1e12 ? Math.round(n * 1000) : Math.round(n);
      };

      const doc: PostIndexDoc = {
        ...docSrc,
        createdAt: normTime(docSrc.createdAt ?? Date.now()),
        updatedAt: Date.now(),
      };

      await this.es.index({
        index: SearchService.POSTS_INDEX,
        id: String(postId),
        document: doc,
        refresh: 'wait_for',
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger.error(`Failed to index post ${postId}`, err);
    }
  }

  // 索引单个帖子（直接传入文档）
  async indexPostDocument(doc: {
    id: number;
    content: string;
    authorId: number;
    authorUsername: string;
    images: string[] | null;
    likesCount?: number;
    commentsCount?: number;
    createdAt: number | string;
    updatedAt?: number | string;
  }): Promise<void> {
    try {
      const normTime = (v: unknown): number => {
        const d = v as Date;
        if (d?.getTime) return d.getTime();
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isFinite(n) || n <= 0) return Date.now();
        return n < 1e12 ? Math.round(n * 1000) : Math.round(n);
      };
      const normalized: PostIndexDoc = {
        id: Number(doc.id),
        content: String(doc.content || ''),
        authorId: Number(doc.authorId),
        authorUsername: String(doc.authorUsername || ''),
        images: doc.images || null,
        likesCount: doc.likesCount ?? 0,
        commentsCount: doc.commentsCount ?? 0,
        createdAt: normTime(doc.createdAt),
        updatedAt: normTime(doc.updatedAt ?? Date.now()),
      };
      await this.es.index({
        index: SearchService.POSTS_INDEX,
        id: String(doc.id),
        document: normalized,
        refresh: 'wait_for',
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger.error(`Failed to index post document ${doc.id}`, err);
    }
  }

  // 删除帖子索引
  async removePostIndex(postId: number): Promise<void> {
    try {
      await this.es.delete({
        index: SearchService.POSTS_INDEX,
        id: String(postId),
      });
    } catch (e) {
      const eObj =
        e && typeof e === 'object' ? (e as Record<string, unknown>) : {};
      const body = eObj['body'];
      const result =
        body && typeof body === 'object'
          ? (body as Record<string, unknown>)['result']
          : undefined;
      if (result !== 'not_found') {
        const err = e instanceof Error ? e : new Error(String(e));
        this.logger.error(`Failed to remove post index ${postId}`, err);
      }
    }
  }

  // 更新帖子计数（点赞/评论数变化时调用）
  async updatePostCounts(
    postId: number,
    likesCount?: number,
    commentsCount?: number,
  ): Promise<void> {
    try {
      const docBody: Record<string, unknown> = {};
      if (typeof likesCount === 'number') docBody['likesCount'] = likesCount;
      if (typeof commentsCount === 'number')
        docBody['commentsCount'] = commentsCount;
      if (Object.keys(docBody).length === 0) return;

      await this.es.update({
        index: SearchService.POSTS_INDEX,
        id: String(postId),
        doc: docBody,
        retry_on_conflict: 3,
      });
    } catch (e) {
      const eObj =
        e && typeof e === 'object' ? (e as Record<string, unknown>) : {};
      const body = eObj['body'];
      const result =
        body && typeof body === 'object'
          ? (body as Record<string, unknown>)['result']
          : undefined;
      if (result !== 'not_found') {
        const err = e instanceof Error ? e : new Error(String(e));
        this.logger.error(`Failed to update post counts ${postId}`, err);
      }
    }
  }

  // 索引单个用户（新增/更新）
  async indexUser(userId: number): Promise<void> {
    try {
      const user = await this.userService.findOne(userId);
      if (!user) {
        this.logger.warn(`User ${userId} not found for indexing`);
        return;
      }
      const normTime = (val: Date | number | string | undefined): number => {
        if (val instanceof Date) return val.getTime();
        if (typeof val === 'number')
          return val < 1e12 ? Math.round(val * 1000) : Math.round(val);
        if (typeof val === 'string') {
          const t = Date.parse(val);
          return Number.isFinite(t) ? t : Date.now();
        }
        return Date.now();
      };
      const doc: UserIndexDoc = {
        id: Number(user.id || 0),
        username: String(user.username || ''),
        nickname:
          typeof user.profile?.nickname === 'string' && user.profile.nickname
            ? user.profile.nickname
            : String(user.username || ''),
        avatar:
          typeof user.profile?.avatar === 'string'
            ? user.profile.avatar
            : user.profile?.avatar == null
              ? null
              : String(user.profile?.avatar),
        createdAt: normTime(user.createdAt),
      };
      await this.es.index({
        index: SearchService.USERS_INDEX,
        id: String(userId),
        document: doc,
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger.error(`Failed to index user ${userId}`, err);
    }
  }

  // 删除用户索引
  async removeUserIndex(userId: number): Promise<void> {
    try {
      await this.es.delete({
        index: SearchService.USERS_INDEX,
        id: String(userId),
      });
    } catch (e) {
      const obj =
        e && typeof e === 'object' ? (e as Record<string, unknown>) : {};
      const body = obj['body'];
      const result =
        body && typeof body === 'object'
          ? (body as Record<string, unknown>)['result']
          : undefined;
      if (result !== 'not_found') {
        const err = e instanceof Error ? e : new Error(String(e));
        this.logger.error(`Failed to remove user index ${userId}`, err);
      }
    }
  }

  // 全量重建索引（posts & users & modules）。注意：这是耗时操作，建议后台任务化
  async rebuildAllIndices(): Promise<{
    posts: number;
    users: number;
    modules: number;
  }> {
    await this.initializeIndices();

    let postsIndexed = 0;
    let usersIndexed = 0;
    let modulesIndexed = 0;

    // Posts bulk
    try {
      const ids = await this.postsService.getAllIdsForIndexing();
      const batches = this.chunkArray(ids, 500);
      for (const batch of batches) {
        const operations: Array<Record<string, unknown>> = [];
        for (const id of batch) {
          try {
            const doc = await this.postsService.getIndexPostDocById(id);
            if (!doc) continue;
            // 统一时间为毫秒
            const normTime = (v: unknown): number => {
              const d = v as Date;
              if (d?.getTime) return d.getTime();
              const n = typeof v === 'number' ? v : Number(v);
              if (!Number.isFinite(n) || n <= 0) return Date.now();
              return n < 1e12 ? Math.round(n * 1000) : Math.round(n);
            };
            operations.push({
              index: { _index: SearchService.POSTS_INDEX, _id: String(doc.id) },
            });
            operations.push({
              ...doc,
              createdAt: normTime(doc.createdAt ?? Date.now()),
              updatedAt: Date.now(),
            });
          } catch (e) {
            this.logger.warn(
              `skip post ${id} due to error: ${String(e instanceof Error ? e.message : e)}`,
            );
          }
        }
        if (operations.length > 0) {
          const res = await this.es.bulk({ operations, refresh: true });
          const body =
            (res as { body?: estypes.BulkResponse }).body ?? undefined;
          const items = body?.items ?? [];
          const arr = Array.isArray(items) ? items : [];
          postsIndexed += arr.filter((it: unknown) => {
            const obj =
              it && typeof it === 'object'
                ? (it as Record<string, unknown>)
                : {};
            const idx = obj['index'];
            const status =
              idx && typeof idx === 'object'
                ? (idx as Record<string, unknown>)['status']
                : undefined;
            return typeof status === 'number' && status >= 200 && status < 300;
          }).length;
        }
      }
    } catch (e) {
      this.logger.warn(
        `bulk index posts error: ${String(e instanceof Error ? e.message : e)}`,
      );
    }

    // Users bulk
    try {
      const allUsers = await this.userService.findAll();
      const batches = this.chunkArray(allUsers, 500);
      for (const batch of batches) {
        const operations: Array<Record<string, unknown>> = [];
        for (const u of batch) {
          const usernameStr = typeof u.username === 'string' ? u.username : '';
          const nicknameStr =
            typeof u.profile?.nickname === 'string' && u.profile.nickname
              ? u.profile.nickname
              : usernameStr;
          const avatarStr =
            typeof u.profile?.avatar === 'string'
              ? u.profile.avatar
              : u.profile?.avatar == null
                ? null
                : String(u.profile?.avatar);
          operations.push({
            index: {
              _index: SearchService.USERS_INDEX,
              _id: String(u.id),
            },
          });
          operations.push({
            id: Number(u.id ?? 0),
            username: usernameStr,
            nickname: nicknameStr,
            avatar: avatarStr,
            createdAt: u.createdAt,
          });
        }
        if (operations.length > 0) {
          const res = await this.es.bulk({ operations, refresh: true });
          const body =
            (res as { body?: estypes.BulkResponse }).body ?? undefined;
          const items = body?.items ?? [];
          const arr = Array.isArray(items) ? items : [];
          usersIndexed += arr.filter((it: unknown) => {
            const obj =
              it && typeof it === 'object'
                ? (it as Record<string, unknown>)
                : {};
            const idx = obj['index'];
            const status =
              idx && typeof idx === 'object'
                ? (idx as Record<string, unknown>)['status']
                : undefined;
            return typeof status === 'number' && status >= 200 && status < 300;
          }).length;
        }
      }
    } catch (e) {
      this.logger.warn(
        `bulk index users error: ${String(e instanceof Error ? e.message : e)}`,
      );
    }

    // Modules bulk
    try {
      const allModules = await this.moduleMetaService.getAllForIndexing();
      const batches = this.chunkArray(allModules, 500);
      for (const batch of batches) {
        const operations: Array<Record<string, unknown>> = [];
        for (const m of batch) {
          // 统一毫秒时间并去除 any 断言
          const normTime = (v: unknown): number => {
            if (v instanceof Date) return v.getTime();
            const n = typeof v === 'number' ? v : Number(v);
            if (!Number.isFinite(n) || n <= 0) return Date.now();
            return n < 1e12 ? Math.round(n * 1000) : Math.round(n);
          };
          const createdAt = normTime(m.createdAt);
          operations.push({
            index: {
              _index: SearchService.MODULES_INDEX,
              _id: String(m.id),
            },
          });
          operations.push({
            id: Number(m.id || 0),
            code: String(m.code || ''),
            name: String(m.name || ''),
            description: (m.description as string) || '',
            status: String(m.status || ''),
            version: (m.version as string) || null,
            ownerRoles: Array.isArray(m.ownerRoles)
              ? (m.ownerRoles as unknown[]).map((x) => String(x))
              : null,
            createdAt: Number(createdAt),
          });
        }
        if (operations.length > 0) {
          const res = await this.es.bulk({ operations, refresh: true });
          const body =
            (res as { body?: estypes.BulkResponse }).body ?? undefined;
          const items = body?.items ?? [];
          const arr = Array.isArray(items) ? items : [];
          modulesIndexed += arr.filter((it: unknown) => {
            const obj =
              it && typeof it === 'object'
                ? (it as Record<string, unknown>)
                : {};
            const idx = obj['index'];
            const status =
              idx && typeof idx === 'object'
                ? (idx as Record<string, unknown>)['status']
                : undefined;
            return typeof status === 'number' && status >= 200 && status < 300;
          }).length;
        }
      }
    } catch (e) {
      this.logger.warn(
        `bulk index modules error: ${String(e instanceof Error ? e.message : e)}`,
      );
    }

    return {
      posts: postsIndexed,
      users: usersIndexed,
      modules: modulesIndexed,
    };
  }

  // 便捷：删除并重建全部索引（用于更新 analyzer/mapping 后的一键重建）
  async recreateAllIndices(): Promise<{
    posts: number;
    users: number;
    modules: number;
  }> {
    // 尝试删除，忽略不存在错误
    for (const idx of [
      SearchService.POSTS_INDEX,
      SearchService.USERS_INDEX,
      SearchService.MODULES_INDEX,
    ]) {
      try {
        await this.deleteIndex(idx);
      } catch (e) {
        console.error(e);
        // ignore
      }
    }
    // 重新创建索引（使用当前常量映射）
    await this.initializeIndices();
    // 回填数据
    return this.rebuildAllIndices();
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const s = Math.max(1, Number(size) || 1);
    const res: T[][] = [];
    for (let i = 0; i < arr.length; i += s) res.push(arr.slice(i, i + s));
    return res;
  }

  // -------- Analyzer/Mapping 构建（支持 IK/内置模式切换）---------
  private buildCommonAnalysis() {
    const useIK = this.isIkEnabled();
    const usePinyin = this.isPinyinEnabled();
    const ikMode = this.config.get<string>('SEARCH_IK_MODE', 'ik_smart'); // ik_smart | ik_max_word
    const stopwordsEnv = (
      this.config.get<string>('SEARCH_STOPWORDS', '') || ''
    ).trim();
    const customStops = stopwordsEnv
      ? stopwordsEnv
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    if (useIK) {
      // IK 模式：依赖 ES 安装 ik 插件。可选自定义停用词（内联 list）。
      const analyzers = {
        analyzer: {
          zh_index: {
            type: 'custom',
            tokenizer: ikMode, // 'ik_smart' | 'ik_max_word'
            filter: customStops.length
              ? ['lowercase', 'custom_stop']
              : ['lowercase'],
          },
          zh_search: {
            type: 'custom',
            tokenizer: ikMode,
            filter: customStops.length
              ? ['lowercase', 'custom_stop']
              : ['lowercase'],
          },
        },
      };
      const filter: Record<string, unknown> = customStops.length
        ? { custom_stop: { type: 'stop', stopwords: customStops } }
        : {};

      // 可选：拼音 filter/analyzer
      if (usePinyin) {
        filter.my_pinyin = {
          type: 'pinyin',
          keep_first_letter: true,
          keep_full_pinyin: true,
          keep_original: false,
          remove_duplicated_term: true,
          lowercase: true,
        };
        analyzers.analyzer['pinyin_analyzer'] = {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'my_pinyin'],
        };
      }

      return { analysis: { ...analyzers, filter } };
    }

    // 内置模式：无需插件，使用 cjk_bigram + 英文词干
    const analysis: {
      filter: Record<string, unknown>;
      analyzer: Record<string, unknown>;
    } = {
      filter: {
        english_stop: { type: 'stop', stopwords: '_english_' },
        english_stemmer: { type: 'stemmer', language: 'english' },
        ...(customStops.length
          ? { custom_stop: { type: 'stop', stopwords: customStops } }
          : {}),
      },
      analyzer: {
        zh_en_index: {
          type: 'custom',
          tokenizer: 'standard',
          filter: customStops.length
            ? [
                'cjk_bigram',
                'lowercase',
                'asciifolding',
                'english_stop',
                'english_stemmer',
                'custom_stop',
              ]
            : [
                'cjk_bigram',
                'lowercase',
                'asciifolding',
                'english_stop',
                'english_stemmer',
              ],
        },
        zh_en_search: {
          type: 'custom',
          tokenizer: 'standard',
          filter: customStops.length
            ? [
                'cjk_bigram',
                'lowercase',
                'asciifolding',
                'english_stop',
                'english_stemmer',
                'custom_stop',
              ]
            : [
                'cjk_bigram',
                'lowercase',
                'asciifolding',
                'english_stop',
                'english_stemmer',
              ],
        },
      },
    };

    if (usePinyin) {
      analysis.filter['my_pinyin'] = {
        type: 'pinyin',
        keep_first_letter: true,
        keep_full_pinyin: true,
        keep_original: false,
        remove_duplicated_term: true,
        lowercase: true,
      };
      analysis.analyzer['pinyin_analyzer'] = {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'my_pinyin'],
      };
    }

    return { analysis };
  }

  private buildPostsIndexMapping() {
    const useIK = this.isIkEnabled();
    const usePinyin = this.isPinyinEnabled();
    const settings = this.buildCommonAnalysis();
    const analyzerIndex = useIK ? 'zh_index' : 'zh_en_index';
    const analyzerSearch = useIK ? 'zh_search' : 'zh_en_search';
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
                ? {
                    pinyin: {
                      type: 'text',
                      analyzer: 'pinyin_analyzer',
                      search_analyzer: 'pinyin_analyzer',
                    },
                  }
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
                ? {
                    pinyin: {
                      type: 'text',
                      analyzer: 'pinyin_analyzer',
                      search_analyzer: 'pinyin_analyzer',
                    },
                  }
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
    };
  }

  private buildUsersIndexMapping() {
    const useIK = this.isIkEnabled();
    const usePinyin = this.isPinyinEnabled();
    const settings = this.buildCommonAnalysis();
    const analyzerIndex = useIK ? 'zh_index' : 'zh_en_index';
    const analyzerSearch = useIK ? 'zh_search' : 'zh_en_search';
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
                ? {
                    pinyin: {
                      type: 'text',
                      analyzer: 'pinyin_analyzer',
                      search_analyzer: 'pinyin_analyzer',
                    },
                  }
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
                ? {
                    pinyin: {
                      type: 'text',
                      analyzer: 'pinyin_analyzer',
                      search_analyzer: 'pinyin_analyzer',
                    },
                  }
                : {}),
            },
          },
          avatar: { type: 'keyword' },
          createdAt: { type: 'date' },
        },
      },
    };
  }

  // 对外：搜索模块（ModuleMeta）（优先 ES）
  async searchModules(
    q: string,
    limit = 20,
    offset = 0,
  ): Promise<{ total: number; items: SearchModuleItem[]; from: number }> {
    const query = (q || '').trim();
    if (!query) return { total: 0, items: [], from: 0 };
    try {
      const usePinyin = this.isPinyinEnabled();
      const fields = usePinyin
        ? [
            'name^3',
            'name.pinyin^3',
            'description^1',
            'description.pinyin^1',
            'code^2',
            'code.pinyin^2',
          ]
        : ['name^3', 'description^1', 'code^2'];
      const tokens = query.split(/\s+/).filter(Boolean);
      const res = await this.es.search({
        index: SearchService.MODULES_INDEX,
        from: Math.max(0, Number(offset) || 0),
        size: Math.max(1, Math.min(50, Number(limit) || 20)),
        track_total_hits: true,
        query: {
          multi_match: {
            query,
            fields,
            type: 'best_fields',
            minimum_should_match: tokens.length >= 2 ? '75%' : undefined,
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
      });
      const body = toSearchResponse<ModuleIndexDoc>(res);
      const hits = body?.hits?.hits ?? [];
      return {
        total:
          typeof body?.hits?.total === 'number'
            ? body.hits.total
            : (body?.hits?.total?.value ?? hits.length),
        from: 0,
        items: hits.map((h) => {
          const src = (h?._source ?? {}) as Partial<ModuleIndexDoc>;
          const hl = h?.highlight ?? {};
          const firstString = (arr?: string[]): string | undefined =>
            Array.isArray(arr) ? arr[0] : undefined;
          return {
            id: Number(src.id ?? 0),
            code: typeof src.code === 'string' ? src.code : '',
            name: typeof src.name === 'string' ? src.name : '',
            description:
              typeof src.description === 'string' ? src.description : '',
            status: typeof src.status === 'string' ? src.status : '',
            version:
              typeof src.version === 'string'
                ? src.version
                : src.version == null
                  ? null
                  : null,
            ownerRoles: Array.isArray(src.ownerRoles)
              ? src.ownerRoles.map((x) => String(x))
              : null,
            createdAt: Number(src.createdAt ?? Date.now()),
            nameHighlight: firstString(hl['name'] as string[] | undefined),
            descriptionHighlight: firstString(
              hl['description'] as string[] | undefined,
            ),
            codeHighlight: firstString(hl['code'] as string[] | undefined),
          } as SearchModuleItem;
        }),
      };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger.error('Elasticsearch searchModules failed', err);
      return { total: 0, items: [], from: 0 };
    }
  }

  // 索引单个模块（新增/更新）
  async indexModule(moduleId: number): Promise<void> {
    try {
      const m = await this.moduleMetaService.findOne(moduleId);
      if (!m) return;
      // 统一毫秒时间并移除不必要断言
      const normTime = (v: unknown): number => {
        if (v instanceof Date) return v.getTime();
        const n = typeof v === 'number' ? v : Number(v);
        if (!Number.isFinite(n) || n <= 0) return Date.now();
        return n < 1e12 ? Math.round(n * 1000) : Math.round(n);
      };
      const createdAt = normTime(m.createdAt);
      await this.es.index({
        index: SearchService.MODULES_INDEX,
        id: String(m.id),
        document: {
          id: Number(m.id || 0),
          code: String(m.code || ''),
          name: String(m.name || ''),
          description: typeof m.description === 'string' ? m.description : '',
          status: String(m.status || ''),
          version:
            typeof m.version === 'string' && m.version ? m.version : null,
          ownerRoles: Array.isArray(m.ownerRoles)
            ? (m.ownerRoles ?? []).map((x) => String(x))
            : null,
          createdAt: Number(createdAt),
        },
        refresh: true,
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.logger.error(`indexModule failed for ${moduleId}`, err);
    }
  }

  async removeModuleIndex(moduleId: number): Promise<void> {
    try {
      await this.es.delete({
        index: SearchService.MODULES_INDEX,
        id: String(moduleId),
      });
    } catch (e) {
      const eObj =
        e && typeof e === 'object' ? (e as Record<string, unknown>) : {};
      const body = eObj['body'];
      const result =
        body && typeof body === 'object'
          ? (body as Record<string, unknown>)['result']
          : undefined;
      if (result !== 'not_found') {
        const err = e instanceof Error ? e : new Error(String(e));
        this.logger.error(`Failed to remove module index ${moduleId}`, err);
      }
    }
  }

  private buildModulesIndexMapping() {
    const useIK = this.isIkEnabled();
    const usePinyin = this.isPinyinEnabled();
    const settings = this.buildCommonAnalysis();
    const analyzerIndex = useIK ? 'zh_index' : 'zh_en_index';
    const analyzerSearch = useIK ? 'zh_search' : 'zh_en_search';
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
              ...(usePinyin
                ? {
                    pinyin: {
                      type: 'text',
                      analyzer: 'pinyin_analyzer',
                      search_analyzer: 'pinyin_analyzer',
                    },
                  }
                : {}),
            },
          },
          name: {
            type: 'text',
            analyzer: analyzerIndex,
            search_analyzer: analyzerSearch,
            fields: {
              keyword: { type: 'keyword' },
              ...(usePinyin
                ? {
                    pinyin: {
                      type: 'text',
                      analyzer: 'pinyin_analyzer',
                      search_analyzer: 'pinyin_analyzer',
                    },
                  }
                : {}),
            },
          },
          description: {
            type: 'text',
            analyzer: analyzerIndex,
            search_analyzer: analyzerSearch,
            fields: {
              keyword: { type: 'keyword' },
              ...(usePinyin
                ? {
                    pinyin: {
                      type: 'text',
                      analyzer: 'pinyin_analyzer',
                      search_analyzer: 'pinyin_analyzer',
                    },
                  }
                : {}),
            },
          },
          status: { type: 'keyword' },
          version: { type: 'keyword' },
          ownerRoles: { type: 'keyword' },
          createdAt: { type: 'date' },
        },
      },
    };
  }
}
