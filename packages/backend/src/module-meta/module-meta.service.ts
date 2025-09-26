import { Injectable, Inject, forwardRef } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, ILike } from 'typeorm'
import { ModuleMeta } from './module-meta.entity'
import { CreateModuleMetaDto } from './dto/create-module-meta.dto'
import { UpdateModuleMetaDto } from './dto/update-module-meta.dto'
import { SearchService } from '../search/search.service'

@Injectable()
export class ModuleMetaService {
  constructor(
    @InjectRepository(ModuleMeta)
    private readonly repo: Repository<ModuleMeta>,
    @Inject(forwardRef(() => SearchService))
    private readonly searchService: SearchService,
  ) {}

  async create(dto: CreateModuleMetaDto): Promise<ModuleMeta> {
    const entity = this.repo.create({
      code: dto.code.trim(),
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      status: dto.status || 'enabled',
      version: dto.version?.trim() || null,
      ownerRoles: dto.ownerRoles || null,
    })
    const saved = await this.repo.save(entity)
    await this.searchService.indexModule(saved.id).catch(() => void 0)
    return saved
  }

  async update(id: number, dto: UpdateModuleMetaDto): Promise<ModuleMeta> {
    const entity = await this.repo.findOne({ where: { id } })
    if (!entity) throw new Error('ModuleMeta not found')
    Object.assign(entity, dto)
    const saved = await this.repo.save(entity)
    await this.searchService.indexModule(saved.id).catch(() => void 0)
    return saved
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id)
    await this.searchService.removeModuleIndex(id).catch(() => void 0)
  }

  async findOne(id: number): Promise<ModuleMeta | null> {
    return this.repo.findOne({ where: { id } })
  }

  async findAll(): Promise<ModuleMeta[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } })
  }

  async search(q: string, limit = 20, offset = 0): Promise<{ total: number; items: ModuleMeta[]; from: number }>{
    const query = (q || '').trim()
    if (!query) return { total: 0, items: [], from: 0 }
    const [items, total] = await this.repo.findAndCount({
      where: [
        { name: ILike(`%${query}%`) },
        { description: ILike(`%${query}%`) },
        { code: ILike(`%${query}%`) },
      ],
      order: { createdAt: 'DESC' },
      take: Math.max(1, Math.min(50, Number(limit) || 20)),
      skip: Math.max(0, Number(offset) || 0),
    })
    return { total, items, from: offset }
  }

  // 供 SearchService 批量索引用
  async getAllForIndexing(): Promise<Array<Pick<ModuleMeta, 'id' | 'code' | 'name' | 'description' | 'status' | 'version' | 'ownerRoles' | 'createdAt'>>> {
    return this.repo.find({ select: ['id', 'code', 'name', 'description', 'status', 'version', 'ownerRoles', 'createdAt'], order: { id: 'ASC' } }) as any
  }
}