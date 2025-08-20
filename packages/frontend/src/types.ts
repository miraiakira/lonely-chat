export interface Permission {
  id: number;
  name: string;
  description: string;
}

export interface MenuItem {
  id: number;
  title: string;
  path: string;
  icon?: string;
  component: string;
  parentId?: number;
  children?: MenuItem[];
}