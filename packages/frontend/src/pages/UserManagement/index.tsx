import { useEffect, useState } from 'react';
import { Table, Typography, Button, Modal, Form, Input, Select, Avatar, App as AntdApp, Upload } from 'antd';
import { UserOutlined, CameraOutlined } from '@ant-design/icons';
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

// 可点击的头像上传组件
const ClickableAvatar = ({ 
  src, 
  username, 
  size = 64, 
  onUploadSuccess 
}: { 
  src?: string; 
  username: string; 
  size?: number; 
  onUploadSuccess: (url: string) => void;
}) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    setUploading(true);
    
    fetch('http://localhost:3030/api/file/upload', {
      method: 'POST',
      body: formData,
    })
    .then(response => response.json())
    .then(data => {
      if (data.url) {
        onUploadSuccess(data.url);
      }
    })
    .catch(error => {
      console.error('Upload failed:', error);
    })
    .finally(() => {
      setUploading(false);
    });
    
    return false; // 阻止默认上传行为
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Upload
        name="file"
        showUploadList={false}
        beforeUpload={handleUpload}
        accept="image/*"
        disabled={uploading}
      >
        <div 
          style={{ 
            position: 'relative', 
            cursor: uploading ? 'not-allowed' : 'pointer',
            borderRadius: '50%',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            const overlay = e.currentTarget.querySelector('.avatar-overlay') as HTMLElement;
            if (overlay && !uploading) {
              overlay.style.opacity = '1';
            }
          }}
          onMouseLeave={(e) => {
            const overlay = e.currentTarget.querySelector('.avatar-overlay') as HTMLElement;
            if (overlay && !uploading) {
              overlay.style.opacity = '0';
            }
          }}
        >
          <Avatar 
            size={size} 
            src={src} 
            icon={<UserOutlined />}
            style={{ 
              border: '2px dashed #d9d9d9',
              transition: 'all 0.3s ease',
              opacity: uploading ? 0.6 : 1
            }}
          >
            {username?.[0]?.toUpperCase()}
          </Avatar>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: uploading ? 1 : 0,
              transition: 'opacity 0.3s ease',
              borderRadius: '50%'
            }}
            className="avatar-overlay"
          >
            {uploading ? (
              <div style={{ color: 'white', fontSize: '12px' }}>上传中...</div>
            ) : (
              <CameraOutlined style={{ color: 'white', fontSize: size / 4 }} />
            )}
          </div>
        </div>
      </Upload>
    </div>
  );
};

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

  const handleUpdateUser = async (values: { roleIds: number[]; nickname?: string; avatar?: string; gender?: string; bio?: string }) => {
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

  const handleCreateUser = async (values: { username: string; password: string }) => {
    try {
      await createUser(values);
      setIsModalVisible(false);
      form.resetFields();
      fetchUsers(); // Refresh the user list
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleAvatarUpload = (url: string) => {
    form.setFieldsValue({ avatar: url });
    // 更新 editingUser 状态以立即显示新头像
    if (editingUser) {
      setEditingUser({
        ...editingUser,
        profile: {
          ...editingUser.profile,
          avatar: url
        }
      });
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

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  console.log('editingUser', editingUser)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>用户管理</Title>
        <Button type="primary" onClick={() => setIsModalVisible(true)}>创建用户</Button>
      </div>
      <Table columns={columns} dataSource={users} rowKey="id" />
      <Modal title={editingUser ? '编辑用户' : '创建用户'} open={isModalVisible} onCancel={handleModalCancel} footer={null}>
        <Form
          form={form}
          onFinish={(values) => {
            if (editingUser) {
              handleUpdateUser(values as { roleIds: number[]; nickname?: string; avatar?: string; gender?: string; bio?: string });
            } else {
              handleCreateUser(values as { username: string; password: string });
            }
          }}
        >
          {editingUser && (
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <ClickableAvatar
                src={editingUser.profile?.avatar}
                username={editingUser.username}
                size={80}
                onUploadSuccess={handleAvatarUpload}
              />
              <div style={{ marginTop: 8, color: '#666', fontSize: '12px' }}>
                点击头像上传新图片
              </div>
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