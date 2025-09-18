import React, { useEffect, useState } from 'react';
import { Table, Typography, Button, Space, Tag, DatePicker, App as AntdApp } from 'antd';
import { adminMuteUser, getUsers } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface UserRow {
  id: number;
  username: string;
  mutedUntil?: string | null;
  bannedUntil?: string | null;
}

const ChatUsers: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      const list: UserRow[] = Array.isArray(res)
        ? res.map((u: any) => ({ id: u.id, username: u.username, mutedUntil: u.mutedUntil ?? null, bannedUntil: u.bannedUntil ?? null }))
        : [];
      setRows(list);
    } catch (e) {
      message.error('加载用户失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const mute = (row: UserRow, until: string) => {
    adminMuteUser(row.id, until)
      .then(() => {
        setRows(prev => prev.map(it => it.id === row.id ? { ...it, mutedUntil: until } : it));
        message.success('已禁言');
      })
      .catch(() => message.error('禁言失败'));
  };

  const unmute = (row: UserRow) => {
    adminMuteUser(row.id, null)
      .then(() => {
        setRows(prev => prev.map(it => it.id === row.id ? { ...it, mutedUntil: null } : it));
        message.success('已解除禁言');
      })
      .catch(() => message.error('解除禁言失败'));
  };

  const columns = [
    { title: 'ID', dataIndex: 'id' },
    { title: '用户名', dataIndex: 'username' },
    {
      title: '禁言状态',
      dataIndex: 'mutedUntil',
      render: (v: string | null | undefined) => v ? <Tag color="orange">禁言至 {dayjs(v).format('YYYY-MM-DD HH:mm')}</Tag> : <Tag color="green">正常</Tag>,
    },
    {
      title: '操作',
      render: (_: any, row: UserRow) => (
        <Space>
          <DatePicker
            showTime
            value={row.mutedUntil ? dayjs(row.mutedUntil) : undefined}
            onChange={(d) => {
              if (!d) return;
              const iso = (d as dayjs.Dayjs).toISOString();
              mute(row, iso);
            }}
          />
          <Button type="link" onClick={() => unmute(row)} disabled={!row.mutedUntil}>解除禁言</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>聊天管理 - 用户</Title>
      <Text type="secondary">支持禁言/解禁（已接入 /admin 接口）。</Text>
      <Table rowKey="id" columns={columns as any} dataSource={rows} loading={loading} pagination={{ pageSize: 20 }} />
    </div>
  );
};

export default ChatUsers;