import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class UserProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, nullable: true })
  nickname: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  gender: string;

  @Column('text', { nullable: true })
  bio: string;

  @OneToOne(() => User, user => user.profile)
  @JoinColumn()
  user: User;
}