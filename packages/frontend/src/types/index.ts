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
  description?: string;
}

// 用户相关类型
export interface UserProfile {
  nickname?: string | null;
  avatar?: string | null;
  gender?: string | null;
  bio?: string | null;
}

export interface Role {
  id: number;
  name: string;
}

export interface User {
  id: number;
  username: string;
  roles: Role[];
  profile?: UserProfile | null;
}