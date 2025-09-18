import { useEffect, useState } from 'react';
import { Table, Typography, Button, Modal, Form, Input, Upload, Select, Avatar, App as AntdApp } from 'antd';
import { UploadOutlined, UserOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';
import { getUsers, getRoles, assignRoles, deleteUser, updateUser, createUser } from '../../services/api';

const { Title } = Typography;

interface Role {
  id: number;
  name: string;
}

interface UserProfile {
  nickname: string;
  avatar: string;
  gender: string;
  bio: string;
}

interface User {
  id: number;
  username: string;
  roles: Role[];
  profile: UserProfile;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await getRoles();
      setRoles(response);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const { modal } = AntdApp.useApp();
  const handleDeleteUser = (id: number) => {
    modal.confirm({
       title: '确认删除',
       content: '您确定要删除该用户吗？',
       onOk: async () => {
         try {
           await deleteUser(id);
           fetchUsers(); // Refresh the user list
         } catch (error) {
           console.error('Failed to delete user:', error);
         }
       },
     });
   };

  const showEditModal = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({ ...user, ...user.profile, roleIds: user.roles.map(role => role.id) });
    setIsModalVisible(true);
  };

  const handleUpdateUser = async (values: any) => {
    if (!editingUser) return;
    const { roleIds, ...profileValues } = values;

    try {
      await updateUser(editingUser.id, profileValues)
      await assignRoles(editingUser.id, roleIds);
      setIsModalVisible(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleCreateUser = async (values: any) => {
    try {
      await createUser(values);
      setIsModalVisible(false);
      form.resetFields();
      fetchUsers(); // Refresh the user list
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const columns: TableColumnsType<User> = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
  },
  {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text, record) => (
        <>
          <Avatar src={record.profile?.avatar} style={{ marginRight: 8 }} icon={<UserOutlined />}>
            {record.username?.[0]?.toUpperCase()}
          </Avatar>
          {text}
        </>
      ),
    },
  {
    title: '角色',
    dataIndex: 'roles',
    key: 'roles',
    render: (roles: Role[]) => roles.map(role => role.name).join(', '),
  },
  {
    title: '昵称',
    dataIndex: ['profile', 'nickname'],
    key: 'nickname',
  },
  {
    title: '性别',
    dataIndex: ['profile', 'gender'],
    key: 'gender',
  },
  {
    title: '操作',
    key: 'action',
    render: (_, record) => (
      <span>
        <Button type="link" onClick={() => showEditModal(record)}>编辑</Button>
        <Button type="link" danger onClick={() => handleDeleteUser(record.id)}>删除</Button>
      </span>
    ),
  }, 
];

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  console.log('editingUser', editingUser)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>用户管理</Title>
        <Button type="primary" onClick={() => setIsModalVisible(true)}>创建用户</Button>
      </div>
      <Table columns={columns} dataSource={users} rowKey="id" />
      <Modal title={editingUser ? '编辑用户' : '创建用户'} open={isModalVisible} onCancel={() => { setIsModalVisible(false); setEditingUser(null); }} footer={null}>
        <Form form={form} onFinish={editingUser ? handleUpdateUser : handleCreateUser}>
          {editingUser && (
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Avatar size={64} src={editingUser.profile?.avatar} icon={<UserOutlined />}>
                {editingUser.username?.[0]?.toUpperCase()}
              </Avatar>
            </div>
          )}
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名!' }]}>
            <Input disabled={!!editingUser} />
          </Form.Item>
          {editingUser && (
            <>
              <Form.Item label="角色" name="roleIds">
                <Select
                  mode="multiple"
                  placeholder="请选择角色"
                  options={roles.map(role => ({ label: role.name, value: role.id }))}
                />
              </Form.Item>
              <Form.Item label="昵称" name="nickname">
                <Input />
              </Form.Item>
              <Form.Item label="头像">
                <Upload
                  name="file"
                  action="http://localhost:3030/api/file/upload"
                  listType="picture"
                  maxCount={1}
                  onChange={(info: any) => {
                    if (info.file.status === 'done') {
                      form.setFieldsValue({ avatar: info.file.response.url });
                    }
                  }}
                >
                  <Button icon={<UploadOutlined />}>点击上传</Button>
                </Upload>
              </Form.Item>
              <Form.Item name="avatar" hidden>
                <Input />
              </Form.Item>
              <Form.Item label="性别" name="gender">
                <Select options={[{ label: '男', value: 'male' }, { label: '女', value: 'female' }]} />
              </Form.Item>
              <Form.Item label="简介" name="bio">
                <Input.TextArea />
              </Form.Item>
            </>
          )}
          {!editingUser && (
            <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码!' }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item>
            <Button type="primary" htmlType="submit">{editingUser ? '更新' : '创建'}</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;