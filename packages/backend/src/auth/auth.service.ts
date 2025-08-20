import { Injectable } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { MenuItem } from './dto/menu-item.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.userService.findOneByUsername(username);
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, roles: user.roles.map(role => role.name) };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async getMenus(userId: number): Promise<MenuItem[]> {
    const user = await this.userService.findOne(userId);
    if (!user) {
      return [];
    }

    // 获取用户所有权限
    const userPermissions = new Set<string>();
    user.roles.forEach(role => {
      role.permissions.forEach(permission => {
        userPermissions.add(permission.name);
      });
    });

    // 定义系统菜单结构
    const allMenus: MenuItem[] = [
      {
        id: 'dashboard',
        title: '仪表盘',
        path: '/dashboard',
        icon: 'DashboardOutlined',
        permissions: ['dashboard:view']
      },
      {
        id: 'user-management',
        title: '用户管理',
        path: '/users',
        icon: 'UserOutlined',
        permissions: ['user:read']
      },
      {
        id: 'role-management',
        title: '角色管理',
        path: '/roles',
        icon: 'TeamOutlined',
        permissions: ['role:read']
      },
      {
        id: 'permission-management',
        title: '权限管理',
        path: '/permissions',
        icon: 'SafetyOutlined',
        permissions: ['permission:read']
      },
      {
        id: 'system',
        title: '系统管理',
        icon: 'SettingOutlined',
        children: [
          {
            id: 'system-config',
            title: '系统配置',
            path: '/system/config',
            permissions: ['system:config']
          },
          {
            id: 'system-logs',
            title: '系统日志',
            path: '/system/logs',
            permissions: ['system:logs']
          }
        ]
      }
    ];

    // 根据用户权限过滤菜单
    const filterMenus = (menus: MenuItem[]): MenuItem[] => {
      return menus.filter(menu => {
        // 如果菜单有子菜单，递归过滤
        if (menu.children) {
          menu.children = filterMenus(menu.children);
          // 如果过滤后还有子菜单，则保留父菜单
          return menu.children.length > 0;
        }
        
        // 如果菜单没有权限要求，则显示
        if (!menu.permissions || menu.permissions.length === 0) {
          return true;
        }
        
        // 检查用户是否有任一所需权限
        return menu.permissions.some(permission => userPermissions.has(permission));
      });
    };

    const filteredMenus = filterMenus(allMenus);
    
    return filteredMenus;
  }
}