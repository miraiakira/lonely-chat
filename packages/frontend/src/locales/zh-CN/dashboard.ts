const dashboard = {
  cards: {
    totalUsers: '总用户数',
    todayNewUsers: '今日新增用户',
    roles: '角色数',
    systemPerf: '系统性能',
    perfNote: '综合 CPU/内存估算',
    fromOverview: '来自系统概览',
    todaySince0: '今日 00:00 起',
  },
  sections: {
    overview: '系统概览',
    entityStats: '系统实体统计',
    recentUsers: '最近用户',
    recentMessages: '最近消息',
    runtime: '运行时',
    system: '系统',
    database: '数据库',
  },
  labels: {
    currentTime: '当前时间',
    uptime: '运行时长',
    node: 'Node',
    env: '环境',
    app: '应用',
    platform: '平台',
    memory: '内存',
    load: '负载',
    status: '状态',
    latency: '延迟',
    usersTotal: '用户总数',
    name: '名称',
    count: '数量',
    updateTime: '更新时间',
  },
  entities: {
    users: '用户',
    roles: '角色',
    permissions: '权限',
  },
  statusTag: {
    active: '正常',
    inactive: '不可用',
    online: '在线',
    away: '离开',
    offline: '离线',
  },
  loading: {
    fetchingOverview: '正在获取系统概览...'
  },
  empty: {
    recentUsers: '暂无最近用户',
    recentMessages: '暂无最近消息',
  }
} as const;

export default dashboard;