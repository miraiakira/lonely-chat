import React, { useEffect, useState } from 'react';
import { Table, Checkbox, Button, App as AntdApp, Modal, Form, Input } from 'antd';
import { getRoles, getPermissions, assignPermissions, createRole } from '../../services/api';

interface Role {
  id: number;
  name: string;
  permissions: Permission[];
}

interface Permission {
  id: number;
  name: string;
}

// 旧权限名 -> 新权限名 的映射
const ALIASES: Record<string, string> = {
  manage_users: 'user:manage',
  manage_roles: 'role:manage',
  manage_permissions: 'permission:manage',
};

// 给定一个“新命名”，返回它的等价名称集合（包含自身与旧名）
const namesFor = (canonicalName: string): string[] => {
  const legacy = Object.entries(ALIASES)
    .filter(([, v]) => v === canonicalName)
    .map(([k]) => k);
  return [canonicalName, ...legacy];
};

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]); // 展示用（已统一命名）
  const [rawPermissions, setRawPermissions] = useState<Permission[]>([]); // 原始后端返回
  const { message } = AntdApp.useApp();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 将后端返回的权限列表统一为“新命名”的去重列表
  const buildCanonicalPermissions = (list: Permission[]): Permission[] => {
    const map = new Map<string, Permission>();
    for (const p of list) {
      const canonicalName = ALIASES[p.name] || p.name;
      if (!map.has(canonicalName)) {
        // 优先使用后端中实际存在的“新命名”对象，否则降级为旧对象替换名称
        const canonicalObj = list.find((x) => x.name === canonicalName) || { ...p, name: canonicalName };
        map.set(canonicalName, canonicalObj);
      }
    }
    return Array.from(map.values());
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const rolesData = await getRoles();
        const permissionsData = await getPermissions();
        setRoles((rolesData || []).map((r: any) => ({ ...r, permissions: r?.permissions ?? [] })));
        setRawPermissions(permissionsData || []);
        setPermissions(buildCanonicalPermissions(permissionsData || []));
      } catch (error) {
        message.error('Failed to fetch data');
      }
    };
    fetchData();
  }, []);

  const isPermissionAssigned = (role: Role, canonical: Permission): boolean => {
    const candidates = namesFor(canonical.name);
    return (role.permissions || []).some((p) => candidates.includes(p.name));
  };

  const handlePermissionChange = (roleId: number, permission: Permission, checked: boolean) => {
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== roleId) return role;
        const candidates = namesFor(permission.name);
        // 选中：添加新命名对应的权限对象，并移除旧名；取消：移除新旧所有等价名
        if (checked) {
          const canonicalFromRaw = rawPermissions.find((p) => p.name === permission.name) || permission;
          const next = (role.permissions || []).filter((p) => !candidates.includes(p.name));
          return { ...role, permissions: [...next, canonicalFromRaw] };
        } else {
          const next = (role.permissions || []).filter((p) => !candidates.includes(p.name));
          return { ...role, permissions: next };
        }
      }),
    );
  };

  const handleSaveChanges = async (roleId: number) => {
    try {
      const role = roles.find((r) => r.id === roleId);
      if (role) {
        // 依据“展示用权限列表（已统一）”重建提交的权限 ID 集，
        // 对于 manage_* 系列，只提交新命名的 ID，实现一次性迁移
        const assignedNames = new Set((role.permissions || []).map((p) => p.name));
        const ids = new Set<number>();

        permissions.forEach((perm) => {
          const candidates = namesFor(perm.name);
          const isAssigned = candidates.some((n) => assignedNames.has(n));
          if (isAssigned) {
            const canonical = rawPermissions.find((p) => p.name === perm.name) || perm;
            if (typeof canonical.id === 'number') ids.add(canonical.id);
          }
        });

        await assignPermissions(roleId, Array.from(ids));
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
          {permissions.map((permission) => (
            <Checkbox
              key={permission.id}
              checked={isPermissionAssigned(record, permission)}
              onChange={(e) => handlePermissionChange(record.id, permission, e.target.checked)}
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

  const handleCreateRole = async () => {
    try {
      const values = await form.validateFields();
      await createRole({ name: values.name });
      message.success('Role created successfully');
      setIsModalVisible(false);
      form.resetFields();
      const rolesData = await getRoles();
      setRoles((rolesData || []).map((r: any) => ({ ...r, permissions: r?.permissions ?? [] })));
    } catch (error) {
      message.error('Failed to create role');
    }
  };

  return (
    <div>
      <Button type="primary" onClick={() => setIsModalVisible(true)} style={{ marginBottom: 16 }}>
        Create Role
      </Button>
      <Table dataSource={roles} columns={columns} rowKey="id" />
      <Modal
        title="Create Role"
        open={isModalVisible}
        onOk={handleCreateRole}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please input the role name!' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RoleManagement;