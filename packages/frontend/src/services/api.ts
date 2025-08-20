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

export const getRoles = async () => {
  try {
    const response = await apiClient.get('/roles');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch roles:', error);
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
    const response = await apiClient.post('/user/register', data);
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