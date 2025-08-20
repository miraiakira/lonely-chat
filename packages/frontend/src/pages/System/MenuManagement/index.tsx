import { getMenus } from '@/services/api';
import { PageContainer } from '@ant-design/pro-layout';
import { Table } from 'antd';
import { useEffect, useState } from 'react';
import CreateMenu from './components/CreateMenu';

const MenuManagement = () => {
  const [menus, setMenus] = useState([]);

  const fetchMenus = async () => {
    const res = await getMenus();
    setMenus(res.data);
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const columns = [
    {
      title: '菜单名称',
      dataIndex: 'name',
      key: 'name',
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
      title: '操作',
      key: 'action',
      render: () => (
        <a>
          编辑
        </a>
      ),
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