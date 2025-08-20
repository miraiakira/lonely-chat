import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Layout, Menu, Dropdown, Avatar, Space } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';
import { useMenuStore } from '../../store/menuStore';
import type { MenuItem } from '../../types';

const { Header, Content, Sider } = Layout;

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const menus = useMenuStore((state) => state.menus);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === '3') {
      handleLogout();
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      label: '个人中心',
      key: '1',
      icon: <UserOutlined />,
    },
    {
      label: '设置',
      key: '2',
      icon: <SettingOutlined />,
    },
    {
      type: 'divider',
    },
    {
      label: '退出登录',
      key: '3',
      icon: <LogoutOutlined />,
    },
  ];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'DashboardOutlined':
        return <DashboardOutlined />;
      case 'UserOutlined':
        return <UserOutlined />;
      default:
        return null;
    }
  };

  const items: MenuProps['items'] = menus.map((menu: MenuItem) => ({
    key: menu.path,
    icon: menu.icon ? getIcon(menu.icon) : null,
    label: menu.title,
    children: menu.children?.map((child: MenuItem) => ({
      key: child.path,
      label: child.title,
    })),
  }));

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value: boolean) => setCollapsed(value)}>
        <div style={{ height: '32px', margin: '16px', background: 'rgba(255, 255, 255, 0.2)', borderRadius: '6px', textAlign: 'center', lineHeight: '32px', color: 'white', fontSize: '16px', fontWeight: 'bold' }}>
          {collapsed ? 'LC' : 'Lonely-Chat'}
        </div>
        <Menu theme="dark" defaultSelectedKeys={['/dashboard']} mode="inline" items={items} onClick={({ key }: { key: string }) => navigate(key)} />
      </Sider>
      <Layout className="site-layout">
        <Header className="site-layout-background" style={{ padding: '0 16px', background: '#fff' }}>
          <div style={{ float: 'right' }}>
            <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} placement="bottomRight">
              <a onClick={(e) => e.preventDefault()}>
                <Space>
                  <Avatar icon={<UserOutlined />} />
                  Admin
                </Space>
              </a>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: '16px' }}>
          <div style={{ padding: 24, minHeight: 360, background: '#fff' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;