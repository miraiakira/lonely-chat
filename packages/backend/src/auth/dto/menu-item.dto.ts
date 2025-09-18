export interface MenuItem {
  id: number;
  title: string;
  path: string;
  icon?: string;
  children?: MenuItem[];
  permissions?: string[];
  i18nKey?: string;
  isExternal?: boolean;
  externalUrl?: string;
}

export class MenuResponseDto {
  menus: MenuItem[];
}