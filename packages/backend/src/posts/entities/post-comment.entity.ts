import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, Column, Index } from 'typeorm'
import { PostEntity } from './post.entity'
import { User } from '../../user/user.entity'

@Entity('post_comments')
export class PostComment {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => PostEntity, { onDelete: 'CASCADE' })
  @Index()
  post!: PostEntity

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @Index()
  author!: User

  @Column({ type: 'text' })
  content!: string

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date

  @ManyToOne(() => PostComment, { nullable: true, onDelete: 'CASCADE' })
  @Index()
  parent?: PostComment | null

  // 回复的目标用户（顶级评论默认指向帖子作者；回复评论指向父评论作者）
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @Index()
  replyTo?: User | null
}