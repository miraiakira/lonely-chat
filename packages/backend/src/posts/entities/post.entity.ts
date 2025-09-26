import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm'
import { User } from '../../user/user.entity'

@Entity('posts')
export class PostEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => User, { eager: true })
  author!: User

  @Column({ type: 'text', default: '' })
  content!: string

  @Column({ type: 'jsonb', nullable: true })
  images?: string[] | null

  @Column({ type: 'boolean', default: false })
  @Index()
  isHidden!: boolean

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date
}