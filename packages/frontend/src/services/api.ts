import apiClient from './apiClient';

export const getMenus = async () => {
  try {
    const response = await apiClient.get('/auth/menus');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch menus:', error);
    throw error;
  }
};

export const getMenuTree = async () => {
  try {
    const response = await apiClient.get('/menu');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch menu tree:', error);
    throw error;
  }
};

export const getRoles = async () => {
  try {
    const response = await apiClient.get('/roles');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    throw error;
  }
};

export const createRole = async (data: any) => {
  try {
    const response = await apiClient.post('/roles', data);
    return response.data;
  } catch (error) {
    console.error('Failed to create role:', error);
    throw error;
  }
};

export const getPermissions = async () => {
  try {
    const response = await apiClient.get('/permissions');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    throw error;
  }
};

export const assignPermissions = async (roleId: number, permissionIds: number[]) => {
  try {
    const response = await apiClient.post(`/roles/${roleId}/permissions`, { permissionIds });
    return response.data;
  } catch (error) {
    console.error('Failed to assign permissions:', error);
    throw error;
  }
};

export const getUsers = async () => {
  try {
    const response = await apiClient.get('/user');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};

export const assignRoles = async (userId: number, roleIds: number[]) => {
  try {
    const response = await apiClient.post(`/user/${userId}/roles`, { roleIds });
    return response.data;
  } catch (error) {
    console.error('Failed to assign roles:', error);
    throw error;
  }
};

export const createUser = async (data: any) => {
  try {
    const response = await apiClient.post('/user', data);
    return response.data;
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
}

export const updateUser = async (id: number, data: any) => {
  try {
    const { nickname, avatar, gender, bio, ...rest } = data;
    const profile = { nickname, avatar, gender, bio };
    const user = rest;
    const response = await apiClient.patch(`/user/${id}`, { user, profile });
    return response.data;
  } catch (error) {
    console.error('Failed to update user:', error);
    throw error;
  }
}

export const deleteUser = async (id: number) => {
  try {
    const response = await apiClient.delete(`/user/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete user:', error);
    throw error;
  }
}

export const createMenu = async (data: any) => {
  try {
    const response = await apiClient.post('/menu', data);
    return response.data;
  } catch (error) {
    console.error('Failed to create menu:', error);
    throw error;
  }
};

export const createPermission = async (data: any) => {
  try {
    const response = await apiClient.post('/permissions', data);
    return response.data;
  } catch (error) {
    console.error('Failed to create permission:', error);
    throw error;
  }
};

export const getMe = async () => {
  try {
    const response = await apiClient.get('/auth/me');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch current user:', error);
    throw error;
  }
};

export const getSystemOverview = async () => {
  try {
    const response = await apiClient.get('/system/overview');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch system overview:', error);
    throw error;
  }
};

export const getRecentUsers = async (limit = 5) => {
  try {
    const response = await apiClient.get(`/user/recent`, { params: { limit } });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch recent users:', error);
    throw error;
  }
};

export const adminSearchMessages = async (params: { q?: string; page?: number; pageSize?: number }) => {
  const res = await apiClient.get('/admin/messages/search', { params });
  return res.data;
};

export const adminSoftDeleteMessage = async (id: number, adminId?: number) => {
  const res = await apiClient.patch(`/admin/messages/${id}/soft-delete`, adminId ? { adminId } : {});
  return res.data;
};

export const adminMuteUser = async (id: number, until?: string | null) => {
  const res = await apiClient.post(`/admin/users/${id}/mute`, { until: until ?? null });
  return res.data;
};

export const adminLockConversation = async (id: number, lock = true) => {
  const url = lock ? `/admin/conversations/${id}/lock` : `/admin/conversations/${id}/unlock`;
  const res = await apiClient.post(url, lock ? { lock: true } : undefined);
  return res.data;
};

export const adminSetConversationNotice = async (id: number, notice?: string | null) => {
  const res = await apiClient.patch(`/admin/conversations/${id}/notice`, { notice: notice ?? null });
  return res.data;
};

// 新增：管理员会话列表（可搜索 + 分页）
export const adminListConversations = async (params: { q?: string; page?: number; pageSize?: number } = {}) => {
  const res = await apiClient.get('/admin/conversations', { params });
  return res.data;
};