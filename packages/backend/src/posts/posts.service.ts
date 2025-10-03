import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostEntity } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { User } from '../user/user.entity';
import { PostLike } from './entities/post-like.entity';
import { PostComment } from './entities/post-comment.entity';
import { CreateCommentDto } from './dto/create-comment.dto';
import { SearchService } from '../search/search.service';
import type { PostIndexDoc } from '../search/es.types';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(PostEntity)
    private readonly postRepo: Repository<PostEntity>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PostLike) private readonly likeRepo: Repository<PostLike>,
    @InjectRepository(PostComment)
    private readonly commentRepo: Repository<PostComment>,
    @Inject(forwardRef(() => SearchService))
    private readonly searchService: SearchService,
  ) {}

  async list(
    limit = 50,
    offset = 0,
    currentUserId?: number,
    includeHidden?: boolean,
  ) {
    const take = Math.max(1, Math.min(100, Number(limit) || 50));
    const skip = Math.max(0, Number(offset) || 0);

    let isAdmin = false;
    if (includeHidden && currentUserId) {
      const user = await this.userRepo.findOne({
        where: { id: currentUserId },
        relations: ['roles'],
      });
      isAdmin =
        !!user &&
        Array.isArray(user.roles) &&
        user.roles.some((r) => r.name === 'admin');
    }

    const [items, total] = await this.postRepo.findAndCount({
      ...(!includeHidden || !isAdmin ? { where: { isHidden: false } } : {}),
      order: { createdAt: 'DESC' },
      take,
      skip,
      relations: ['author', 'author.profile'],
    });

    // 统计点赞数与是否点赞
    const postIds = items.map((p) => p.id);
    const likeCounts: Record<number, number> = {};
    if (postIds.length > 0) {
      const rows = await this.likeRepo
        .createQueryBuilder('l')
        .select('l.postId', 'postId')
        .addSelect('COUNT(1)', 'cnt')
        .where('l.postId IN (:...ids)', { ids: postIds })
        .groupBy('l.postId')
        .getRawMany<{ postId: number; cnt: string }>();
      for (const r of rows) likeCounts[r.postId] = Number(r.cnt);
    }

    // 统计评论数
    const commentCounts: Record<number, number> = {};
    if (postIds.length > 0) {
      const rows = await this.commentRepo
        .createQueryBuilder('c')
        .select('c.postId', 'postId')
        .addSelect('COUNT(1)', 'cnt')
        .where('c.postId IN (:...ids)', { ids: postIds })
        .groupBy('c.postId')
        .getRawMany<{ postId: number; cnt: string }>();
      for (const r of rows) commentCounts[r.postId] = Number(r.cnt);
    }

    let likedByMeSet = new Set<number>();
    if (currentUserId && postIds.length > 0) {
      // 使用 queryBuilder 进行 IN 查询，避免不正确的数组等值比较导致数据库错误
      const likedRows = await this.likeRepo
        .createQueryBuilder('l')
        .select('l.postId', 'postId')
        .where('l.userId = :uid', { uid: currentUserId })
        .andWhere('l.postId IN (:...ids)', { ids: postIds })
        .getRawMany<{ postId: number }>();
      likedByMeSet = new Set(likedRows.map((r) => r.postId));
    }

    return {
      total,
      items: items.map((p) => ({
        id: String(p.id),
        authorId: String(p.author?.id),
        authorName: p.author?.profile?.nickname || p.author?.username,
        authorAvatar: p.author?.profile?.avatar || null,
        content: p.content,
        images: p.images || null,
        createdAt: p.createdAt.getTime(),
        likeCount: likeCounts[p.id] || 0,
        likedByMe: currentUserId ? likedByMeSet.has(p.id) : false,
        commentCount: commentCounts[p.id] || 0,
        isHidden: !!p.isHidden,
      })),
    };
  }

  // 基于数据库的帖子搜索（用于 ES 故障降级）
  async searchPostsByContent(
    q: string,
    limit = 20,
    offset = 0,
  ): Promise<{
    total: number;
    items: {
      id: number;
      content: string;
      authorId: number;
      authorUsername: string;
      images: string[] | null;
      likeCount: number;
      commentCount: number;
      createdAt: number;
    }[];
    from: number;
  }> {
    const query = (q || '').trim();
    if (!query) return { total: 0, items: [], from: 0 };

    const take = Math.max(1, Math.min(50, Number(limit) || 20));
    const skip = Math.max(0, Number(offset) || 0);

    const qb = this.postRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.author', 'author')
      .leftJoinAndSelect('author.profile', 'profile')
      .where('p.content ILIKE :q', { q: `%${query}%` })
      .andWhere('p.isHidden = false')
      .orderBy('p.createdAt', 'DESC')
      .take(take)
      .skip(skip);

    const [items, total] = await qb.getManyAndCount();

    // 统计点赞数与评论数
    const postIds = items.map((p) => p.id);

    const likeCounts: Record<number, number> = {};
    if (postIds.length > 0) {
      const rows = await this.likeRepo
        .createQueryBuilder('l')
        .select('l.postId', 'postId')
        .addSelect('COUNT(1)', 'cnt')
        .where('l.postId IN (:...ids)', { ids: postIds })
        .groupBy('l.postId')
        .getRawMany<{ postId: number; cnt: string }>();
      for (const r of rows) likeCounts[r.postId] = Number(r.cnt);
    }

    const commentCounts: Record<number, number> = {};
    if (postIds.length > 0) {
      const rows = await this.commentRepo
        .createQueryBuilder('c')
        .select('c.postId', 'postId')
        .addSelect('COUNT(1)', 'cnt')
        .where('c.postId IN (:...ids)', { ids: postIds })
        .groupBy('c.postId')
        .getRawMany<{ postId: number; cnt: string }>();
      for (const r of rows) commentCounts[r.postId] = Number(r.cnt);
    }

    return {
      total,
      from: skip,
      items: items.map((p) => ({
        id: p.id,
        content: p.content,
        authorId: p.author?.id || 0,
        authorUsername: p.author?.profile?.nickname || p.author?.username || '',
        images: p.images || null,
        likeCount: likeCounts[p.id] || 0,
        commentCount: commentCounts[p.id] || 0,
        createdAt: p.createdAt.getTime(),
      })),
    };
  }

  async create(authorId: number, dto: CreatePostDto) {
    const author = await this.userRepo.findOne({
      where: { id: authorId },
      relations: ['profile'],
    });
    if (!author) throw new NotFoundException('Author not found');
    const entity = this.postRepo.create({
      author,
      content: dto.content ?? '',
      images: dto.images && dto.images.length > 0 ? dto.images : null,
    });
    const saved = await this.postRepo.save(entity);
    // 异步：索引到 ES
    this.searchService
      .indexPostDocument({
        id: saved.id,
        content: saved.content,
        authorId: author.id,
        authorUsername: author.profile?.nickname || author.username,
        images: saved.images || null,
        likesCount: 0,
        commentsCount: 0,
        createdAt: saved.createdAt.getTime(),
      })
      .catch(() => void 0);
    return {
      id: String(saved.id),
      authorId: String(author.id),
      authorName: author.profile?.nickname || author.username,
      authorAvatar: author.profile?.avatar || null,
      content: saved.content,
      images: saved.images || null,
      createdAt: saved.createdAt.getTime(),
      likeCount: 0,
      likedByMe: false,
    };
  }

  async like(userId: number, postId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!user || !post) throw new NotFoundException('Not found');
    if (post.isHidden) throw new ForbiddenException('Post is hidden');
    const existing = await this.likeRepo.findOne({
      where: { user: { id: user.id }, post: { id: post.id } },
    });
    if (existing) return { ok: true };
    const like = this.likeRepo.create({ user, post });
    await this.likeRepo.save(like);
    // 重新统计点赞数并更新 ES
    const [{ cnt }] = await this.likeRepo
      .createQueryBuilder('l')
      .select('COUNT(1)', 'cnt')
      .where('l.postId = :pid', { pid: post.id })
      .getRawMany<{ cnt: string }>();
    this.searchService
      .updatePostCounts(post.id, Number(cnt), undefined)
      .catch(() => void 0);
    return { ok: true };
  }

  async unlike(userId: number, postId: number) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    await this.likeRepo
      .createQueryBuilder()
      .delete()
      .where('userId = :uid AND postId = :pid', { uid: userId, pid: postId })
      .execute();
    // 重新统计点赞数并更新 ES
    const [{ cnt }] = await this.likeRepo
      .createQueryBuilder('l')
      .select('COUNT(1)', 'cnt')
      .where('l.postId = :pid', { pid: postId })
      .getRawMany<{ cnt: string }>();
    this.searchService
      .updatePostCounts(postId, Number(cnt), undefined)
      .catch(() => void 0);
    return { ok: true };
  }

  async addComment(userId: number, postId: number, dto: CreateCommentDto) {
    const author = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['profile'],
    });
    const post = await this.postRepo.findOne({
      where: { id: postId },
      relations: ['author', 'author.profile'],
    });
    if (!author || !post) throw new NotFoundException('Not found');
    if (post.isHidden) throw new ForbiddenException('Post is hidden');
    let parent: PostComment | null = null;
    if (dto.parentCommentId) {
      parent = await this.commentRepo.findOne({
        where: { id: dto.parentCommentId },
        relations: ['post', 'author', 'author.profile'],
      });
      if (!parent || parent.post?.id !== postId) {
        throw new NotFoundException('Parent comment not found');
      }
    }
    const c = this.commentRepo.create({
      author,
      post,
      content: dto.content,
      parent: parent || null,
      replyTo: parent ? parent.author : post.author || null,
    });
    const saved = await this.commentRepo.save(c);
    // 重新统计评论数并更新 ES
    const [{ cnt }] = await this.commentRepo
      .createQueryBuilder('c')
      .select('COUNT(1)', 'cnt')
      .where('c.postId = :pid', { pid: postId })
      .getRawMany<{ cnt: string }>();
    this.searchService
      .updatePostCounts(postId, undefined, Number(cnt))
      .catch(() => void 0);
    return {
      id: String(saved.id),
      postId: String(post.id),
      authorId: String(author.id),
      authorName: author.profile?.nickname || author.username,
      authorAvatar: author.profile?.avatar || null,
      content: saved.content,
      createdAt: saved.createdAt.getTime(),
      // reply info
      parentCommentId: parent ? String(parent.id) : undefined,
      parentAuthorId: parent ? String(parent.author?.id) : undefined,
      parentAuthorName: parent
        ? parent.author?.profile?.nickname || parent.author?.username
        : undefined,
    };
  }

  async listComments(postId: number, limit = 50, offset = 0) {
    const take = Math.max(1, Math.min(100, Number(limit) || 50));
    const skip = Math.max(0, Number(offset) || 0);
    const [items, total] = await this.commentRepo.findAndCount({
      where: { post: { id: postId } },
      order: { createdAt: 'ASC' },
      take,
      skip,
      relations: [
        'author',
        'author.profile',
        'parent',
        'parent.author',
        'parent.author.profile',
      ],
    });
    return {
      total,
      items: items.map((c) => ({
        id: String(c.id),
        postId: String(postId),
        authorId: String(c.author?.id),
        authorName: c.author?.profile?.nickname || c.author?.username,
        authorAvatar: c.author?.profile?.avatar || null,
        content: c.content,
        createdAt: c.createdAt.getTime(),
        parentCommentId: c.parent ? String(c.parent.id) : undefined,
        parentAuthorId: c.parent ? String(c.parent.author?.id) : undefined,
        parentAuthorName: c.parent
          ? c.parent.author?.profile?.nickname || c.parent.author?.username
          : undefined,
      })),
    };
  }

  async remove(userId: number, postId: number) {
    const post = await this.postRepo.findOne({
      where: { id: postId },
      relations: ['author'],
    });
    if (!post) throw new NotFoundException('Post not found');

    // Load the requesting user's roles to determine admin permission
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('User not found');

    const isOwner = post.author?.id === userId;
    const isAdmin =
      Array.isArray(user.roles) && user.roles.some((r) => r.name === 'admin');
    if (!isOwner && !isAdmin) throw new ForbiddenException('No permission');

    await this.postRepo.delete({ id: postId });
    // 删除 ES 索引文档
    this.searchService.removePostIndex(postId).catch(() => void 0);
    return { ok: true };
  }
  // 提供给搜索重建：获取所有帖子 ID（避免暴露仓库）
  async getAllIdsForIndexing(): Promise<number[]> {
    const rows = await this.postRepo
      .createQueryBuilder('p')
      .select('p.id', 'id')
      .orderBy('p.id', 'ASC')
      .getRawMany<{ id: number }>();
    return rows.map((r) => Number(r.id));
  }
  // 根据 ID 获取用于索引的帖子摘要
  async getSummarizedPostById(postId: number): Promise<{
    id: number;
    authorId: number;
    authorName: string;
    content: string;
    images: string[] | null;
    likeCount: number;
    commentCount: number;
    createdAt: number;
  } | null> {
    const p = await this.postRepo.findOne({
      where: { id: postId },
      relations: ['author', 'author.profile'],
    });
    if (!p) return null;

    const [likeRow, commentRow] = await Promise.all([
      this.likeRepo
        .createQueryBuilder('l')
        .select('COUNT(1)', 'cnt')
        .where('l.postId = :pid', { pid: postId })
        .getRawOne<{ cnt: string }>(),
      this.commentRepo
        .createQueryBuilder('c')
        .select('COUNT(1)', 'cnt')
        .where('c.postId = :pid', { pid: postId })
        .getRawOne<{ cnt: string }>(),
    ]);

    return {
      id: p.id,
      authorId: p.author?.id || 0,
      authorName: p.author?.profile?.nickname || p.author?.username || '',
      content: p.content || '',
      images: p.images || null,
      likeCount: Number(likeRow?.cnt || 0),
      commentCount: Number(commentRow?.cnt || 0),
      createdAt: p.createdAt?.getTime?.() || Date.now(),
    };
  }

  // 为 ES 索引提供完整且严格类型的文档形状
  async getIndexPostDocById(postId: number): Promise<PostIndexDoc | null> {
    const summarized = await this.getSummarizedPostById(postId);
    if (!summarized) return null;
    const images = Array.isArray(summarized.images) ? summarized.images : null;
    return {
      id: Number(summarized.id),
      content: summarized.content ?? '',
      authorId: Number(summarized.authorId ?? 0),
      authorUsername: summarized.authorName ?? '',
      images,
      likesCount: Number(summarized.likeCount ?? 0),
      commentsCount: Number(summarized.commentCount ?? 0),
      createdAt: Number(summarized.createdAt ?? Date.now()),
    };
  }
  async setHidden(userId: number, postId: number, hidden: boolean) {
    const post = await this.postRepo.findOne({
      where: { id: postId },
      relations: ['author'],
    });
    if (!post) throw new NotFoundException('Post not found');

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('User not found');

    const isAdmin =
      Array.isArray(user.roles) && user.roles.some((r) => r.name === 'admin');
    if (!isAdmin) {
      throw new ForbiddenException('No permission');
    }

    post.isHidden = !!hidden;
    await this.postRepo.save(post);

    if (hidden) {
      this.searchService.removePostIndex(postId).catch(() => void 0);
    } else {
      const summarized = await this.getSummarizedPostById(postId);
      if (summarized) {
        await this.searchService
          .indexPostDocument({
            id: summarized.id,
            content: summarized.content,
            authorId: summarized.authorId,
            authorUsername: summarized.authorName,
            images: summarized.images,
            likesCount: summarized.likeCount,
            commentsCount: summarized.commentCount,
            createdAt: summarized.createdAt,
          })
          .catch(() => void 0);
      }
    }
    return { ok: true };
  }
}
