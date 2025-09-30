import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Column, Index, RelationId, JoinColumn } from 'typeorm'
import { User } from '../../user/user.entity'

@Entity('user_checkins')
@Index(['user', 'checkinDate'], { unique: true })
export class UserCheckin {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => User, { eager: true })
  @JoinColumn()
  user!: User

  @RelationId((c: UserCheckin) => c.user)
  userId!: number

  // YYYY-MM-DD (UTC)
  @Column({ type: 'varchar', length: 16 })
  checkinDate!: string

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date
}