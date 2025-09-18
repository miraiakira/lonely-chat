import React from 'react';
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  Tag,
  Progress,
  Avatar,
  List,
  Typography,
  Space,
  Button
} from 'antd';
import {
  UserOutlined,
  MessageOutlined,
  TeamOutlined,
  RiseOutlined,
  ArrowUpOutlined,
  EyeOutlined,
  LikeOutlined,
  CommentOutlined
} from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { getSystemOverview, getRecentUsers } from '../../services/api';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<any>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loadingRecentUsers, setLoadingRecentUsers] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingOverview(true);
        const data = await getSystemOverview();
        if (mounted) setOverview(data);
      } catch (e) {
        // noop, rely on UI fallback
      } finally {
        setLoadingOverview(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingRecentUsers(true);
        const users = await getRecentUsers(5);
        if (!mounted) return;
        const mapped = (users || []).map((u: any) => ({
          id: u.id,
          name: u?.profile?.nickname || u?.username || `用户#${u?.id}`,
          avatar: u?.profile?.avatar || '',
          time: u?.createdAt ? new Date(u.createdAt).toLocaleString() : '-',
          status: 'offline' as const,
        }));
        setRecentUsers(mapped);
      } catch (e) {
        // keep empty recent users on error
      } finally {
        setLoadingRecentUsers(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const recentMessages = [
    { id: 1, user: '张三', content: '大家好，很高兴加入这个平台！', time: '刚刚' },
    { id: 2, user: '李四', content: '这个功能很不错，使用体验很好', time: '3分钟前' },
    { id: 3, user: '王五', content: '有什么问题可以随时联系我', time: '8分钟前' },
    { id: 4, user: '赵六', content: '期待更多新功能的上线', time: '12分钟前' },
  ];

  const tableData = overview ? [
    {
      key: 'users',
      name: t('dashboard.entities.users'),
      count: overview.db?.counts?.users ?? 0,
      status: overview.db?.status === 'up' ? 'active' : 'inactive',
      updateTime: overview.db?.latestTimes?.userUpdatedAt
        ? new Date(overview.db.latestTimes.userUpdatedAt).toLocaleString()
        : '-',
    },
    {
      key: 'roles',
      name: t('dashboard.entities.roles'),
      count: overview.db?.counts?.roles ?? 0,
      status: 'active',
      updateTime: '-',
    },
    {
      key: 'permissions',
      name: t('dashboard.entities.permissions'),
      count: overview.db?.counts?.permissions ?? 0,
      status: 'active',
      updateTime: '-',
    },
  ] : [];

  const columns = [
    {
      title: t('dashboard.labels.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('dashboard.labels.count'),
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => (
        <Text strong>{Number(count ?? 0).toLocaleString()}</Text>
      ),
    },
    {
      title: t('dashboard.labels.status'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? t('dashboard.statusTag.active') : t('dashboard.statusTag.inactive')}
        </Tag>
      ),
    },
    {
      title: t('dashboard.labels.updateTime'),
      dataIndex: 'updateTime',
      key: 'updateTime',
    },
  ];

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loadingOverview}>
            <Statistic
              title={t('dashboard.cards.totalUsers')}
              value={overview?.db?.counts?.users ?? 0}
              precision={0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<UserOutlined />}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">{t('dashboard.cards.fromOverview')}</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loadingOverview}>
            <Statistic
              title={t('dashboard.cards.todayNewUsers')}
              value={overview?.db?.counts?.todayNewUsers ?? 0}
              precision={0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<MessageOutlined />}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">{t('dashboard.cards.todaySince0')}</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loadingOverview}>
            <Statistic
              title={t('dashboard.cards.roles')}
              value={overview?.db?.counts?.roles ?? 0}
              precision={0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<TeamOutlined />}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">{t('dashboard.cards.fromOverview')}</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loadingOverview}>
            <Statistic
              title={t('dashboard.cards.systemPerf')}
              value={overview?.system?.performanceScore ?? 0}
              precision={1}
              valueStyle={{ color: '#722ed1' }}
              prefix={<RiseOutlined />}
              suffix="%"
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">{t('dashboard.cards.perfNote')}</Text>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title={t('dashboard.sections.overview')} style={{ marginBottom: '16px' }} loading={loadingOverview}>
          {overview ? (
          <Row gutter={[16, 16]}>
          <Col span={12}>
          <Card size="small" title={t('dashboard.sections.runtime')}>
          <div>{t('dashboard.labels.currentTime')}：{new Date(overview.runtime.now).toLocaleString()}</div>
          <div>{t('dashboard.labels.uptime')}：{overview.runtime.uptimeSec}s</div>
          <div>{t('dashboard.labels.node')}：{overview.runtime.node}</div>
          <div>{t('dashboard.labels.env')}：{overview.app.env}</div>
          <div>{t('dashboard.labels.app')}：{overview.app.name} v{overview.app.version}</div>
          </Card>
          </Col>
          <Col span={12}>
          <Card size="small" title={t('dashboard.sections.system')}>
          <div>{t('dashboard.labels.platform')}：{overview.system.platform} / {overview.system.arch}</div>
          <div>{t('dashboard.labels.memory')}：rss {overview.system.memoryMB.rss}MB，heapUsed {overview.system.memoryMB.heapUsed}MB</div>
          <div>{t('dashboard.labels.load')}：{overview.system.loadAvg.join(' , ')}</div>
          </Card>
          </Col>
          <Col span={24}>
          <Card size="small" title={t('dashboard.sections.database')}>
          <div>{t('dashboard.labels.status')}：{overview.db.status}</div>
          <div>{t('dashboard.labels.latency')}：{overview.db.latencyMs}ms</div>
          {typeof overview.db.counts?.users === 'number' && (
          <div>{t('dashboard.labels.usersTotal')}：{overview.db.counts.users}</div>
          )}
          </Card>
          </Col>
          </Row>
          ) : (
          <Text type="secondary">{t('dashboard.loading.fetchingOverview')}</Text>
          )}
          </Card>

          <Card title={t('dashboard.sections.entityStats')}>
            <Table
              columns={columns}
              dataSource={tableData}
              pagination={false}
              size="middle"
              loading={loadingOverview}
            />
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title={t('dashboard.sections.recentUsers')} style={{ marginBottom: '16px' }} loading={loadingRecentUsers}>
            <List
              itemLayout="horizontal"
              dataSource={recentUsers}
              locale={{ emptyText: t('dashboard.empty.recentUsers') }}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        style={{
                          backgroundColor: item.status === 'online' ? '#52c41a' : 
                                         item.status === 'away' ? '#faad14' : '#d9d9d9'
                        }}
                        icon={<UserOutlined />}
                      />
                    }
                    title={item.name}
                    description={item.time}
                  />
                  <Tag
                    color={
                      item.status === 'online' ? 'green' :
                      item.status === 'away' ? 'orange' : 'default'
                    }
                  >
                    {item.status === 'online' ? t('dashboard.statusTag.online') :
                     item.status === 'away' ? t('dashboard.statusTag.away') : t('dashboard.statusTag.offline')}
                  </Tag>
                </List.Item>
              )}
            />
          </Card>

          <Card title={t('dashboard.sections.recentMessages')}>
            <List
              itemLayout="vertical"
              size="small"
              dataSource={recentMessages}
              locale={{ emptyText: t('dashboard.empty.recentMessages') }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Space key="actions">
                      <Button type="text" size="small" icon={<EyeOutlined />} />
                      <Button type="text" size="small" icon={<LikeOutlined />} />
                      <Button type="text" size="small" icon={<CommentOutlined />} />
                    </Space>
                  ]}
                >
                  <List.Item.Meta
                    title={<Text strong>{item.user}</Text>}
                    description={item.time}
                  />
                  <div>{item.content}</div>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

    </>
  );
};

export default Dashboard;