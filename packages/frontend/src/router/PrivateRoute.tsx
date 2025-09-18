import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AppLayout from '../components/Layout';

const PrivateRoute = () => {
  const token = useAuthStore((state) => state.token);

  return token ? <AppLayout /> : <Navigate to="/login" />;
};

export default PrivateRoute;