import { TreeRepository } from 'typeorm';
import { Menu } from './menu.entity';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';
export declare class MenuService {
    private readonly menuRepository;
    constructor(menuRepository: TreeRepository<Menu>);
    create(createMenuDto: CreateMenuDto): Promise<Menu>;
    findAll(): Promise<Menu[]>;
    findOne(id: number): Promise<Menu | null>;
    update(id: number, updateMenuDto: UpdateMenuDto): Promise<Menu | null>;
    remove(id: number): Promise<Menu | null>;
}
