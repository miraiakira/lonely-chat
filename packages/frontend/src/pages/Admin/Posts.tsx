import React, { useEffect, useMemo, useState } from 'react';
import { Table, Typography, Space, Button, Image, Input, App as AntdApp, Tag } from 'antd';
import dayjs from 'dayjs';
import { adminListPosts, adminDeletePost, adminHidePost, adminUnhidePost } from '../../services/api';

const { Title, Text } = Typography;

interface PostRow {
  id: number;
  author: string;
  content: string;
  images?: string[] | null;
  createdAt: string;
  likes?: number;
  comments?: number;
  hidden?: boolean;
}

const PostsAdmin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PostRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const { message } = AntdApp.useApp();

  const fetchData = async (p = page, ps = pageSize) => {
    setLoading(true);
    try {
      const res = await adminListPosts({ page: p, pageSize: ps });
      const items = (res.items || []).map((it: any) => ({
        id: Number(it.id),
        author: it.authorName || it.authorId,
        content: it.content,
        images: it.images || null,
        createdAt: dayjs(it.createdAt).format('YYYY-MM-DD HH:mm:ss'),
        likes: it.likeCount ?? 0,
        comments: it.commentCount ?? 0,
        hidden: !!it.isHidden,
      }));
      setData(items);
      setTotal(Number(res.total) || items.length);
    } catch (e: any) {
      message.error(e?.message || '加载动态失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(() => [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '作者', dataIndex: 'author', key: 'author', width: 160 },
    { title: '内容', dataIndex: 'content', key: 'content', ellipsis: true },
    {
      title: '图片', key: 'images', width: 220,
      render: (_: any, row: PostRow) => (
        <Space wrap>
          {(row.images || []).map((url, idx) => (
            <Image key={idx} src={url} width={64} height={64} style={{ objectFit: 'cover' }} />
          ))}
        </Space>
      ),
    },
    { title: '点赞', dataIndex: 'likes', key: 'likes', width: 80 },
    { title: '评论', dataIndex: 'comments', key: 'comments', width: 80 },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
    {
      title: '状态', dataIndex: 'hidden', key: 'hidden', width: 120,
      render: (hidden: boolean) => hidden ? <Tag color="red">已隐藏</Tag> : <Tag color="green">可见</Tag>,
    },
    {
      title: '操作', key: 'actions', width: 220,
      render: (_: any, row: PostRow) => (
        <Space>
          {row.hidden ? (
            <Button size="small" onClick={async () => {
              try {
                await adminUnhidePost(row.id);
                message.success('已取消隐藏');
                fetchData(page, pageSize);
              } catch (e: any) {
                message.error(e?.message || '操作失败');
              }
            }}>取消隐藏</Button>
          ) : (
            <Button size="small" onClick={async () => {
              try {
                await adminHidePost(row.id);
                message.success('已隐藏');
                fetchData(page, pageSize);
              } catch (e: any) {
                message.error(e?.message || '操作失败');
              }
            }}>隐藏</Button>
          )}
          <Button danger size="small" onClick={async () => {
            try {
              await adminDeletePost(row.id);
              message.success('删除成功');
              const nextPage = data.length === 1 && page > 1 ? page - 1 : page;
              fetchData(nextPage, pageSize);
            } catch (e: any) {
              message.error(e?.message || '删除失败');
            }
          }}>删除</Button>
        </Space>
      ),
    },
  ], [data, page, pageSize]);

  return (
    <div>
      <Title level={3}>动态管理</Title>
      <Text type="secondary">查看、隐藏/取消隐藏、删除用户发布的动态</Text>
      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <Space>
          <Input.Search placeholder="按作者或内容关键字（预留）" style={{ width: 320 }} disabled />
        </Space>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        columns={columns as any}
        dataSource={data}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
            fetchData(p, ps);
          },
        }}
      />
    </div>
  );
};

export default PostsAdmin;