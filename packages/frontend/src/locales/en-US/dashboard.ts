const dashboard = {
  cards: {
    totalUsers: 'Total Users',
    todayNewUsers: 'New Users Today',
    roles: 'Roles',
    systemPerf: 'System Performance',
    perfNote: 'Estimated by CPU/Memory',
    fromOverview: 'From System Overview',
    todaySince0: 'Since 00:00 Today',
  },
  sections: {
    overview: 'System Overview',
    entityStats: 'Entity Statistics',
    recentUsers: 'Recent Users',
    recentMessages: 'Recent Messages',
    runtime: 'Runtime',
    system: 'System',
    database: 'Database',
  },
  labels: {
    currentTime: 'Current Time',
    uptime: 'Uptime',
    node: 'Node',
    env: 'Env',
    app: 'App',
    platform: 'Platform',
    memory: 'Memory',
    load: 'Load Avg',
    status: 'Status',
    latency: 'Latency',
    usersTotal: 'Total Users',
    name: 'Name',
    count: 'Count',
    updateTime: 'Updated At',
  },
  entities: {
    users: 'Users',
    roles: 'Roles',
    permissions: 'Permissions',
  },
  statusTag: {
    active: 'Active',
    inactive: 'Inactive',
    online: 'Online',
    away: 'Away',
    offline: 'Offline',
  },
  loading: {
    fetchingOverview: 'Fetching system overview...'
  },
  empty: {
    recentUsers: 'No recent users',
    recentMessages: 'No recent messages',
  }
} as const;

export default dashboard;