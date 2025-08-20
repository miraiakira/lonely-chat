import { createBrowserRouter, Navigate } from 'react-router-dom';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import PrivateRoute from './PrivateRoute';
import UserManagement from '../pages/UserManagement';
import RoleManagement from '../pages/RoleManagement';
import MenuManagement from '../pages/System/MenuManagement';

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
        path: '/system/menus',
        element: <MenuManagement />,
      },
    ],
  },
]);

export default router;