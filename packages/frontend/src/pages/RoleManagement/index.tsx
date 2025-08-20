import React, { useEffect, useState } from 'react';
import { Table, Checkbox, Button, message } from 'antd';
import { getRoles, getPermissions, assignPermissions } from '../../services/api';

interface Role {
  id: number;
  name: string;
  permissions: Permission[];
}

interface Permission {
  id: number;
  name: string;
}

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const rolesData = await getRoles();
        const permissionsData = await getPermissions();
        setRoles(rolesData);
        setPermissions(permissionsData);
      } catch (error) {
        message.error('Failed to fetch data');
      }
    };
    fetchData();
  }, []);

  const handlePermissionChange = (roleId: number, permissionId: number, checked: boolean) => {
    setRoles(roles.map(role => {
      if (role.id === roleId) {
        if (checked) {
          return { ...role, permissions: [...role.permissions, permissions.find(p => p.id === permissionId)!] };
        } else {
          return { ...role, permissions: role.permissions.filter(p => p.id !== permissionId) };
        }
      }
      return role;
    }));
  };

  const handleSaveChanges = async (roleId: number) => {
    try {
      const role = roles.find(r => r.id === roleId);
      if (role) {
        const permissionIds = role.permissions.map(p => p.id);
        await assignPermissions(roleId, permissionIds);
        message.success('Permissions updated successfully');
      }
    } catch (error) {
      message.error('Failed to update permissions');
    }
  };

  const columns = [
    {
      title: 'Role',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (_: any, record: Role) => (
        <div>
          {permissions.map(permission => (
            <Checkbox
              key={permission.id}
              checked={record.permissions.some(p => p.id === permission.id)}
              onChange={(e) => handlePermissionChange(record.id, permission.id, e.target.checked)}
            >
              {permission.name}
            </Checkbox>
          ))}
        </div>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Role) => (
        <Button type="primary" onClick={() => handleSaveChanges(record.id)}>
          Save Changes
        </Button>
      ),
    },
  ];

  return <Table dataSource={roles} columns={columns} rowKey="id" />;
};

export default RoleManagement;