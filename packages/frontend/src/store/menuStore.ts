import { create } from 'zustand';

interface MenuItem {
  id: number;
  title: string;
  path: string;
  icon?: string;
  children?: MenuItem[];
  permissions: string[];
}

interface MenuState {
  menus: MenuItem[] | { [key: string]: any };
  setMenus: (menus: MenuItem[] | { [key: string]: any }) => void;
}

export const useMenuStore = create<MenuState>((set) => ({
  menus: [],
  setMenus: (menus) => set({ menus }),
}));