import { Controller, Post, Body, Get, UseGuards, Delete, Param, Patch } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('admin')
  createAdmin(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto, ['admin']);
  }

  @Post('register')
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
    findAll() {
    return this.userService.findAll();
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
    remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() body: { user: UpdateUserDto, profile: UpdateUserProfileDto }) {
    return this.userService.update(+id, body.user, body.profile);
  }

  @Post(':id/roles')
  @UseGuards(JwtAuthGuard)
  assignRoles(@Param('id') id: string, @Body() assignRolesDto: AssignRolesDto) {
    return this.userService.assignRoles(+id, assignRolesDto);
  }

  @Get('protected')
  @Roles('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  protectedResource() {
    return 'This is a protected resource';
  }
}
