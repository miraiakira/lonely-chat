import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PostEntity } from './entities/post.entity'
import { CreatePostDto } from './dto/create-post.dto'
import { User } from '../user/user.entity'
import { PostLike } from './entities/post-like.entity'
import { PostComment } from './entities/post-comment.entity'
import { CreateCommentDto } from './dto/create-comment.dto'

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(PostEntity) private readonly postRepo: Repository<PostEntity>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PostLike) private readonly likeRepo: Repository<PostLike>,
    @InjectRepository(PostComment) private readonly commentRepo: Repository<PostComment>,
  ) {}

  async list(limit = 50, offset = 0, currentUserId?: number) {
    const take = Math.max(1, Math.min(100, Number(limit) || 50))
    const skip = Math.max(0, Number(offset) || 0)

    const [items, total] = await this.postRepo.findAndCount({
      order: { createdAt: 'DESC' },
      take,
      skip,
      relations: ['author', 'author.profile'],
    })

    // 统计点赞数与是否点赞
    const postIds = items.map((p) => p.id)
    const likeCounts: Record<number, number> = {}
    if (postIds.length > 0) {
      const rows = await this.likeRepo
        .createQueryBuilder('l')
        .select('l.postId', 'postId')
        .addSelect('COUNT(1)', 'cnt')
        .where('l.postId IN (:...ids)', { ids: postIds })
        .groupBy('l.postId')
        .getRawMany<{ postId: number; cnt: string }>()
      for (const r of rows) likeCounts[r.postId] = Number(r.cnt)
    }

    // 统计评论数
    const commentCounts: Record<number, number> = {}
    if (postIds.length > 0) {
      const rows = await this.commentRepo
        .createQueryBuilder('c')
        .select('c.postId', 'postId')
        .addSelect('COUNT(1)', 'cnt')
        .where('c.postId IN (:...ids)', { ids: postIds })
        .groupBy('c.postId')
        .getRawMany<{ postId: number; cnt: string }>()
      for (const r of rows) commentCounts[r.postId] = Number(r.cnt)
    }

    let likedByMeSet = new Set<number>()
    if (currentUserId && postIds.length > 0) {
    // 使用 queryBuilder 进行 IN 查询，避免不正确的数组等值比较导致数据库错误
       const likedRows = await this.likeRepo
         .createQueryBuilder('l')
         .select('l.postId', 'postId')
         .where('l.userId = :uid', { uid: currentUserId })
         .andWhere('l.postId IN (:...ids)', { ids: postIds })
         .getRawMany<{ postId: number }>()
       likedByMeSet = new Set(likedRows.map((r) => r.postId))
     }

    return {
      total,
      items: items.map((p) => ({
        id: String(p.id),
        authorId: String(p.author?.id),
        authorName: (p as any)?.author?.profile?.nickname || p.author?.username,
        authorAvatar: (p as any)?.author?.profile?.avatar || null,
        content: p.content,
        images: p.images || null,
        createdAt: p.createdAt.getTime(),
        likeCount: likeCounts[p.id] || 0,
        likedByMe: currentUserId ? likedByMeSet.has(p.id) : false,
        commentCount: commentCounts[p.id] || 0,
      })),
    }
  }

  async create(authorId: number, dto: CreatePostDto) {
    const author = await this.userRepo.findOne({ where: { id: authorId }, relations: ['profile'] })
    if (!author) throw new NotFoundException('Author not found')
    const entity = this.postRepo.create({
      author,
      content: dto.content ?? '',
      images: (dto.images && dto.images.length > 0) ? dto.images : null,
    })
    const saved = await this.postRepo.save(entity)
    return {
      id: String(saved.id),
      authorId: String(author.id),
      authorName: (author as any)?.profile?.nickname || author.username,
      authorAvatar: (author as any)?.profile?.avatar || null,
      content: saved.content,
      images: saved.images || null,
      createdAt: saved.createdAt.getTime(),
      likeCount: 0,
      likedByMe: false,
    }
  }

  async like(userId: number, postId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    const post = await this.postRepo.findOne({ where: { id: postId } })
    if (!user || !post) throw new NotFoundException('Not found')
    const existing = await this.likeRepo.findOne({ where: { user: { id: user.id } as any, post: { id: post.id } as any } })
    if (existing) return { ok: true }
    const like = this.likeRepo.create({ user, post })
    await this.likeRepo.save(like)
    return { ok: true }
  }

  async unlike(userId: number, postId: number) {
    const post = await this.postRepo.findOne({ where: { id: postId } })
    if (!post) throw new NotFoundException('Post not found')
    await this.likeRepo
      .createQueryBuilder()
      .delete()
      .where('userId = :uid AND postId = :pid', { uid: userId, pid: postId })
      .execute()
    return { ok: true }
  }

  async addComment(userId: number, postId: number, dto: CreateCommentDto) {
    const author = await this.userRepo.findOne({ where: { id: userId }, relations: ['profile'] })
    const post = await this.postRepo.findOne({ where: { id: postId } })
    if (!author || !post) throw new NotFoundException('Not found')
    const c = this.commentRepo.create({ author, post, content: dto.content })
    const saved = await this.commentRepo.save(c)
    return {
      id: String(saved.id),
      postId: String(post.id),
      authorId: String(author.id),
      authorName: (author as any)?.profile?.nickname || author.username,
      authorAvatar: (author as any)?.profile?.avatar || null,
      content: saved.content,
      createdAt: saved.createdAt.getTime(),
    }
  }

  async listComments(postId: number, limit = 50, offset = 0) {
    const take = Math.max(1, Math.min(100, Number(limit) || 50))
    const skip = Math.max(0, Number(offset) || 0)
    const [items, total] = await this.commentRepo.findAndCount({
      where: { post: { id: postId } as any },
      order: { createdAt: 'ASC' },
      take,
      skip,
      relations: ['author', 'author.profile'],
    })
    return {
      total,
      items: items.map((c) => ({
        id: String(c.id),
        postId: String(postId),
        authorId: String(c.author?.id),
        authorName: (c as any)?.author?.profile?.nickname || c.author?.username,
        authorAvatar: (c as any)?.author?.profile?.avatar || null,
        content: c.content,
        createdAt: c.createdAt.getTime(),
      })),
    }
  }

  async remove(userId: number, postId: number) {
    const post = await this.postRepo.findOne({ where: { id: postId }, relations: ['author'] })
    if (!post) throw new NotFoundException('Post not found')

    // Load the requesting user's roles to determine admin permission
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['roles'] })
    if (!user) throw new NotFoundException('User not found')

    const isOwner = post.author?.id === userId
    const isAdmin = (user as any)?.roles?.some?.((r: any) => r?.name === 'admin')
    if (!isOwner && !isAdmin) throw new ForbiddenException('No permission')

    await this.postRepo.delete({ id: postId })
    return { ok: true }
  }
}