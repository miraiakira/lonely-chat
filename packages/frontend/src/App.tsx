import { RouterProvider } from 'react-router-dom';
import router from './router';
import { useAuthStore } from './store/authStore';
import { useEffect } from 'react';
import { getMenus } from './services/api';
import { useMenuStore } from './store/menuStore';

function App() {
  const { token } = useAuthStore();
  const { setMenus } = useMenuStore();

  useEffect(() => {
    if (token) {
      getMenus()
        .then((menus) => {
          if (Array.isArray(menus)) {
            setMenus(menus);
          } else {
            setMenus([]);
          }
        })
        .catch((error) => {
          console.error('Failed to fetch menus:', error);
        });
    }
  }, [token, setMenus]);

  return <RouterProvider router={router} />;
}

export default App;