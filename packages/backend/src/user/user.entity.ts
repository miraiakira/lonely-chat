import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { Role } from '../auth/entities/role.entity';
import * as bcrypt from 'bcrypt';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @ManyToMany(() => Role, (role) => role.users, { cascade: true })
  @JoinTable()
  roles: Role[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => UserProfile, profile => profile.user, { cascade: true })
  profile: UserProfile;

  // 新增：刷新令牌哈希，用于服务端验证与失效
  @Column({ type: 'text', nullable: true })
  hashedRefreshToken: string | null;

  // 新增：禁言与封禁字段
  @Column({ type: 'timestamptz', nullable: true })
  mutedUntil: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  bannedUntil: Date | null;

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
}