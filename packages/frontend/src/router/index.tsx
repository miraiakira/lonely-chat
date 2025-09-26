import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import PrivateRoute from './PrivateRoute';
import UserManagement from '../pages/UserManagement';
import RoleManagement from '../pages/RoleManagement';
import MenuManagement from '../pages/System/MenuManagement';
import PermissionManagement from '../pages/PermissionManagement';
import ChatMessages from '../pages/Admin/ChatMessages';
import ChatUsers from '../pages/Admin/ChatUsers';
import ChatConversations from '../pages/Admin/Conversations';
import AdminRoute from './AdminRoute';
import PostsAdmin from '../pages/Admin/Posts';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        path: '/dashboard',
        element: <Dashboard />,
      },
      {
        path: '/users',
        element: <UserManagement />,
      },
      {
        path: '/roles',
        element: <RoleManagement />,
      },
      {
        path: '/permissions',
        element: <PermissionManagement />,
      },
      {
        path: '/system/menus',
        element: <MenuManagement />,
      },
      {
        path: '/admin/messages',
        element: <AdminRoute><ChatMessages /></AdminRoute>,
      },
      {
        path: '/admin/users',
        element: <AdminRoute><ChatUsers /></AdminRoute>,
      },
      {
        path: '/admin/conversations',
        element: <AdminRoute><ChatConversations /></AdminRoute>,
      },
      {
        path: '/admin/posts',
        element: <AdminRoute><PostsAdmin /></AdminRoute>,
      },
    ],
  },
]);

export default router;