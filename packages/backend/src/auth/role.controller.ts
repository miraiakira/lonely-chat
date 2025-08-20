import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RoleService } from './role.service';
import { Role } from './entities/role.entity';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  create(@Body() role: Partial<Role>): Promise<Role> {
    return this.roleService.create(role);
  }

  @Get()
  findAll(): Promise<Role[]> {
    return this.roleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Role> {
    return this.roleService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() role: Partial<Role>): Promise<Role> {
    return this.roleService.update(+id, role);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.roleService.remove(+id);
  }

  @Post(':id/permissions')
  assignPermissions(
    @Param('id') id: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ): Promise<Role> {
    return this.roleService.assignPermissions(+id, assignPermissionsDto.permissionIds);
  }
}