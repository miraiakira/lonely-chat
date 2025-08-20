import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import AppLayout from '../components/Layout';
import { useEffect } from 'react';
import { getMenus } from '../services/api';
import { useMenuStore } from '../store/menuStore';

const PrivateRoute = () => {
  const token = useAuthStore((state) => state.token);
  const setMenus = useMenuStore((state) => state.setMenus);

  useEffect(() => {
    if (token) {
      getMenus()
        .then((res) => {
          if (res && Array.isArray(res.menus)) {
            setMenus(res.menus);
          }
        })
        .catch((err) => {
          console.error(err);
        });
    }
  }, [token, setMenus]);

  return token ? <AppLayout /> : <Navigate to="/login" />;
};

export default PrivateRoute;