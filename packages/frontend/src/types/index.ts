export interface MenuItem {
  id: number;
  path: string;
  title: string;
  icon?: string;
  children?: MenuItem[];
}

export interface Permission {
  id: number;
  name: string;
  description: string;
}