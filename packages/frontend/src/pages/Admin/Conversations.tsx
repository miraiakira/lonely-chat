import React, { useEffect, useState } from 'react';
import { Table, Typography, Button, Space, Tag, App as AntdApp, Input } from 'antd';
import { adminListConversations, adminLockConversation, adminSetConversationNotice } from '../../services/api';

const { Title, Text } = Typography;

interface ConversationRow {
  id: number;
  title: string;
  isLocked?: boolean;
  notice?: string;
}

const ChatConversations: React.FC = () => {
  const { message, modal } = AntdApp.useApp();
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async (q?: string) => {
    setLoading(true);
    try {
      const res = await adminListConversations({ q: q ?? keyword, page: 1, pageSize: 20 });
      setRows(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      message.error('加载会话失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData('');
  }, []);

  const toggleLock = (row: ConversationRow, lock: boolean) => {
    adminLockConversation(row.id, lock)
      .then(() => {
        setRows(prev => prev.map(it => it.id === row.id ? { ...it, isLocked: lock } : it));
        message.success(lock ? '已锁定会话' : '已解锁会话');
      })
      .catch(() => message.error('操作失败'));
  };

  const setNotice = (row: ConversationRow) => {
    let inputValue = row.notice || '';
    const modalRef = modal.confirm({
      title: '设置会话公告',
      content: (
        <Input.TextArea
          autoSize={{ minRows: 3 }}
          defaultValue={row.notice}
          onChange={(e) => (inputValue = e.target.value)}
          placeholder="公告内容"
        />
      ),
      onOk: async () => {
        try {
          await adminSetConversationNotice(row.id, inputValue);
          setRows(prev => prev.map(it => it.id === row.id ? { ...it, notice: inputValue } : it));
          message.success('已更新公告');
        } catch {
          message.error('更新公告失败');
        }
      },
    });
  };

  const columns = [
    { title: 'ID', dataIndex: 'id' },
    { title: '会话', dataIndex: 'title' },
    { title: '状态', dataIndex: 'isLocked', render: (v: boolean) => v ? <Tag color="red">已锁定</Tag> : <Tag color="green">正常</Tag> },
    { title: '公告', dataIndex: 'notice', ellipsis: true },
    {
      title: '操作',
      render: (_: any, row: ConversationRow) => (
        <Space>
          {row.isLocked ? (
            <Button type="link" onClick={() => toggleLock(row, false)}>解锁</Button>
          ) : (
            <Button danger type="link" onClick={() => toggleLock(row, true)}>锁定</Button>
          )}
          <Button type="link" onClick={() => setNotice(row)}>设置公告</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>聊天管理 - 会话</Title>
      <Text type="secondary">支持锁定/解锁及公告设置（后续接入后端 /admin 接口与审计日志）。</Text>
      <div style={{ margin: '12px 0' }}>
        <Input.Search placeholder="搜索会话标题" allowClear value={keyword} onChange={(e) => setKeyword(e.target.value)} onSearch={(v)=>{ setKeyword(v); fetchData(v); }} />
      </div>
      <Table rowKey="id" columns={columns as any} dataSource={rows} loading={loading} pagination={{ pageSize: 20 }} />
    </div>
  );
};

export default ChatConversations;