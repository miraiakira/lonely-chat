import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { Role } from '../auth/entities/role.entity';
import { UserProfile } from './user-profile.entity';
import { AssignRolesDto } from './dto/assign-roles.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
  ) {}

  async findOneByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username }, relations: ['roles', 'roles.permissions', 'profile'] });
  }
  async findOne(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id }, relations: ['roles', 'profile'] });
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      relations: ['roles', 'profile'],
    });
  }

  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id);
  }

  async update(id: number, updateUserDto: UpdateUserDto, updateUserProfileDto: UpdateUserProfileDto): Promise<User> {
    delete updateUserDto.password;
    delete (updateUserDto as any).username; // Prevent username from being updated

    const user = await this.findOne(id);
    if (!user) {
      throw new Error('User not found');
    }

    // Update user's main properties
    Object.assign(user, updateUserDto);

    // Update user's profile properties
    if (user.profile && updateUserProfileDto) {
      Object.assign(user.profile, updateUserProfileDto);
      await this.userProfileRepository.save(user.profile);
    }

    return this.userRepository.save(user);
  }

  async assignRoles(id: number, assignRolesDto: AssignRolesDto): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new Error('User not found');
    }

    const roles = await this.roleRepository.findBy({ id: In(assignRolesDto.roleIds) });
    user.roles = roles;

    return this.userRepository.save(user);
  }

  async create(createUserDto: CreateUserDto, roleNames?: string[]): Promise<User> {
    const profile = new UserProfile();
    const user = this.userRepository.create({
      ...createUserDto,
      profile,
    });

    if (roleNames && roleNames.length > 0) {
      const roles = await this.roleRepository.createQueryBuilder('role').where('role.name IN (:...roleNames)', { roleNames }).getMany();
      user.roles = roles;
    } else {
      const defaultRole = await this.roleRepository.findOne({ where: { name: 'user' } });
      if (defaultRole) {
        user.roles = [defaultRole];
      }
    }

    await this.userProfileRepository.save(profile);
    return this.userRepository.save(user);
  }

  // 新增：查询最近注册的用户
  async findRecent(limit = 5): Promise<User[]> {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .orderBy('user.createdAt', 'DESC')
      .take(limit)
      .getMany();
  }

  // 新增：保存/清除刷新令牌哈希
  async setRefreshTokenHash(userId: number, hash: string): Promise<void> {
    await this.userRepository.update({ id: userId }, { hashedRefreshToken: hash });
  }

  async clearRefreshTokenHash(userId: number): Promise<void> {
    await this.userRepository.update({ id: userId }, { hashedRefreshToken: null });
  }

  // 新增：按用户名或昵称搜索用户（仅返回基础信息）
  async searchUsers(q: string, limit = 20): Promise<User[]> {
    const query = (q || '').trim()
    if (!query) return []
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.username ILIKE :q', { q: `%${query}%` })
      .orWhere('profile.nickname ILIKE :q', { q: `%${query}%` })
      .orderBy('user.createdAt', 'DESC')
      .take(Math.max(1, Math.min(50, limit)))
      .getMany()
  }
}
