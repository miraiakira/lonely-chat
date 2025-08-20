import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { Permission } from './permission.entity';
import { User } from '../../user/user.entity';

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Permission, { cascade: true, eager: true })
  @JoinTable()
  permissions: Permission[];

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];
}