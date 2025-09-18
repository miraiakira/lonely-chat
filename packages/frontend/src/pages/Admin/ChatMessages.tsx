import React, { useMemo, useState } from 'react';
import { Table, Typography, Input, Space, Button, Tag, App as AntdApp } from 'antd';
import { adminSearchMessages, adminSoftDeleteMessage } from '../../services/api';

const { Title, Text } = Typography;

interface MessageRow {
  id: number;
  user: string;
  content: string;
  createdAt: string;
  status?: 'normal' | 'deleted';
}

const ChatMessages: React.FC = () => {
  const { message, modal } = AntdApp.useApp();
  const [keyword, setKeyword] = useState('');
  const [rows, setRows] = useState<MessageRow[]>([]);

  const fetchData = async (q?: string) => {
    try {
      const res = await adminSearchMessages({ q: q ?? keyword });
      setRows(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {}
  };

  React.useEffect(() => {
    fetchData('');
  }, []);
  const filtered = useMemo(() => rows.filter(r => r.content.includes(keyword) || r.user.includes(keyword)), [rows, keyword]);

  const softDelete = (row: MessageRow) => {
    modal.confirm({
       title: '软删除消息',
       content: `确认删除消息 #${row.id}？该操作可在数据库保留痕迹（可撤销）。`,
       onOk: async () => {
         try {
           await adminSoftDeleteMessage(row.id);
           setRows(prev => prev.map(it => it.id === row.id ? { ...it, status: 'deleted' } : it));
           message.success('已标记删除');
         } catch (e) {
           message.error('删除失败');
         }
       },
     });
   };

  const columns = [
    { title: 'ID', dataIndex: 'id' },
    { title: '用户', dataIndex: 'user' },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    { title: '时间', dataIndex: 'createdAt' },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: MessageRow['status']) => v === 'deleted' ? <Tag color="red">已删除</Tag> : <Tag color="green">正常</Tag>,
    },
    {
      title: '操作',
      render: (_: any, row: MessageRow) => (
        <Space>
          <Button danger type="link" onClick={() => softDelete(row)} disabled={row.status === 'deleted'}>
            软删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4}>聊天管理 - 消息</Title>
      <Text type="secondary">支持检索与软删除（后续接入后端 /admin 接口与审计日志）。</Text>
      <div style={{ margin: '12px 0' }}>
        <Input.Search placeholder="搜索用户/内容" allowClear value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={(v)=>{ setKeyword(v); fetchData(v); }} />
      </div>
      <Table rowKey="id" columns={columns as any} dataSource={filtered} pagination={{ pageSize: 10 }} />
    </div>
  );
};

export default ChatMessages;