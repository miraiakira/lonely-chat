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

const { Text } = Typography;

const Dashboard: React.FC = () => {
  // 模拟数据
  const recentUsers = [
    { id: 1, name: '张三', avatar: '', time: '2分钟前', status: 'online' },
    { id: 2, name: '李四', avatar: '', time: '5分钟前', status: 'offline' },
    { id: 3, name: '王五', avatar: '', time: '10分钟前', status: 'online' },
    { id: 4, name: '赵六', avatar: '', time: '15分钟前', status: 'away' },
  ];

  const recentMessages = [
    { id: 1, user: '张三', content: '大家好，很高兴加入这个平台！', time: '刚刚' },
    { id: 2, user: '李四', content: '这个功能很不错，使用体验很好', time: '3分钟前' },
    { id: 3, user: '王五', content: '有什么问题可以随时联系我', time: '8分钟前' },
    { id: 4, user: '赵六', content: '期待更多新功能的上线', time: '12分钟前' },
  ];

  const tableData = [
    {
      key: '1',
      name: '用户管理',
      visits: 1234,
      status: 'active',
      updateTime: '2024-01-15 10:30:00',
    },
    {
      key: '2',
      name: '消息系统',
      visits: 856,
      status: 'active',
      updateTime: '2024-01-15 09:45:00',
    },
    {
      key: '3',
      name: '权限管理',
      visits: 432,
      status: 'inactive',
      updateTime: '2024-01-14 16:20:00',
    },
  ];

  const columns = [
    {
      title: '模块名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '访问量',
      dataIndex: 'visits',
      key: 'visits',
      render: (visits: number) => (
        <Text strong>{visits.toLocaleString()}</Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '正常' : '停用'}
        </Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
    },
  ];

  return (
    <>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={11280}
              precision={0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<UserOutlined />}
              suffix={<ArrowUpOutlined style={{ fontSize: '12px' }} />}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">较昨日 +12%</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日消息"
              value={1563}
              precision={0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<MessageOutlined />}
              suffix={<ArrowUpOutlined style={{ fontSize: '12px' }} />}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">较昨日 +8%</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="在线用户"
              value={892}
              precision={0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<TeamOutlined />}
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">实时数据</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="系统性能"
              value={98.5}
              precision={1}
              valueStyle={{ color: '#722ed1' }}
              prefix={<RiseOutlined />}
              suffix="%"
            />
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary">运行良好</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 主要内容区域 */}
      <Row gutter={[16, 16]}>
        {/* 左侧内容 */}
        <Col xs={24} lg={16}>
          {/* 系统概览 */}
          <Card title="系统概览" style={{ marginBottom: '16px' }}>
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <Progress type="circle" percent={75} size={80} />
                  <div style={{ marginTop: '8px' }}>CPU 使用率</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <Progress type="circle" percent={60} size={80} strokeColor="#52c41a" />
                  <div style={{ marginTop: '8px' }}>内存使用率</div>
                </div>
              </Col>
              <Col span={8}>
                <div style={{ textAlign: 'center' }}>
                  <Progress type="circle" percent={45} size={80} strokeColor="#1890ff" />
                  <div style={{ marginTop: '8px' }}>磁盘使用率</div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* 模块访问统计 */}
          <Card title="模块访问统计">
            <Table
              columns={columns}
              dataSource={tableData}
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>

        {/* 右侧内容 */}
        <Col xs={24} lg={8}>
          {/* 最近用户 */}
          <Card title="最近用户" style={{ marginBottom: '16px' }}>
            <List
              itemLayout="horizontal"
              dataSource={recentUsers}
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
                    {item.status === 'online' ? '在线' :
                     item.status === 'away' ? '离开' : '离线'}
                  </Tag>
                </List.Item>
              )}
            />
          </Card>

          {/* 最近消息 */}
          <Card title="最近消息">
            <List
              itemLayout="vertical"
              size="small"
              dataSource={recentMessages}
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

      {/* 快捷操作 */}
      <Card title="快捷操作" style={{ marginTop: '16px' }}>
        <Space wrap>
          <Button type="primary" icon={<UserOutlined />}>
            用户管理
          </Button>
          <Button icon={<MessageOutlined />}>
            消息中心
          </Button>
          <Button icon={<TeamOutlined />}>
            权限管理
          </Button>
          <Button icon={<RiseOutlined />}>
            数据统计
          </Button>
        </Space>
      </Card>
    </>
  );
};

export default Dashboard;