import { getMenuTree } from '@/services/api';
import { PageContainer } from '@ant-design/pro-layout';
import { Table } from 'antd';
import { useEffect, useState } from 'react';
import CreateMenu from './components/CreateMenu';

const MenuManagement = () => {
  const [menus, setMenus] = useState([]);

  const fetchMenus = async () => {
    const res = await getMenuTree();
    setMenus(res);
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const columns = [
    // 移除 ID 列
    {
      title: '菜单名称',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
    },
    {
      title: '组件',
      dataIndex: 'component',
      key: 'component',
    },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
    },
    {
      title: '排序',
      dataIndex: 'order',
      key: 'order',
    },
    {
      title: '是否外链',
      dataIndex: 'isExternal',
      key: 'isExternal',
      render: (v: boolean) => (v ? '是' : '否'),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '菜单管理',
        extra: [<CreateMenu key="create" onSuccess={fetchMenus} />],
      }}
    >
      <Table dataSource={menus} columns={columns} rowKey="id" />
    </PageContainer>
  );
};

export default MenuManagement;