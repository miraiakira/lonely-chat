import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { Permission } from './entities/permission.entity';

@Controller('permissions')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  create(@Body() permission: Partial<Permission>): Promise<Permission> {
    return this.permissionService.create(permission);
  }

  @Get()
  findAll(): Promise<Permission[]> {
    return this.permissionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Permission> {
    return this.permissionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() permission: Partial<Permission>): Promise<Permission> {
    return this.permissionService.update(+id, permission);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.permissionService.remove(+id);
  }
}