import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, Column, Index } from 'typeorm'
import { User } from '../user/user.entity'

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled'

@Entity('friend_requests')
export class FriendRequest {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  fromUser!: User

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  toUser!: User

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status!: FriendRequestStatus

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date
}