import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, message } from 'antd';
import { getPermissions, createPermission } from '../../services/api';
import type { Permission } from '../../types';

const PermissionManagement: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchPermissions = async () => {
    try {
      const { data } = await getPermissions();
      setPermissions(data);
    } catch (error) {
      message.error('Failed to fetch permissions');
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await createPermission(values);
      message.success('Permission created successfully');
      setIsModalVisible(false);
      fetchPermissions();
    } catch (error) {
      message.error('Failed to create permission');
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  return (
    <div>
      <Button type="primary" onClick={() => setIsModalVisible(true)} style={{ marginBottom: 16 }}>
        Create Permission
      </Button>
      <Table dataSource={permissions} columns={columns} rowKey="id" />
      <Modal
        title="Create Permission"
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please input the permission name!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please input the permission description!' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PermissionManagement;