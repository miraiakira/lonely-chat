import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TreeRepository } from 'typeorm';
import { Menu } from './menu.entity';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Injectable()
export class MenuService implements OnModuleInit {
  constructor(
    @InjectRepository(Menu)
    private readonly menuRepository: TreeRepository<Menu>,
  ) {}

  async onModuleInit() {
    // 如果没有任何菜单，插入默认菜单数据，防止管理员登录后无菜单可见
    const count = await this.menuRepository.count();
    if (count === 0) {
      await this.seedDefaultMenus();
    }
  }

  private async seedDefaultMenus() {
    // 顶部功能菜单（与前端路由匹配）
    const dashboard = this.menuRepository.create({
      title: '仪表盘',
      i18nKey: 'menu.dashboard',
      path: '/dashboard',
      component: 'Dashboard',
      icon: 'DashboardOutlined',
      order: 0,
      isExternal: false,
      hidden: false,
      permissions: null as any,
    });

    const users = this.menuRepository.create({
      title: '用户管理',
      i18nKey: 'menu.users',
      path: '/users',
      component: 'UserManagement',
      icon: 'UserOutlined',
      order: 1,
      isExternal: false,
      hidden: false,
      permissions: null as any,
    });

    const roles = this.menuRepository.create({
      title: '角色管理',
      i18nKey: 'menu.roles',
      path: '/roles',
      component: 'RoleManagement',
      icon: 'TeamOutlined',
      order: 2,
      isExternal: false,
      hidden: false,
      permissions: null as any,
    });

    const permissions = this.menuRepository.create({
      title: '权限管理',
      i18nKey: 'menu.permissions',
      path: '/permissions',
      component: 'PermissionManagement',
      icon: 'SafetyOutlined',
      order: 3,
      isExternal: false,
      hidden: false,
      permissions: null as any,
    });

    await this.menuRepository.save([dashboard, users, roles, permissions]);

    // 系统设置分组及子菜单
    const system = this.menuRepository.create({
      title: '系统设置',
      i18nKey: 'menu.system',
      path: '/system',
      icon: 'SettingOutlined',
      order: 90,
      isExternal: false,
      hidden: false,
      permissions: null as any,
    });
    await this.menuRepository.save(system);

    const menuMgmt = this.menuRepository.create({
      title: '菜单管理',
      i18nKey: 'menu.system.menus',
      path: '/system/menus',
      component: 'System/MenuManagement',
      icon: 'SettingOutlined',
      order: 1,
      isExternal: false,
      hidden: false,
      permissions: null as any,
      parent: system,
    });
    await this.menuRepository.save(menuMgmt);
  }

  async create(createMenuDto: CreateMenuDto) {
    const { parentId, ...rest } = createMenuDto as any;
    const menu = this.menuRepository.create(rest as Partial<Menu>);
    if (parentId) {
      const parent = await this.menuRepository.findOne({ where: { id: parentId } });
      if (parent) menu.parent = parent as any;
    }
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