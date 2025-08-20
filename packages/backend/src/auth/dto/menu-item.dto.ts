export interface MenuItem {
  id: string;
  title: string;
  path?: string;
  icon?: string;
  children?: MenuItem[];
  permissions?: string[];
}

export class MenuResponseDto {
  menus: MenuItem[];
}