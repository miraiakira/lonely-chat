import React, { useState, useEffect } from 'react';
import { Table, App as AntdApp, Tag } from 'antd';
import { getPermissions } from '../../services/api';
import type { Permission } from '../../types';

// 历史权限标识（禁止创建，显示标记）
const LEGACY_PATTERNS = ['manage_users', 'manage_roles', 'manage_permissions'];

const isLegacyPermission = (name: string): boolean => {
  return LEGACY_PATTERNS.includes(name) || name.startsWith('manage_');
};

const PermissionManagement: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const { message } = AntdApp.useApp();

  const fetchPermissions = async () => {
    try {
      const list = await getPermissions();
      // 过滤掉历史命名的权限，保证列表展示统一为现代命名（如 user:manage）
      setPermissions((list as Permission[]).filter((p: Permission) => !isLegacyPermission(p.name)));
    } catch (error) {
      message.error('Failed to fetch permissions');
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span>
          {name}
          {isLegacyPermission(name) && (
            <Tag color="orange" style={{ marginLeft: 8 }}>
              Legacy
            </Tag>
          )}
        </span>
      ),
    },
  ];

  return (
    <div>
      <Table dataSource={permissions} columns={columns} rowKey="id" />
    </div>
  );
};

export default PermissionManagement;