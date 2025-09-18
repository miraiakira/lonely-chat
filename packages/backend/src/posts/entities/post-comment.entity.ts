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
}