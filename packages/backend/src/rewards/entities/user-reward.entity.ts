import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { User } from '../../user/user.entity'

@Entity('user_rewards')
export class UserReward {
  @PrimaryGeneratedColumn()
  id!: number

  @OneToOne(() => User, { eager: true })
  @JoinColumn()
  user!: User

  @Column({ type: 'int', default: 0 })
  totalPoints!: number

  @Column({ type: 'int', default: 0 })
  streak!: number

  // YYYY-MM-DD (UTC)
  @Column({ type: 'varchar', length: 16, nullable: true })
  lastCheckinDate!: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date
}