import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';

@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async create(permission: Partial<Permission>): Promise<Permission> {
    const existingPermission = await this.permissionRepository.findOne({ where: { name: permission.name } });
    if (existingPermission) {
      return existingPermission;
    }
    return this.permissionRepository.save(permission);
  }

  async findAll(): Promise<Permission[]> {
    return this.permissionRepository.find();
  }

  async findOne(id: number): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({ where: { id } });
    if (!permission) {
      throw new NotFoundException(`Permission with ID ${id} not found`);
    }
    return permission;
  }

  async update(id: number, permission: Partial<Permission>): Promise<Permission> {
    await this.permissionRepository.update(id, permission);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.permissionRepository.delete(id);
  }
}