import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(role: Partial<Role>): Promise<Role> {
    const existingRole = await this.roleRepository.findOne({ where: { name: role.name } });
    if (existingRole) {
      return existingRole;
    }
    return this.roleRepository.save(role);
  }

  async findAll(): Promise<Role[]> {
    return this.roleRepository.find();
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }
    return role;
  }

  async update(id: number, role: Partial<Role>): Promise<Role> {
    await this.roleRepository.update(id, role);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.roleRepository.delete(id);
  }

  async assignPermissions(roleId: number, permissionIds: number[]): Promise<Role> {
    const role = await this.findOne(roleId);
    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }
    const permissions = await this.permissionRepository.findBy({ id: In(permissionIds) });
    role.permissions = permissions;
    return this.roleRepository.save(role);
  }
}