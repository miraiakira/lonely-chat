import { Controller, Post, Body, Get, UseGuards, Delete, Param, Patch, Query } from '@nestjs/common'
import { Roles } from '../auth/decorators/roles.decorator'
import { RolesGuard } from '../auth/guards/roles.guard'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { UserService } from './user.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { UpdateUserProfileDto } from './dto/update-user-profile.dto'
import { AssignRolesDto } from './dto/assign-roles.dto'
import { Inject, NotFoundException } from '@nestjs/common'
import { REDIS_CLIENT } from '../redis/redis.module'
import { Permissions } from '../auth/decorators/permissions.decorator'
import { PermissionsGuard } from '../auth/guards/permissions.guard'

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(REDIS_CLIENT) private readonly redis: any,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:manage', 'manage_users')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto)
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:read')
  findAll() {
    return this.userService.findAll()
  }

  @Get('recent')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:read')
  findRecent(@Query('limit') limit?: string) {
    const take = Math.max(1, Math.min(20, Number(limit) || 5))
    return this.userService.findRecent(take)
  }

  @Get('recent-active')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:read')
  async findRecentActive(@Query('limit') limit?: string) {
    const take = Math.max(1, Math.min(50, Number(limit) || 20))
    // 从 Redis 取最近活跃的 userIds（倒序，分数为时间戳）
    const ids = await this.redis.zrevrange('recent:active_users', 0, take - 1)
    if (!ids.length) return []
    // 回表查用户详情并保持原顺序
    const users = await Promise.all(ids.map((id: string) => this.userService.findOne(Number(id))))
    return users.filter(Boolean)
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async search(@Query('q') q: string, @Query('limit') limit?: string) {
    const take = Math.max(1, Math.min(50, Number(limit) || 20))
    return this.userService.searchUsers(q, take)
  }

  // 新增：按用户名获取用户详情（含 profile）
  @Get('by-username/:username')
  @UseGuards(JwtAuthGuard)
  async findByUsername(@Param('username') username: string) {
    const user = await this.userService.findOneByUsername(username)
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:manage', 'manage_users')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:manage', 'manage_users')
  update(@Param('id') id: string, @Body() body: { user: UpdateUserDto; profile: UpdateUserProfileDto }) {
    return this.userService.update(+id, body.user, body.profile)
  }

  @Post(':id/roles')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:manage', 'manage_users')
  assignRoles(@Param('id') id: string, @Body() assignRolesDto: AssignRolesDto) {
    return this.userService.assignRoles(+id, assignRolesDto)
  }

  @Get('protected')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  protectedResource() {
    return 'This is a protected resource'
  }
}
