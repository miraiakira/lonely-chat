import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { Permission } from './entities/permission.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { Permissions } from './decorators/permissions.decorator';

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @Permissions('permission:manage', 'manage_permissions')
  create(@Body() permission: Partial<Permission>): Promise<Permission> {
    return this.permissionService.create(permission);
  }

  @Get()
  @Permissions('permission:read')
  findAll(): Promise<Permission[]> {
    return this.permissionService.findAll();
  }

  @Get(':id')
  @Permissions('permission:read')
  findOne(@Param('id') id: string): Promise<Permission> {
    return this.permissionService.findOne(+id);
  }

  @Patch(':id')
  @Permissions('permission:manage', 'manage_permissions')
  update(@Param('id') id: string, @Body() permission: Partial<Permission>): Promise<Permission> {
    return this.permissionService.update(+id, permission);
  }

  @Delete(':id')
  @Permissions('permission:manage', 'manage_permissions')
  remove(@Param('id') id: string): Promise<void> {
    return this.permissionService.remove(+id);
  }
}