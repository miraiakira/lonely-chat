import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { Menu } from './menu.entity';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Menu)
    private readonly menuRepository: TreeRepository<Menu>,
  ) {}

  create(createMenuDto: CreateMenuDto) {
    const menu = this.menuRepository.create(createMenuDto);
    return this.menuRepository.save(menu);
  }

  findAll() {
    return this.menuRepository.findTrees();
  }

  findOne(id: number) {
    return this.menuRepository.findOne({ where: { id } });
  }

  async update(id: number, updateMenuDto: UpdateMenuDto) {
    const menu = await this.findOne(id);
    if (!menu) {
      return null;
    }
    Object.assign(menu, updateMenuDto);
    return this.menuRepository.save(menu);
  }

  async remove(id: number) {
    const menu = await this.findOne(id);
    if (!menu) {
      return null;
    }
    return this.menuRepository.remove(menu);
  }
}