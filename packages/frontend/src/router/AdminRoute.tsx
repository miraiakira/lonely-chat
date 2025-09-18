import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';

interface Props {
  children: React.ReactNode;
}

const AdminRoute: React.FC<Props> = ({ children }) => {
  const user = useUserStore((s) => s.user);
  const hasAdmin = (user?.roles || []).some((r: any) => r?.name === 'admin');
  return hasAdmin ? <>{children}</> : <Navigate to="/dashboard" />;
};

export default AdminRoute;