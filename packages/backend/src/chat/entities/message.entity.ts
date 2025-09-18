import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Index } from 'typeorm'
import { Conversation } from './conversation.entity'
import { User } from '../../user/user.entity'

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => Conversation, (c) => c.messages, { onDelete: 'CASCADE', eager: false })
  conversation!: Conversation

  @ManyToOne(() => User, { eager: true })
  sender!: User

  @Column({ type: 'text' })
  content!: string

  // 可选：图片数组（用于动态的图片内容）
  @Column({ type: 'jsonb', nullable: true })
  images?: string[] | null

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  createdAt!: Date

  // 新增：软删除字段
  @Column({ type: 'timestamptz', nullable: true })
  @Index()
  deletedAt!: Date | null

  @ManyToOne(() => User, { nullable: true, eager: false })
  deletedBy!: User | null
}