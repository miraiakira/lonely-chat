import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { RoleService } from './role.service';
import { Role } from './entities/role.entity';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { Permissions } from './decorators/permissions.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @Permissions('role:manage', 'manage_roles')
  create(@Body() role: Partial<Role>): Promise<Role> {
    return this.roleService.create(role);
  }

  @Get()
  @Permissions('role:read')
  findAll(): Promise<Role[]> {
    return this.roleService.findAll();
  }

  @Get(':id')
  @Permissions('role:read')
  findOne(@Param('id') id: string): Promise<Role> {
    return this.roleService.findOne(+id);
  }

  @Patch(':id')
  @Permissions('role:manage', 'manage_roles')
  update(@Param('id') id: string, @Body() role: Partial<Role>): Promise<Role> {
    return this.roleService.update(+id, role);
  }

  @Delete(':id')
  @Permissions('role:manage', 'manage_roles')
  remove(@Param('id') id: string): Promise<void> {
    return this.roleService.remove(+id);
  }

  @Post(':id/permissions')
  @Permissions('role:manage', 'manage_roles')
  assignPermissions(
    @Param('id') id: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ): Promise<Role> {
    return this.roleService.assignPermissions(+id, assignPermissionsDto.permissionIds);
  }
}