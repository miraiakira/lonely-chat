import { Entity, PrimaryGeneratedColumn, ManyToOne, Unique, CreateDateColumn } from 'typeorm'
import { User } from '../user/user.entity'

// 存储无向好友关系，约束 userA.id < userB.id 以避免重复
@Entity('friends')
@Unique(['userA', 'userB'])
export class FriendRelation {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  userA!: User

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  userB!: User

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date
}