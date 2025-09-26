import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ModuleMeta } from './module-meta.entity'
import { ModuleMetaService } from './module-meta.service'
import { ModuleMetaController } from './module-meta.controller'
import { SearchModule } from '../search/search.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([ModuleMeta]),
    forwardRef(() => SearchModule),
  ],
  controllers: [ModuleMetaController],
  providers: [ModuleMetaService],
  exports: [ModuleMetaService],
})
export class ModuleMetaModule {}