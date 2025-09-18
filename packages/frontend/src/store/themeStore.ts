import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeConfig } from 'antd';
import { theme as antdTheme } from 'antd';

export type SkinKey = 'aurora' | 'sunset' | 'midnight';

export interface Skin {
  key: SkinKey;
  name: string;
  description?: string;
  // antd theme config pieces
  algorithm: ThemeConfig['algorithm'];
  token: ThemeConfig['token'];
}

export const skins: Record<SkinKey, Skin> = {
  aurora: {
    key: 'aurora',
    name: '极光蓝',
    description: '清爽现代的科技蓝配色',
    algorithm: antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#1D8FE1',
      colorInfo: '#1D8FE1',
      colorSuccess: '#22C55E',
      colorWarning: '#F59E0B',
      colorError: '#EF4444',
      colorBgLayout: '#F7FAFC',
      colorBgContainer: '#FFFFFF',
      colorText: '#1F2937',
      colorTextSecondary: '#64748B',
      colorBorder: '#E5E7EB',
      borderRadius: 8,
    },
  },
  sunset: {
    key: 'sunset',
    name: '落日珊瑚',
    description: '温暖柔和的珊瑚橙配色',
    algorithm: antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: '#FF6B6B',
      colorInfo: '#FF6B6B',
      colorSuccess: '#22C55E',
      colorWarning: '#F59E0B',
      colorError: '#EF4444',
      colorBgLayout: '#FFF6F3',
      colorBgContainer: '#FFFFFF',
      colorText: '#40312E',
      colorTextSecondary: '#8C675E',
      colorBorder: '#F2D6CF',
      borderRadius: 10,
    },
  },
  midnight: {
    key: 'midnight',
    name: '子夜蓝',
    description: '高对比的沉浸暗色主题',
    algorithm: antdTheme.darkAlgorithm,
    token: {
      colorPrimary: '#22D3EE',
      colorInfo: '#22D3EE',
      // 在暗色下其余状态色用默认算法计算，保留主色定义
      colorBgLayout: '#0F172A',
      colorBgContainer: '#0B1220',
      colorBorder: '#1F2937',
      borderRadius: 8,
    },
  },
};

interface ThemeState {
  skin: SkinKey;
  setSkin: (skin: SkinKey) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      skin: 'aurora',
      setSkin: (skin) => set({ skin }),
    }),
    { name: 'theme-storage' }
  )
);