import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { ModuleMetaService } from './module-meta.service'
import { CreateModuleMetaDto } from './dto/create-module-meta.dto'
import { UpdateModuleMetaDto } from './dto/update-module-meta.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { Permissions } from '../auth/decorators/permissions.decorator'

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('module-meta')
export class ModuleMetaController {
  constructor(private readonly service: ModuleMetaService) {}

  @Post()
  @Permissions('module:manage')
  async create(@Body() dto: CreateModuleMetaDto) {
    return this.service.create(dto)
  }

  @Put(':id')
  @Permissions('module:manage')
  async update(@Param('id') id: string, @Body() dto: UpdateModuleMetaDto) {
    return this.service.update(Number(id), dto)
  }

  @Delete(':id')
  @Permissions('module:manage')
  async remove(@Param('id') id: string) {
    await this.service.remove(Number(id))
    return { ok: true }
  }

  @Get(':id')
  @Permissions('module:read')
  async getOne(@Param('id') id: string) {
    return this.service.findOne(Number(id))
  }

  @Get()
  @Permissions('module:read')
  async getAll() {
    return this.service.findAll()
  }

  @Get('search')
  @Permissions('module:read')
  async search(@Query('q') q: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const l = limit ? Number(limit) : 20
    const o = offset ? Number(offset) : 0
    return this.service.search(q, l, o)
  }
}