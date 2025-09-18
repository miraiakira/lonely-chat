import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, Unique, Index } from 'typeorm'
import { PostEntity } from './post.entity'
import { User } from '../../user/user.entity'

@Entity('post_likes')
@Unique(['post', 'user'])
export class PostLike {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => PostEntity, { onDelete: 'CASCADE' })
  @Index()
  post!: PostEntity

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @Index()
  user!: User

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date
}