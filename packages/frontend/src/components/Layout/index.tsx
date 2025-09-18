import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar, Space, Select, theme as antdTheme } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  TeamOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { useMenuStore } from '../../store/menuStore';
import { useUserStore } from '../../store/userStore';
import { useThemeStore, type SkinKey } from '../../store/themeStore';
import type { MenuItem } from '../../types';
import logo from '../../assets/longly-chat-logo-horizontal.svg';
import logoLight from '../../assets/longly-chat-logo-horizontal-light.svg';
import { useTranslation } from 'react-i18next';
import apiClient from '../../services/apiClient';

const { Header, Content, Sider } = Layout;

// 规范化路径：去掉末尾斜杠，确保有前导斜杠；保留大小写（避免破坏区分大小写的路由）
function normalizePath(p: string): string {
  if (!p) return '/';
  let s = p.trim();
  if (!s.startsWith('/')) s = '/' + s;
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s;
}

// 从菜单构建“子 -> 父链”映射，用于多级展开
function buildParentChains(menus: MenuItem[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const dfs = (nodes: MenuItem[], ancestors: string[]) => {
    nodes.forEach((node) => {
      const key = normalizePath(node.path);
      map.set(key, ancestors);
      if (node.children && node.children.length) {
        dfs(node.children, [...ancestors, key]);
      }
    });
  };
  dfs(menus, []);
  return map;
}

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const { t, i18n } = useTranslation();
  const logout = useAuthStore((state) => state.logout);
  const menus = useMenuStore((state) => state.menus as MenuItem[]);
  const setMenus = useMenuStore((state) => state.setMenus);
  const user = useUserStore((state) => state.user);
  const clearUser = useUserStore((state) => state.clearUser);
  const skin = useThemeStore((s) => s.skin);
  const setSkin = useThemeStore((s) => s.setSkin);
  const { token } = antdTheme.useToken();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout', undefined, ({ _retry: true } as any));
    } catch {}
    finally {
      logout();
      setMenus([]);
      clearUser();
      navigate('/login');
    }
  };

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === '3') {
      handleLogout();
    }
  };

  const menuItems: MenuProps['items'] = [
    { label: t('layout.profile'), key: '1', icon: <UserOutlined /> },
    { label: t('layout.settings'), key: '2', icon: <SettingOutlined /> },
    { type: 'divider' },
    { label: t('common.logout'), key: '3', icon: <LogoutOutlined /> },
  ];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'DashboardOutlined':
        return <DashboardOutlined />;
      case 'UserOutlined':
        return <UserOutlined />;
      case 'TeamOutlined':
        return <TeamOutlined />;
      case 'SafetyOutlined':
        return <SafetyOutlined />;
      case 'SettingOutlined':
        return <SettingOutlined />;
      default:
        return null;
    }
  };

  // 生成 antd Menu 结构，key 使用规范化后的 path，避免尾随斜杠导致不匹配
  const items: MenuProps['items'] = (menus as MenuItem[]).map((menu: MenuItem) => {
    const childItems = (menu.children?.map((child: MenuItem) => ({
      key: normalizePath(child.path),
      label: child.title,
    })) ?? []);
    const base = {
      key: normalizePath(menu.path),
      icon: menu.icon ? getIcon(menu.icon) : null,
      label: menu.title,
    };
    return childItems.length > 0 ? { ...base, children: childItems } : base;
  });

  // 选中项：最长前缀匹配 + 规范化路径
  const flatKeys = React.useMemo(() => {
    const keys: string[] = [];
    (menus as MenuItem[]).forEach((m: MenuItem) => {
      keys.push(normalizePath(m.path));
      m.children?.forEach((c: MenuItem) => keys.push(normalizePath(c.path)));
    });
    return keys;
  }, [menus]);

  const selectedKey = React.useMemo(() => {
    const path = normalizePath(location.pathname);
    const matches = flatKeys.filter((k: string) => path === k || path.startsWith(k + '/'));
    return (matches.sort((a, b) => b.length - a.length)[0]) || path;
  }, [location.pathname, flatKeys]);

  const selectedKeys = [selectedKey];

  // 多级展开：根据子->父链展开所有祖先，刷新后也能还原展开层级
  const parentChains = React.useMemo(() => buildParentChains(menus as MenuItem[]), [menus]);

  React.useEffect(() => {
    const path = normalizePath(location.pathname);
    const matches = flatKeys.filter((k: string) => path === k || path.startsWith(k + '/'));
    const key = (matches.sort((a, b) => b.length - a.length)[0]) || path;
    const ancestors = parentChains.get(key) ?? [];
    setOpenKeys(collapsed ? [] : ancestors);
  }, [location.pathname, menus, flatKeys, parentChains, collapsed]);

  const displayName = user?.profile?.nickname || user?.username || t('common.notLoggedIn');
  const avatarSrc = user?.profile?.avatar || undefined;

  const changeLang = (lng: 'zh-CN' | 'en-US') => {
    i18n.changeLanguage(lng);
    try {
      localStorage.setItem('lang', lng);
    } catch {}
  };

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Header className="site-layout-background" style={{ padding: '0 16px', background: token.colorBgContainer, borderBottom: `1px solid ${token.colorBorder}` }}>
        <div style={{ float: 'left', display: 'flex', alignItems: 'center', height: '64px' }}>
          <img src={skin === 'midnight' ? logoLight : logo} alt="longly chat" style={{ height: 36, display: 'block' }} />
        </div>
        <div style={{ float: 'right', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Select
            size="small"
            value={skin}
            style={{ width: 140 }}
            onChange={(val: SkinKey) => setSkin(val)}
            options={[
              { value: 'aurora', label: t('layout.skinAurora') },
              { value: 'sunset', label: t('layout.skinSunset') },
              { value: 'midnight', label: t('layout.skinMidnight') },
            ]}
          />
          <Select
            size="small"
            value={i18n.language === 'zh-CN' || i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US'}
            style={{ width: 120 }}
            onChange={changeLang}
            options={[
              { value: 'zh-CN', label: t('layout.langZh') },
              { value: 'en-US', label: t('layout.langEn') },
            ]}
          />
          <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} placement="bottomRight">
            <a onClick={(e) => e.preventDefault()}>
              <Space>
                <Avatar src={avatarSrc} icon={<UserOutlined />} />
                {displayName}
              </Space>
            </a>
          </Dropdown>
        </div>
      </Header>

      <Layout>
        <Sider collapsible collapsed={collapsed} onCollapse={(value: boolean) => setCollapsed(value)} style={{ background: token.colorBgContainer, borderRight: `1px solid ${token.colorBorder}` }}>
          <Menu
            theme={skin === 'midnight' ? 'dark' : 'light'}
            selectedKeys={selectedKeys}
            openKeys={collapsed ? [] : openKeys}
            onOpenChange={(keys) => setOpenKeys(keys as string[])}
            mode="inline"
            items={items}
            onClick={({ key }: { key: string }) => navigate(key)}
          />
        </Sider>

        <Content style={{ margin: '16px' }}>
          <div style={{ padding: 24, minHeight: 360, background: token.colorBgContainer, borderRadius: token.borderRadius, boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;