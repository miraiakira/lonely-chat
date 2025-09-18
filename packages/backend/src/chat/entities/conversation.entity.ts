import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { User } from '../../user/user.entity'
import { Message } from './message.entity'

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ default: false })
  isGroup!: boolean

  @Column({ type: 'boolean', default: false })
  isPublic!: boolean

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar!: string | null

  // Unidirectional ManyToMany with JoinTable on Conversation side
  @ManyToMany(() => User, { cascade: false })
  @JoinTable({ name: 'conversation_participants' })
  participants!: User[]

  @OneToMany(() => Message, (m) => m.conversation)
  messages!: Message[]

  @Column({ type: 'timestamptz', nullable: true })
  lastMessageAt!: Date | null

  // 新增：会话治理字段
  @Column({ type: 'boolean', default: false })
  isLocked!: boolean

  @Column({ type: 'varchar', length: 1000, nullable: true })
  notice!: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date
}